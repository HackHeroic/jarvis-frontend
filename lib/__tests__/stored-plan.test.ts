import { describe, expect, it } from "vitest";
import { storedPlanOf } from "../draftCard";

const SCHEDULE = { horizon_start: "2026-11-16T08:00:00+05:30", schedule: { t1: { start_min: 0, end_min: 25, title: "Read" } } };

describe("storedPlanOf: the plan a reopened conversation proposed", () => {
  it("returns the newest planning turn as the response its card needs", () => {
    const plan = storedPlanOf(
      [
        { id: "m1", role: "user", content: "plan my week", metadata: {} },
        { id: "m2", role: "assistant", content: "Older plan", metadata: { draft_id: "d1", schedule: SCHEDULE } },
        { id: "m3", role: "user", content: "add chemistry", metadata: {} },
        { id: "m4", role: "assistant", content: "Your draft is ready, sir.", metadata: { draft_id: "d2", schedule: SCHEDULE } },
      ],
      "conv-1",
    );

    expect(plan?.index).toBe(3);
    expect(plan?.draftId).toBe("d2");
    expect(plan?.response).toMatchObject({
      intent: "PLAN_DAY",
      message: "Your draft is ready, sir.",
      schedule_status: "draft",
      draft_id: "d2",
      conversation_id: "conv-1",
      message_id: "m4",
    });
    // The version comes from the draft itself, read when the conversation opens.
    expect(plan?.response.draft_version).toBeUndefined();
  });

  it("is undefined for a conversation that never proposed a plan", () => {
    expect(
      storedPlanOf(
        [
          { id: "m1", role: "user", content: "hi", metadata: {} },
          { id: "m2", role: "assistant", content: "Good evening, sir.", metadata: { draft_id: null } },
        ],
        "conv-1",
      ),
    ).toBeUndefined();
  });

  it("ignores a user message and a turn that kept an id but no slots", () => {
    expect(
      storedPlanOf(
        [
          { id: "m1", role: "user", content: "x", metadata: { draft_id: "d1", schedule: SCHEDULE } },
          { id: "m2", role: "assistant", content: "y", metadata: { draft_id: "d1", schedule: null } },
        ],
        "conv-1",
      ),
    ).toBeUndefined();
  });
});
