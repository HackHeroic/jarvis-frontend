/**
 * The dashboard's pending-plan banner: which actions it offers, what a plan
 * would add (so nobody accepts blind), and what each accept/discard outcome says.
 */
import { describe, expect, it } from "vitest";
import {
  bannerAcceptOutcome,
  bannerDiscardOutcome,
  bannerErrorOutcome,
  draftBannerActions,
  summarizeDraft,
} from "@/lib/draftBanner";
import { STALE_ACCEPT_409 } from "./draft-samples";

/** An ApiError-shaped failure, as lib/api.ts throws it. */
function apiError(status: number, code?: string, serverMessage?: string, details?: Record<string, unknown>) {
  return Object.assign(new Error(`Failed (${status})`), { status, code, serverMessage, details });
}

/** The stale accept's 409 (draft-samples.ts), as lib/api.ts throws it. */
function staleError(details: Record<string, unknown> = STALE_ACCEPT_409.error.details) {
  return apiError(409, STALE_ACCEPT_409.error.code, STALE_ACCEPT_409.error.message, details);
}

/** GET /drafts/{id} (DraftStateResponse): TaskChunk dicts and the horizon, no solved slots. */
const DRAFT = {
  draft_id: "d-rule",
  user_id: "demo",
  goal_id: null,
  tasks: [
    { task_id: "t1", title: "Graph DP set", duration_minutes: 25, difficulty_weight: 0.8 },
    { task_id: "t2", title: "Review notes", duration_minutes: 20, difficulty_weight: 0.3 },
    { task_id: "t3", title: "Mock contest", duration_minutes: 25, difficulty_weight: 0.7 },
    { task_id: "t4", title: "Read chapter 4", duration_minutes: 15, difficulty_weight: 0.4 },
  ],
  horizon_start: "2026-11-14T08:00:00+05:30",
  status: "pending",
  rejection_reason: null,
  created_at: "2026-11-14T03:31:00+00:00",
};

describe("draftBannerActions", () => {
  it("a plan drafted by an accepted suggestion is acted on in place: lock it in or discard", () => {
    expect(draftBannerActions("suggestion")).toEqual({ reviewInChat: false, lockIn: true, discard: true });
  });

  it("chat can't show that plan, so there is no 'Review in chat'", () => {
    expect(draftBannerActions("suggestion").reviewInChat).toBe(false);
  });

  it("a plan from a chat turn is reviewed in chat, where its card is", () => {
    expect(draftBannerActions("chat")).toEqual({ reviewInChat: true, lockIn: false, discard: false });
  });

  it("an untagged plan (stored before tagging) came from a chat turn", () => {
    expect(draftBannerActions(undefined).reviewInChat).toBe(true);
  });
});

