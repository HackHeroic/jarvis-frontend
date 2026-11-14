/**
 * The chat review card accepts the plan it shows: the `draft_version` its turn's
 * `complete` frame handed over goes back as the accept's `expected_version`. A plan
 * changed since (409 `stale_version`) reads exactly as the dashboard banner reads it
 * (`bannerErrorOutcome`): the backend's words, the latest draft in place of the old
 * one, the card open, never success.
 */
import { describe, expect, it, vi } from "vitest";
import { acceptFromCard, replaceDraftInMessages, withLatestDraft, type CardAcceptDeps } from "@/lib/draftCard";
import { parseDraftState } from "@/lib/contracts";
import type { ChatResponse, DraftState, JarvisMessage } from "@/lib/types";
import { DRAFT_READ, PLANNING_COMPLETE_FRAME, STALE_ACCEPT_409 } from "./draft-samples";

const DRAFT_ID = DRAFT_READ.draft_id;
const SHOWN_VERSION = DRAFT_READ.version; // "37506042eff02067"
const LATEST_VERSION = STALE_ACCEPT_409.error.details.version; // "6f2f15015ab658b5"

/** The card as the chat keeps it: the complete frame, naming the draft and its version. */
function card(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    ...(JSON.parse(JSON.stringify(PLANNING_COMPLETE_FRAME)) as ChatResponse),
    draft_id: DRAFT_ID,
    draft_version: SHOWN_VERSION,
    schedule: {
      horizon_start: "2026-11-16T08:00:00+05:30",
      schedule: {
        t1: { start_min: 60, end_min: 85, title: "Read ch1" },
        t2: { start_min: 0, end_min: 20, title: "Practice problems" },
      },
      applied_constraints: [{ name: "memory_constraint_mornings", start_min: 0, end_min: 60, availability: "busy", source: "memory" }],
    },
    ...overrides,
  };
}

/** An ApiError-shaped failure, as lib/api.ts throws it. */
function apiError(status: number, code?: string, serverMessage?: string, details?: Record<string, unknown>) {
  return Object.assign(new Error(`Failed (${status})`), { status, code, serverMessage, details });
}

function staleError(details: Record<string, unknown> = STALE_ACCEPT_409.error.details) {
  return apiError(409, STALE_ACCEPT_409.error.code, STALE_ACCEPT_409.error.message, details);
}

const LATEST: DraftState = parseDraftState(STALE_ACCEPT_409.error.details.draft);

function deps(accept: CardAcceptDeps["accept"], reread?: CardAcceptDeps["reread"]) {
  return {
    accept: vi.fn(accept),
    reread: vi.fn(reread ?? (async () => LATEST)),
  };
}

describe("acceptFromCard: the version", () => {
  it("sends the version the card's turn handed over as expected_version", async () => {
    const d = deps(async () => ({ status: "accepted", draft_id: DRAFT_ID, task_count: 2 }));
    await acceptFromCard(card(), d);
    expect(d.accept).toHaveBeenCalledWith(DRAFT_ID, SHOWN_VERSION);
  });

  it("a card stored before versions sends none (the backend then does no check)", async () => {
    const d = deps(async () => ({ status: "accepted", draft_id: DRAFT_ID, task_count: 2 }));
    await acceptFromCard(card({ draft_version: undefined }), d);
    expect(d.accept).toHaveBeenCalledWith(DRAFT_ID, undefined);
  });

  it("no draft id: nothing to accept, no request", async () => {
    const d = deps(async () => ({ status: "accepted", task_count: 2 }));
    const outcome = await acceptFromCard(card({ draft_id: null, schedule: { horizon_start: "x", schedule: {} } }), d);
    expect(d.accept).not.toHaveBeenCalled();
    expect(outcome.accepted).toBe(false);
    expect(outcome.clearDraft).toBe(false);
  });
});

