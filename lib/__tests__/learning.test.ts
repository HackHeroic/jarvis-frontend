import { describe, expect, it } from "vitest";
import { ContractError } from "@/lib/contracts";
import {
  LIST_ERROR_MESSAGE,
  SHAPE_ERROR_MESSAGE,
  describeAcceptOutcome,
  describeError,
  noDraftToAccept,
  readPatternFrame,
  shouldToast,
  toConsentRequest,
  toLearningMoment,
  toListState,
  toSinceLastSpoke,
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

describe("noDraftToAccept", () => {
  it("noDraftToAccept says the plan was not kept, without blame", () => {
    const outcome = noDraftToAccept();
    expect(outcome).toEqual({
      ok: false,
      tone: "info",
      message: "I couldn't keep this plan for review. Ask me again and I'll rebuild it.",
    });
    expect(outcome.message).not.toMatch(/failed|you didn't|missed|behind/i);
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

  it("an outage's headline is 'Can't reach Jarvis right now'", () => {
    const state = toListState({ error: new Error("503") });
    expect(state.kind === "error" && state.headline).toBe(LIST_ERROR_MESSAGE);
  });

  it("a response in an unexpected shape has its own headline", () => {
    const state = toListState({ error: new ContractError("you.receipt.since", "a string") });
    expect(state.kind === "error" && state.headline).toBe(SHAPE_ERROR_MESSAGE);
  });
});

describe("describeError", () => {
  it("an outage: can't reach, with the backend's own words as detail", () => {
    const outage = Object.assign(new Error("Failed (503)"), {
      status: 503,
      serverMessage: "Could not reach the database.",
    });
    expect(describeError(outage)).toEqual({
      headline: LIST_ERROR_MESSAGE,
      detail: "Could not reach the database.",
      shape: false,
    });
  });

  it("shape drift is not an outage: it says the page doesn't understand the answer", () => {
    const described = describeError(new ContractError("suggestion.details", "an object"));
    expect(described.shape).toBe(true);
    expect(described.headline).toBe(SHAPE_ERROR_MESSAGE);
    expect(described.headline).not.toBe(LIST_ERROR_MESSAGE);
    expect(described.detail).toMatch(/refresh/i);
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

  it("pattern_key is optional in the backend's frame: absent or null, it still notes and toasts", () => {
    // Typed, not cast: this only compiles while pattern_key is optional and nullable.
    const noKey: PatternDetectedEvent = {
      memory_id: "m-4",
      type: "peak_hour",
      content: "Your evenings around 7 PM go well",
      confidence: 0.93,
      occurrence_count: 30,
      action: "created",
    };
    const nullKey: PatternDetectedEvent = { ...noKey, pattern_key: null };
    for (const frame of [noKey, nullKey]) {
      const { moment, toast } = readPatternFrame(frame);
      expect(moment).toMatchObject({ kind: "pattern", id: "m-4", content: "Your evenings around 7 PM go well" });
      expect(toast).toMatchObject({ content: "Your evenings around 7 PM go well", occurrence_count: 30 });
    }
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

describe("toSinceLastSpoke (the complete frame's since_last_spoke)", () => {
  it("a non-empty string is the note, trimmed", () => {
    expect(
      toSinceLastSpoke("  Since we last spoke (yesterday): you were talking about \"DP practice\". Since then: 2 done.  "),
    ).toBe('Since we last spoke (yesterday): you were talking about "DP practice". Since then: 2 done.');
  });

  it("null (every turn but a new session's first) shows nothing", () => {
    expect(toSinceLastSpoke(null)).toBeNull();
    expect(toSinceLastSpoke(undefined)).toBeNull();
  });

  it("a blank or non-string value is ignored, never rendered", () => {
    expect(toSinceLastSpoke("   ")).toBeNull();
    expect(toSinceLastSpoke(42)).toBeNull();
    expect(toSinceLastSpoke({ text: "hi" })).toBeNull();
    expect(toSinceLastSpoke(["Since we last spoke"])).toBeNull();
  });
});