describe("summarizeDraft", () => {
  it("counts the tasks and shows the first three, then how many more", () => {
    const summary = summarizeDraft(DRAFT, { timeZone: "Asia/Kolkata" });
    expect(summary.taskCount).toBe(4);
    expect(summary.shown.map((t) => t.title)).toEqual(["Graph DP set", "Review notes", "Mock contest"]);
    expect(summary.more).toBe(1);
  });

  it("without solved slots in the payload, each line says how long, never a made-up time", () => {
    const summary = summarizeDraft(DRAFT, { timeZone: "Asia/Kolkata" });
    expect(summary.shown[0].when).toBe("25 min");
    expect(summary.timed).toBe(false);
  });

  it("with the backend's slots, each line gets its time in the user's locale, earliest first", () => {
    // tests/test_draft_endpoints.py::test_get_draft__solved_draft__schedule_slots_with_local_times
    const solved = {
      tasks: [
        { task_id: "t1", title: "Read ch1", duration_minutes: 25 },
        { task_id: "t2", title: "Practice problems", duration_minutes: 20 },
        { task_id: "t3", title: "Not placed", duration_minutes: 25 },
      ],
      horizon_start: "2026-11-16T08:00:00+05:30",
      schedule: {
        horizon_start: "2026-11-16T08:00:00+05:30",
        schedule: {
          t1: {
            task_id: "t1", title: "Read ch1", start_min: 60, end_min: 85,
            start: "2026-11-16T09:00:00+05:30", end: "2026-11-16T09:25:00+05:30", duration_minutes: 25,
          },
          t2: {
            task_id: "t2", title: "Practice problems", start_min: 0, end_min: 20,
            start: "2026-11-16T08:00:00+05:30", end: "2026-11-16T08:20:00+05:30", duration_minutes: 20,
          },
        },
      },
    };
    const summary = summarizeDraft(solved, { timeZone: "Asia/Kolkata", locale: "en-GB" });
    expect(summary.timed).toBe(true);
    expect(summary.shown).toEqual([
      { title: "Practice problems", when: "Mon 08:00" },
      { title: "Read ch1", when: "Mon 09:00" },
      { title: "Not placed", when: "25 min" }, // the solver didn't place it: its length, no time
    ]);
  });

  it("the user's locale decides the clock style", () => {
    const solved = {
      tasks: [{ task_id: "t1", title: "Read ch1", duration_minutes: 25 }],
      horizon_start: "2026-11-16T08:00:00+05:30",
      schedule: {
        horizon_start: "2026-11-16T08:00:00+05:30",
        schedule: {
          t1: {
            task_id: "t1", title: "Read ch1", start_min: 660, end_min: 685,
            start: "2026-11-16T19:00:00+05:30", end: "2026-11-16T19:25:00+05:30", duration_minutes: 25,
          },
        },
      },
    };
    expect(summarizeDraft(solved, { timeZone: "Asia/Kolkata", locale: "en-GB" }).shown[0].when).toBe("Mon 19:00");
    expect(summarizeDraft(solved, { timeZone: "Asia/Kolkata", locale: "en-US" }).shown[0].when).toMatch(/^Mon 07:00\sPM$/);
  });

  it("schedule null (a draft stored without slots) falls back to durations", () => {
    const summary = summarizeDraft({ ...DRAFT, schedule: null }, { timeZone: "Asia/Kolkata" });
    expect(summary.timed).toBe(false);
    expect(summary.shown.map((t) => t.when)).toEqual(["25 min", "20 min", "25 min"]);
  });

  it("a task without a title still shows, as 'Untitled task'", () => {
    const summary = summarizeDraft({ ...DRAFT, tasks: [{ task_id: "x", duration_minutes: 10 }] });
    expect(summary.shown).toEqual([{ title: "Untitled task", when: "10 min" }]);
  });

  it("an empty plan says it has nothing to add", () => {
    expect(summarizeDraft({ ...DRAFT, tasks: [] })).toEqual({ taskCount: 0, shown: [], more: 0, timed: false });
  });
});

describe("bannerAcceptOutcome", () => {
  it("accepted with tasks: success, the banner clears and the task list refreshes", () => {
    expect(bannerAcceptOutcome({ status: "accepted", draft_id: "d-rule", task_count: 4 })).toEqual({
      tone: "success",
      message: "Schedule saved — 4 tasks.",
      clearBanner: true,
      refreshTasks: true,
    });
  });

  it("an empty result is never a success: the plan stays open", () => {
    const outcome = bannerAcceptOutcome({ status: "empty", draft_id: "d-rule", task_count: 0 });
    expect(outcome.tone).toBe("info");
    expect(outcome.clearBanner).toBe(false);
    expect(outcome.refreshTasks).toBe(false);
  });

  it("accepted with zero tasks is not a success either", () => {
    expect(bannerAcceptOutcome({ status: "accepted", task_count: 0 }).tone).toBe("error");
  });
});

