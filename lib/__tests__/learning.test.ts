import { describe, expect, it } from "vitest";
import {
  describeAcceptOutcome,
  shouldToast,
  toLearningMoment,
  toListState,
} from "@/lib/learning";

describe("shouldToast", () => {
  it("stays quiet just under the confidence bar", () => {
    expect(shouldToast({ confidence: 0.69, occurrence_count: 3 })).toBe(false);
  });

  it("stays quiet until the pattern has recurred three times", () => {
    expect(shouldToast({ confidence: 0.7, occurrence_count: 2 })).toBe(false);
  });

  it("toasts at confidence 0.7 with three occurrences", () => {
    expect(shouldToast({ confidence: 0.7, occurrence_count: 3 })).toBe(true);
  });
});

describe("describeAcceptOutcome", () => {
  it("accepted with zero tasks is not a success", () => {
    expect(describeAcceptOutcome({ status: "accepted", task_count: 0 }).ok).toBe(false);
  });

  it("empty is an info outcome, not a success", () => {
    const outcome = describeAcceptOutcome({ status: "empty" });
    expect(outcome.ok).toBe(false);
    expect(outcome.tone).toBe("info");
  });

  it("accepted with tasks is a success that names the count", () => {
    const outcome = describeAcceptOutcome({ status: "accepted", task_count: 3 });
    expect(outcome.ok).toBe(true);
    expect(outcome.tone).toBe("success");
    expect(outcome.message).toContain("3");
  });

  it("anything else is an error with a retry hint", () => {
    const outcome = describeAcceptOutcome({ status: "error" });
    expect(outcome.ok).toBe(false);
    expect(outcome.tone).toBe("error");
    expect(outcome.message).toBe("Failed to save schedule. Try again.");
  });
});

describe("toListState", () => {
  it("an error is an error state, never empty", () => {
    expect(toListState({ error: new Error("503") }).kind).toBe("error");
  });

  it("an error wins even when stale items are present", () => {
    expect(toListState({ items: [1, 2], error: new Error("503") }).kind).toBe("error");
  });

  it("a 200 with [] is empty", () => {
    expect(toListState({ items: [] }).kind).toBe("empty");
  });

  it("items are ready", () => {
    expect(toListState({ items: ["a"] })).toEqual({ kind: "ready", items: ["a"] });
  });

  it("no items and no error yet is loading", () => {
    expect(toListState({}).kind).toBe("loading");
  });
});

describe("toLearningMoment", () => {
  it("a memory is something the user said", () => {
    const moment = toLearningMoment(
      {
        memory_id: "m-1",
        type: "preference",
        content: "Prefers mornings for deep work",
        confidence: 0.9,
        provenance: "said",
        action: "created",
      },
      "memory",
    );
    expect(moment).toMatchObject({
      kind: "memory",
      id: "m-1",
      provenance: "said",
      action: "created",
    });
  });

  it("a pattern is something Jarvis inferred, with its occurrences", () => {
    const moment = toLearningMoment(
      {
        memory_id: "m-2",
        pattern_key: "skip_time_window:8",
        type: "pattern",
        content: "Early tasks tend to get set aside",
        confidence: 0.75,
        occurrence_count: 4,
        action: "strengthened",
      },
      "pattern",
    );
    expect(moment).toMatchObject({
      kind: "pattern",
      id: "m-2",
      provenance: "inferred",
      occurrences: 4,
      action: "strengthened",
    });
  });
});