describe("acceptFromCard: what an outcome does", () => {
  it("accepted with tasks: success, the draft clears, the task list refreshes", async () => {
    const outcome = await acceptFromCard(card(), deps(async () => ({ status: "accepted", draft_id: DRAFT_ID, task_count: 2 })));
    expect(outcome).toMatchObject({ accepted: true, clearDraft: true, refreshTasks: true, tone: "success" });
    expect(outcome.latest).toBeUndefined();
  });

  it("empty: never success, the card stays open", async () => {
    const outcome = await acceptFromCard(card(), deps(async () => ({ status: "empty", draft_id: DRAFT_ID, task_count: 0 })));
    expect(outcome.accepted).toBe(false);
    expect(outcome.clearDraft).toBe(false);
    expect(outcome.tone).not.toBe("success");
  });

  it("409 stale_version: the backend's words, the latest draft from the error, the card open, never success", async () => {
    const d = deps(async () => {
      throw staleError();
    });
    const outcome = await acceptFromCard(card(), d);
    expect(outcome.message).toBe("This plan changed since you looked — here is the latest.");
    expect(outcome.tone).not.toBe("success");
    expect(outcome.accepted).toBe(false);
    expect(outcome.clearDraft).toBe(false);
    expect(outcome.refreshTasks).toBe(false);
    expect(outcome.latest?.version).toBe(LATEST_VERSION);
    expect(d.reread).not.toHaveBeenCalled(); // the error carried it
  });

  it("409 stale_version without a readable latest draft: it is re-read", async () => {
    const d = deps(
      async () => {
        throw staleError({});
      },
      async () => LATEST,
    );
    const outcome = await acceptFromCard(card(), d);
    expect(d.reread).toHaveBeenCalledWith(DRAFT_ID);
    expect(outcome.latest?.version).toBe(LATEST_VERSION);
    expect(outcome.clearDraft).toBe(false);
    expect(outcome.accepted).toBe(false);
  });

  it("409 stale_version and the re-read fails too: the card stays as it was, still open, never success", async () => {
    const d = deps(
      async () => {
        throw staleError({});
      },
      async () => {
        throw apiError(503, "persistence_unavailable", "Could not reach the database.");
      },
    );
    const outcome = await acceptFromCard(card(), d);
    expect(outcome.latest).toBeUndefined();
    expect(outcome.accepted).toBe(false);
    expect(outcome.clearDraft).toBe(false);
    expect(outcome.message).toBe("This plan changed since you looked — here is the latest.");
  });

  it("409 stale_version whose latest is already closed (locked in elsewhere): the draft clears", async () => {
    const closed = { ...STALE_ACCEPT_409.error.details, draft: { ...STALE_ACCEPT_409.error.details.draft, status: "accepted" } };
    const outcome = await acceptFromCard(
      card(),
      deps(async () => {
        throw staleError(closed);
      }),
    );
    expect(outcome.accepted).toBe(false);
    expect(outcome.clearDraft).toBe(true);
    expect(outcome.refreshTasks).toBe(true);
    expect(outcome.latest).toBeUndefined();
  });

  it("the other failures read as the banner reads them", async () => {
    const closed = await acceptFromCard(card(), deps(async () => { throw apiError(409, "invalid_state_transition", "This draft is no longer open."); }));
    expect(closed).toMatchObject({ accepted: false, clearDraft: true, refreshTasks: true, message: "This draft is no longer open." });

    const clash = await acceptFromCard(card(), deps(async () => { throw apiError(409, "conflict", "Clashes with tasks you have."); }));
    expect(clash).toMatchObject({ accepted: false, clearDraft: false, tone: "error", message: "Clashes with tasks you have." });

    const outage = await acceptFromCard(card(), deps(async () => { throw apiError(503, "persistence_unavailable"); }));
    expect(outage).toMatchObject({ accepted: false, clearDraft: false, tone: "error" });
  });
});

describe("withLatestDraft: the card redrawn on the latest draft", () => {
  it("shows the latest slots and titles, and names the latest version for the next accept", () => {
    const redrawn = withLatestDraft(card(), LATEST);
    expect(redrawn.draft_id).toBe(DRAFT_ID);
    expect(redrawn.draft_version).toBe(LATEST_VERSION);
    expect(redrawn.schedule?.horizon_start).toBe("2026-11-16T08:00:00+05:30");
    expect(redrawn.schedule?.schedule).toEqual({
      t1: { start_min: 60, end_min: 85, title: "Read ch1 slowly" },
      t2: { start_min: 0, end_min: 20, title: "Practice problems" },
    });
    // the turn's own words and shape stay
    expect(redrawn.message).toBe("Here's the plan, sir.");
    expect(redrawn.schedule_status).toBe("draft");
    expect(redrawn.schedule?.applied_constraints).toHaveLength(1);
  });

  it("a slot without a title takes its task's", () => {
    const untitled = parseDraftState({
      ...STALE_ACCEPT_409.error.details.draft,
      schedule: {
        horizon_start: "2026-11-16T08:00:00+05:30",
        schedule: { t1: { ...STALE_ACCEPT_409.error.details.draft.schedule.schedule.t1, title: null } },
      },
    });
    expect(withLatestDraft(card(), untitled).schedule?.schedule.t1.title).toBe("Read ch1 slowly");
  });

  it("a latest draft with no solved slots shows none — never the old times under the new version", () => {
    const unsolved = parseDraftState({ ...STALE_ACCEPT_409.error.details.draft, schedule: null });
    const redrawn = withLatestDraft(card(), unsolved);
    expect(redrawn.schedule?.schedule).toEqual({});
    expect(redrawn.draft_version).toBe(LATEST_VERSION);
  });
});

describe("replaceDraftInMessages", () => {
  it("redraws only the message whose turn handed over that draft", () => {
    const other: JarvisMessage = { id: "a", role: "assistant", content: "Hi", timestamp: 1, response: card({ draft_id: "other" }) };
    const mine: JarvisMessage = { id: "b", role: "assistant", content: "Plan", timestamp: 2, response: card() };
    const user: JarvisMessage = { id: "c", role: "user", content: "plan my week", timestamp: 0 };
    const [u, o, m] = replaceDraftInMessages([user, other, mine], LATEST);
    expect(u).toBe(user);
    expect(o).toBe(other);
    expect(m.response?.draft_version).toBe(LATEST_VERSION);
    expect(m.response?.schedule?.schedule.t1.title).toBe("Read ch1 slowly");
    expect(m.content).toBe("Plan");
  });
});