describe("bannerErrorOutcome (the 409 path and the rest)", () => {
  it("409 invalid_state_transition: already locked in or closed — the backend's words, banner cleared", () => {
    const outcome = bannerErrorOutcome(
      apiError(409, "invalid_state_transition", "This draft is no longer open, so it cannot be accepted."),
      "accept",
    );
    expect(outcome).toEqual({
      tone: "info",
      message: "This draft is no longer open, so it cannot be accepted.",
      clearBanner: true,
      refreshTasks: true,
    });
  });

  it("409 conflict on accept: it clashes with existing tasks — the plan stays open", () => {
    const outcome = bannerErrorOutcome(apiError(409, "conflict", "These tasks clash with tasks you already have."), "accept");
    expect(outcome.tone).toBe("error");
    expect(outcome.message).toBe("These tasks clash with tasks you already have.");
    expect(outcome.clearBanner).toBe(false);
  });

  it("409 stale_version: the backend's words, the latest plan to show, the banner stays open, never success", () => {
    const outcome = bannerErrorOutcome(staleError(), "accept");
    expect(outcome.tone).toBe("info");
    expect(outcome.message).toBe("This plan changed since you looked — here is the latest.");
    expect(outcome.clearBanner).toBe(false);
    expect(outcome.refreshTasks).toBe(false);
    expect(outcome.latest?.version).toBe("6f2f15015ab658b5");
    expect(outcome.latest?.tasks[0].title).toBe("Read ch1 slowly");
    // what the banner then shows is the latest plan
    expect(summarizeDraft(outcome.latest!).shown.map((l) => l.title)).toContain("Read ch1 slowly");
  });

  it("409 stale_version without a readable latest draft: re-read it (latest null), still open", () => {
    for (const details of [{}, { draft: { draft_id: "d" } }]) {
      const outcome = bannerErrorOutcome(staleError(details), "accept");
      expect(outcome.latest).toBeNull();
      expect(outcome.clearBanner).toBe(false);
    }
  });

  it("the 409s are told apart by code, never by the message's words", () => {
    const sameWords = "This plan changed since you looked — here is the latest.";
    const closed = bannerErrorOutcome(apiError(409, "invalid_state_transition", sameWords), "accept");
    expect(closed.clearBanner).toBe(true);
    expect(closed.latest).toBeUndefined();
    const clash = bannerErrorOutcome(apiError(409, "conflict", sameWords), "accept");
    expect(clash.clearBanner).toBe(false);
    expect(clash.latest).toBeUndefined();
    expect(bannerErrorOutcome(staleError(), "accept").latest).not.toBeUndefined();
  });

  it("409 on discard: already closed — the banner clears", () => {
    const outcome = bannerErrorOutcome(apiError(409, "invalid_state_transition", "This draft is no longer open."), "discard");
    expect(outcome.clearBanner).toBe(true);
    expect(outcome.tone).toBe("info");
  });

  it("404: the plan is gone — the banner clears", () => {
    expect(bannerErrorOutcome(apiError(404, "not_found", "Draft not found or expired"), "accept").clearBanner).toBe(true);
  });

  it("an outage keeps the banner and never claims success", () => {
    const outcome = bannerErrorOutcome(apiError(503, "persistence_unavailable"), "accept");
    expect(outcome).toEqual({
      tone: "error",
      message: "That didn't save. Try again.",
      clearBanner: false,
      refreshTasks: false,
    });
  });

  it("copy carries no blame", () => {
    const lines = [
      bannerErrorOutcome(apiError(503), "accept").message,
      bannerErrorOutcome(apiError(503), "discard").message,
      bannerDiscardOutcome().message,
      bannerErrorOutcome(apiError(404), "discard").message,
    ];
    for (const line of lines) expect(line).not.toMatch(/failed|you didn't|missed|behind/i);
  });
});

describe("bannerDiscardOutcome", () => {
  it("clears the banner and says nothing was added", () => {
    const outcome = bannerDiscardOutcome();
    expect(outcome.clearBanner).toBe(true);
    expect(outcome.refreshTasks).toBe(false);
    expect(outcome.message).toMatch(/nothing/i);
  });
});
