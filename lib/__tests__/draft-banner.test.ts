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

/** An ApiError-shaped failure, as lib/api.ts throws it. */
function apiError(status: number, code?: string, serverMessage?: string) {
  return Object.assign(new Error(`Failed (${status})`), { status, code, serverMessage });
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

  it("with slots (task start_min or a schedule map), each line gets its local time, earliest first", () => {
    const withSlots = {
      ...DRAFT,
      schedule: { t1: { start_min: 660, end_min: 685 }, t2: { start_min: 90, end_min: 110 } },
      tasks: [...DRAFT.tasks.slice(0, 2), { ...DRAFT.tasks[2], start_min: 720 }],
    };
    const summary = summarizeDraft(withSlots, { timeZone: "Asia/Kolkata" });
    expect(summary.timed).toBe(true);
    expect(summary.shown.map((t) => [t.title, t.when])).toEqual([
      ["Review notes", "Sat 09:30"],
      ["Graph DP set", "Sat 19:00"],
      ["Mock contest", "Sat 20:00"],
    ]);
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
