import { describe, expect, it } from "vitest";
import {
  describeAcceptOutcome,
  readPatternFrame,
  shouldToast,
  toConsentRequest,
  toLearningMoment,
  toListState,
} from "@/lib/learning";
import type { MemoryExtractedEvent, PatternDetectedEvent } from "@/lib/types";

/** A frame as it may arrive off the wire: any shape at all. */
const asMemory = (raw: unknown) => raw as MemoryExtractedEvent;
const asPattern = (raw: unknown) => raw as PatternDetectedEvent;

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
    expect(outcome.message).toBe("That didn't save. Try again.");
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

describe("toLearningMoment — frames off the wire are validated", () => {
  it("an empty frame is no moment", () => {
    expect(toLearningMoment(asMemory({}), "memory")).toBeNull();
  });

  it("object-valued content is no moment", () => {
    expect(toLearningMoment(asMemory({ memory_id: "m-1", content: {} }), "memory")).toBeNull();
  });

  it("blank content is no moment (never a blank row)", () => {
    expect(toLearningMoment(asMemory({ memory_id: "m-1", content: "   " }), "memory")).toBeNull();
  });

  it("numeric fields are coerced with Number", () => {
    const moment = toLearningMoment(
      asPattern({ memory_id: "m-2", content: "Evenings go well", confidence: "0.8", occurrence_count: "4" }),
      "pattern",
    );
    expect(moment?.confidence).toBe(0.8);
    expect(moment?.occurrences).toBe(4);
  });

  it("a NaN confidence reads as 0 and a NaN occurrence count is absent", () => {
    const moment = toLearningMoment(
      asPattern({ memory_id: "m-2", content: "Evenings go well", confidence: "high", occurrence_count: "lots" }),
      "pattern",
    );
    expect(moment?.confidence).toBe(0);
    expect(moment && "occurrences" in moment).toBe(false);
  });
});

describe("readPatternFrame — inline always, toast only when strong", () => {
  const base = { memory_id: "m-3", pattern_key: "k", type: "pattern", content: "Mornings get set aside", action: "created" };

  it("low confidence: an inline moment, no toast", () => {
    const { moment, toast } = readPatternFrame(asPattern({ ...base, confidence: 0.6, occurrence_count: 5 }));
    expect(moment?.content).toBe("Mornings get set aside");
    expect(toast).toBeNull();
  });

  it("too few occurrences: an inline moment, no toast", () => {
    const { moment, toast } = readPatternFrame(asPattern({ ...base, confidence: 0.9, occurrence_count: 2 }));
    expect(moment).not.toBeNull();
    expect(toast).toBeNull();
  });

  it("strong and recurring: an inline moment and a toast, with coerced numbers", () => {
    const { moment, toast } = readPatternFrame(asPattern({ ...base, confidence: "0.8", occurrence_count: "3" }));
    expect(moment).not.toBeNull();
    expect(toast).toMatchObject({ content: "Mornings get set aside", confidence: 0.8, occurrence_count: 3 });
  });

  it("a malformed pattern frame is neither", () => {
    expect(readPatternFrame(asPattern({ confidence: 0.9, occurrence_count: 9 }))).toEqual({ moment: null, toast: null });
  });
});

describe("toConsentRequest", () => {
  it("an object-valued reason is no consent request", () => {
    expect(toConsentRequest({ reason: { why: "x" }, module: "planning_module" })).toBeNull();
  });

  it("a blank or missing reason is no consent request", () => {
    expect(toConsentRequest({ reason: "  ", module: "planning_module" })).toBeNull();
    expect(toConsentRequest({ module: "planning_module" })).toBeNull();
    expect(toConsentRequest(null)).toBeNull();
  });

  it("fields are coerced to strings; an unusable module becomes empty", () => {
    expect(toConsentRequest({ reason: 42, module: 7 })).toEqual({ reason: "42", module: "7" });
    expect(toConsentRequest({ reason: "Changes saved tasks", module: {} })).toEqual({
      reason: "Changes saved tasks",
      module: "",
    });
  });
});
