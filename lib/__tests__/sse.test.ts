import { describe, expect, it } from "vitest";
import { consumeSSE, untilAborted, type StreamHandlers } from "@/lib/api";
import { toLearningMoment, type LearningMoment } from "@/lib/learning";

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** A Response whose body yields `text` in fixed-size chunks, so frames split mid-line. */
function sseResponse(text: string, chunkSize = 17): Response {
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.slice(i, i + chunkSize));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

const MEMORY = {
  memory_id: "m-1",
  type: "preference",
  content: "Prefers mornings for deep work",
  confidence: 0.9,
  provenance: "said",
  action: "created",
};

const PATTERN = {
  memory_id: "m-2",
  pattern_key: "skip_time_window:8",
  type: "pattern",
  content: "Early tasks tend to get set aside",
  confidence: 0.75,
  occurrence_count: 4,
  action: "strengthened",
};

const CONSENT = { reason: "This would change saved tasks.", module: "planning_module" };

const COMPLETE = {
  intent: "CHAT",
  message: "Noted.",
  pearl_insights: null,
  suggested_action: null,
  schedule_status: null,
  conflict_summary: null,
};

describe("consumeSSE", () => {
  it("dispatches learning, consent and complete frames in stream order", async () => {
    const calls: Array<[string, unknown]> = [];
    const handlers: StreamHandlers = {
      onMemoryExtracted: (e) => calls.push(["memory_extracted", e]),
      onPatternDetected: (e) => calls.push(["pattern_detected", e]),
      onConsentRequest: (e) => calls.push(["consent_request", e]),
      onComplete: (r) => calls.push(["complete", r]),
      onError: (err) => calls.push(["error", err.message]),
    };

    const text =
      frame("memory_extracted", MEMORY) +
      frame("pattern_detected", PATTERN) +
      frame("consent_request", CONSENT) +
      frame("complete", COMPLETE);

    await consumeSSE(sseResponse(text), handlers, "Stream error");

    expect(calls.map(([name]) => name)).toEqual([
      "memory_extracted",
      "pattern_detected",
      "consent_request",
      "complete",
    ]);
    expect(calls[0][1]).toEqual(MEMORY);
    expect(calls[1][1]).toEqual(PATTERN);
    expect(calls[2][1]).toEqual(CONSENT);
    expect(calls[3][1]).toEqual(COMPLETE);
  });

  it("expands a list frame into one call per item, in order", async () => {
    const memories: unknown[] = [];
    const MEMORY_2 = { ...MEMORY, memory_id: "m-9", content: "Gym on Tuesdays" };
    await consumeSSE(
      sseResponse(frame("memory_extracted", [MEMORY, MEMORY_2])),
      { onMemoryExtracted: (e) => memories.push(e) },
      "Stream error",
    );
    expect(memories).toEqual([MEMORY, MEMORY_2]);
  });

  it("a bad middle item in a list frame is skipped; the items after it still arrive", async () => {
    const MEMORY_2 = { ...MEMORY, memory_id: "m-9", content: "Gym on Tuesdays" };
    const moments: LearningMoment[] = [];
    const errors: string[] = [];
    // The hook's pipeline: frame → toLearningMoment → skip null.
    const handlers: StreamHandlers = {
      onMemoryExtracted: (e) => {
        const m = toLearningMoment(e, "memory");
        if (m) moments.push(m);
      },
      onError: (err) => errors.push(err.message),
    };
    await consumeSSE(
      sseResponse(frame("memory_extracted", [MEMORY, null, { content: {} }, 42, MEMORY_2])),
      handlers,
      "Stream error",
    );
    expect(moments.map((m) => m.id)).toEqual(["m-1", "m-9"]);
    expect(errors).toEqual([]);
  });

  it("a handler that throws on one item does not drop the items after it", async () => {
    const MEMORY_2 = { ...MEMORY, memory_id: "m-9" };
    const seen: string[] = [];
    await consumeSSE(
      sseResponse(frame("memory_extracted", [{ ...MEMORY, memory_id: "boom" }, MEMORY_2])),
      {
        onMemoryExtracted: (e) => {
          if (e.memory_id === "boom") throw new Error("render failed");
          seen.push(e.memory_id);
        },
      },
      "Stream error",
    );
    expect(seen).toEqual(["m-9"]);
  });

  it("an empty {} learning frame yields no moment and the turn still completes", async () => {
    const moments: LearningMoment[] = [];
    const calls: string[] = [];
    await consumeSSE(
      sseResponse(frame("memory_extracted", {}) + frame("pattern_detected", {}) + frame("complete", COMPLETE)),
      {
        onMemoryExtracted: (e) => {
          const m = toLearningMoment(e, "memory");
          if (m) moments.push(m);
        },
        onPatternDetected: (e) => {
          const m = toLearningMoment(e, "pattern");
          if (m) moments.push(m);
        },
        onComplete: () => calls.push("complete"),
        onError: () => calls.push("error"),
      },
      "Stream error",
    );
    expect(moments).toEqual([]);
    expect(calls).toEqual(["complete"]);
  });

  it("skips a malformed data line and keeps reading", async () => {
    const calls: string[] = [];
    const text =
      frame("memory_extracted", MEMORY) +
      "event: pattern_detected\ndata: {not json\n\n" +
      frame("complete", COMPLETE);
    await consumeSSE(
      sseResponse(text),
      {
        onMemoryExtracted: () => calls.push("memory_extracted"),
        onPatternDetected: () => calls.push("pattern_detected"),
        onComplete: () => calls.push("complete"),
        onError: () => calls.push("error"),
      },
      "Stream error",
    );
    expect(calls).toEqual(["memory_extracted", "complete"]);
  });

  it("skips a consent frame with no usable reason (object-valued) and keeps reading", async () => {
    const calls: Array<[string, unknown]> = [];
    await consumeSSE(
      sseResponse(
        frame("consent_request", { reason: { why: "x" }, module: "planning_module" }) +
          frame("consent_request", { reason: "Changes saved tasks", module: { n: 1 } }) +
          frame("complete", COMPLETE),
      ),
      {
        onConsentRequest: (e) => calls.push(["consent_request", e]),
        onComplete: () => calls.push(["complete", null]),
        onError: (err) => calls.push(["error", err.message]),
      },
      "Stream error",
    );
    expect(calls).toEqual([
      ["consent_request", { reason: "Changes saved tasks", module: "" }],
      ["complete", null],
    ]);
  });

  it("an aborted stream ends quietly, never as an error", async () => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        streamController = c;
        c.enqueue(new TextEncoder().encode(frame("memory_extracted", MEMORY)));
      },
    });
    const errors: string[] = [];
    const done = consumeSSE(
      new Response(body),
      { onMemoryExtracted: () => {}, onError: (err) => errors.push(err.message) },
      "Stream error",
    );
    await new Promise((r) => setTimeout(r, 0));
    streamController.error(new DOMException("The operation was aborted.", "AbortError"));
    await done;
    expect(errors).toEqual([]);
  });
});

describe("untilAborted", () => {
  it("passes frames through while the stream is live", async () => {
    const calls: string[] = [];
    const controller = new AbortController();
    await consumeSSE(
      sseResponse(frame("memory_extracted", MEMORY) + frame("complete", COMPLETE)),
      untilAborted(controller.signal, {
        onMemoryExtracted: () => calls.push("memory_extracted"),
        onComplete: () => calls.push("complete"),
      }),
      "Stream error",
    );
    expect(calls).toEqual(["memory_extracted", "complete"]);
  });

  it("after an abort (Stop, or the page unmounting) no handler runs — not even onError", async () => {
    const calls: string[] = [];
    const controller = new AbortController();
    const handlers = untilAborted(controller.signal, {
      onMemoryExtracted: () => calls.push("memory_extracted"),
      onComplete: () => calls.push("complete"),
      onError: () => calls.push("error"),
    });
    controller.abort();
    await consumeSSE(
      sseResponse(frame("memory_extracted", MEMORY) + frame("complete", COMPLETE)),
      handlers,
      "Stream error",
    );
    handlers.onError?.(new Error("Stream read error"));
    expect(calls).toEqual([]);
  });
});
