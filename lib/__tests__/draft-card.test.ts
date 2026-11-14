/**
 * The chat review card accepts the plan it shows: the `draft_version` its turn's
 * `complete` frame handed over goes back as the accept's `expected_version`. A plan
 * changed since (409 `stale_version`) reads exactly as the dashboard banner reads it
 * (`bannerErrorOutcome`): the backend's words, the latest draft in place of the old
 * one, the card open, never success.
 */
import { describe, expect, it, vi } from "vitest";
import {
  acceptFromCard,
  discardFromCard,
  draftCardState,
  draftKey,
  readSettledDrafts,
  recordDraftOutcome,
  replaceDraftInMessages,
  withLatestDraft,
  type CardAcceptDeps,
  type DraftOutcome,
} from "@/lib/draftCard";
import { createSingleFlight } from "@/lib/you";
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

// ---------------------------------------------------------------------------
// Which card is live: only the latest open draft's, decided by draft id + version
// ---------------------------------------------------------------------------

const NONE: Readonly<Record<string, DraftOutcome>> = {};

describe("draftCardState", () => {
  it("the card for the open draft (same id and version as the state's) is live", () => {
    expect(draftCardState(card(), { current: card(), settled: NONE })).toEqual({ kind: "active", busy: null });
    expect(draftCardState(card(), { current: card(), settled: NONE, busy: "accept" })).toEqual({
      kind: "active",
      busy: "accept",
    });
  });

  it("an earlier plan's card is read-only: a newer plan replaced it", () => {
    const earlier = card({ draft_id: "older-draft", draft_version: "aaaaaaaaaaaaaaaa", message_id: "m-1" });
    expect(draftCardState(earlier, { current: card(), settled: NONE })).toEqual({
      kind: "read-only",
      note: "A newer plan replaced this one",
    });
  });

  it("the version decides, not the message order: same draft id, another version, is not live", () => {
    const stale = card({ draft_version: "ffffffffffffffff" });
    expect(draftCardState(stale, { current: card(), settled: NONE }).kind).toBe("read-only");
    // and a card later in the list is not live just for being later
    const cards = [card(), card({ draft_id: "older-draft", draft_version: "aaaaaaaaaaaaaaaa" })];
    expect(cards.map((c) => draftCardState(c, { current: card(), settled: NONE }).kind)).toEqual(["active", "read-only"]);
  });

  it("once a draft is accepted or discarded, every card for it is read-only with its outcome", () => {
    for (const [outcome, note] of [
      ["accepted", "Accepted — it's on your schedule"],
      ["discarded", "Discarded — nothing was added"],
      ["closed", "This plan is closed"],
    ] as const) {
      const settled = { [DRAFT_ID]: outcome };
      // even while the state still holds it, and for an older version's card too
      expect(draftCardState(card(), { current: card(), settled })).toEqual({ kind: "read-only", note });
      expect(draftCardState(card({ draft_version: "ffffffffffffffff" }), { current: null, settled })).toEqual({
        kind: "read-only",
        note,
      });
    }
  });

  it("no open draft and no known outcome: read-only, never a dead button", () => {
    expect(draftCardState(card(), { current: null, settled: NONE })).toEqual({
      kind: "read-only",
      note: "This plan is no longer up for review",
    });
  });

  it("a plan the turn could not store (no draft id) is live only on its own turn's card", () => {
    const unstored = card({ draft_id: null, draft_version: undefined, message_id: "msg-9" });
    expect(draftCardState(unstored, { current: unstored, settled: NONE }).kind).toBe("active");
    expect(draftCardState(card({ draft_id: null, message_id: "msg-8" }), { current: unstored, settled: NONE }).kind).toBe(
      "read-only",
    );
  });
});

describe("draftKey and the one guard for Accept and Discard", () => {
  it("is the draft id, else the turn's message id", () => {
    expect(draftKey(card())).toBe(DRAFT_ID);
    expect(draftKey(card({ draft_id: null, message_id: "msg-9" }))).toBe("msg-9");
  });

  it("one click, one request: Accept and Discard on a card share its key", async () => {
    const flight = createSingleFlight();
    let release!: () => void;
    const accept = vi.fn(() => new Promise<{ status: string; task_count: number }>((r) => (release = () => r({ status: "accepted", task_count: 2 }))));
    const reject = vi.fn(async () => ({ status: "rejected" }));
    const first = flight.run(draftKey(card())!, () => acceptFromCard(card(), { accept, reread: async () => LATEST }));
    expect(flight.run(draftKey(card())!, () => acceptFromCard(card(), { accept, reread: async () => LATEST }))).toBeNull();
    expect(flight.run(draftKey(card())!, () => discardFromCard(card(), { reject }))).toBeNull();
    release();
    await first;
    expect(accept).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });
});

describe("discardFromCard: read as the banner reads a discard", () => {
  it("discards the plan the card shows: the draft clears, outcome discarded", async () => {
    const reject = vi.fn(async () => ({ status: "rejected" }));
    const outcome = await discardFromCard(card(), { reject });
    expect(reject).toHaveBeenCalledWith(DRAFT_ID, ["tasks", "schedule"]);
    expect(outcome).toEqual({
      tone: "info",
      message: "Discarded. Nothing was added to your schedule.",
      clearDraft: true,
      settled: "discarded",
    });
  });

  it("409 or 404: already closed or gone — the draft clears, outcome closed", async () => {
    for (const err of [apiError(409, "invalid_state_transition", "This draft is no longer open."), apiError(404, "not_found")]) {
      const outcome = await discardFromCard(card(), { reject: async () => { throw err; } });
      expect(outcome.clearDraft).toBe(true);
      expect(outcome.settled).toBe("closed");
    }
  });

  it("an outage: the plan stays open, the card stays live, and it says so", async () => {
    const outcome = await discardFromCard(card(), { reject: async () => { throw apiError(503, "persistence_unavailable"); } });
    expect(outcome.clearDraft).toBe(false);
    expect(outcome.settled).toBeUndefined();
    expect(outcome.tone).toBe("error");
  });

  it("a plan the turn could not store: no request, the draft clears", async () => {
    const reject = vi.fn(async () => ({ status: "rejected" }));
    const outcome = await discardFromCard(card({ draft_id: null, schedule: { horizon_start: "x", schedule: {} } }), { reject });
    expect(reject).not.toHaveBeenCalled();
    expect(outcome.clearDraft).toBe(true);
  });
});

describe("the remembered outcomes", () => {
  it("records an outcome; a repeat moves it to the newest; only the newest are kept", () => {
    let settled = recordDraftOutcome({}, "d1", "accepted", 3);
    settled = recordDraftOutcome(settled, "d2", "discarded", 3);
    settled = recordDraftOutcome(settled, "d1", "closed", 3);
    expect(Object.entries(settled)).toEqual([["d2", "discarded"], ["d1", "closed"]]);
    settled = recordDraftOutcome(settled, "d3", "accepted", 3);
    settled = recordDraftOutcome(settled, "d4", "accepted", 3);
    expect(Object.keys(settled)).toEqual(["d1", "d3", "d4"]);
  });

  it("reads back from storage only what it understands", () => {
    expect(readSettledDrafts({ d1: "accepted", d2: "nope", d3: 7, d4: "discarded" })).toEqual({ d1: "accepted", d4: "discarded" });
    for (const junk of [null, "x", 3, ["accepted"]]) expect(readSettledDrafts(junk)).toEqual({});
  });
});
