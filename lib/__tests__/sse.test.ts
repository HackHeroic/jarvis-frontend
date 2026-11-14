import { afterEach, describe, expect, it, vi } from "vitest";
import { chatStream, consumeSSE, createStreamControl, untilAborted, type StreamHandlers } from "@/lib/api";
import { API_BASE, USER_ID } from "@/lib/constants";
import { toLearningMoment, type LearningMoment } from "@/lib/learning";
import type { ChatResponse, PearlInsight, ToolUseEvent } from "@/lib/types";

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

  it("after its signal aborts (Stop, or the page detaching) no handler runs — not even onError", async () => {
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

describe("createStreamControl", () => {
  it("Stop cancels the request and silences the handlers", () => {
    const control = createStreamControl();
    control.stop();
    expect(control.requestSignal.aborted).toBe(true);
    expect(control.deliverySignal.aborted).toBe(true);
  });

  it("leaving the page detaches: handlers go quiet but the request is never cancelled", () => {
    const control = createStreamControl();
    control.detach();
    expect(control.deliverySignal.aborted).toBe(true);
    expect(control.requestSignal.aborted).toBe(false);
  });

  it("a detached stream is read to its end in the background, delivering nothing", async () => {
    const chunks = [
      frame("memory_extracted", MEMORY),
      frame("pattern_detected", PATTERN),
      frame("complete", COMPLETE),
    ];
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (pulled < chunks.length) {
          c.enqueue(new TextEncoder().encode(chunks[pulled]));
          pulled += 1;
        } else {
          c.close();
        }
      },
    });
    const calls: string[] = [];
    const control = createStreamControl();
    const handlers = untilAborted(control.deliverySignal, {
      onMemoryExtracted: () => calls.push("memory_extracted"),
      onPatternDetected: () => calls.push("pattern_detected"),
      onComplete: () => calls.push("complete"),
      onError: () => calls.push("error"),
    });

    control.detach(); // the page unmounted before the first frame
    await consumeSSE(new Response(body), handlers, "Stream error");

    expect(pulled).toBe(chunks.length); // the server's whole reply was read: the turn finished
    expect(calls).toEqual([]);
  });
});

describe("complete frame: since_last_spoke", () => {
  async function completeWith(value: unknown) {
    let got: unknown = "not called";
    await consumeSSE(
      sseResponse(frame("complete", { ...COMPLETE, since_last_spoke: value })),
      { onComplete: (r) => (got = r.since_last_spoke) },
      "Stream error",
    );
    return got;
  }

  it("a new session's first turn carries the note, trimmed", async () => {
    expect(await completeWith(" Since we last spoke (2 days ago): 3 done, 1 set aside. ")).toBe(
      "Since we last spoke (2 days ago): 3 done, 1 set aside.",
    );
  });

  it("null passes as null", async () => {
    expect(await completeWith(null)).toBeNull();
  });

  it("a non-string value is ignored (null), and the turn still completes", async () => {
    expect(await completeWith({ text: "x" })).toBeNull();
    expect(await completeWith(7)).toBeNull();
  });
});

describe("chatStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chatStream posts to /api/v1/chat/stream", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(String(url));
        return sseResponse(frame("complete", COMPLETE));
      }),
    );

    await chatStream({ user_prompt: "hi", user_id: USER_ID }, {});

    expect(urls).toHaveLength(1);
    expect(urls[0].endsWith("/api/v1/chat/stream")).toBe(true);
    expect(urls[0]).toBe(`${API_BASE}/api/v1/chat/stream`);
  });
});

describe("frames the backend sends that the types must admit", () => {
  it("a tool step the backend skipped arrives as status 'skipped', with its reason", async () => {
    const skipped: ToolUseEvent = {
      module: "planning_module",
      tool: "translate_habits",
      status: "skipped",
      detail: { reason: "feature 'habit_translation' disabled" },
    };
    const seen: ToolUseEvent[] = [];
    await consumeSSE(sseResponse(frame("tool_use", skipped)), { onToolUse: (e) => seen.push(e) }, "Stream error");
    expect(seen).toEqual([skipped]);
  });

  it("a PEARL insight whose memory is not stored yet has memory_id null", async () => {
    const insight: PearlInsight = {
      insight: "I keep demanding work out of the 9 AM hour.",
      confidence: 0.75,
      occurrences: 4,
      memory_id: null,
    };
    let got: ChatResponse | null = null;
    await consumeSSE(
      sseResponse(frame("complete", { ...COMPLETE, pearl_insights: [insight] })),
      { onComplete: (r) => (got = r) },
      "Stream error",
    );
    expect(got!.pearl_insights).toEqual([insight]);
  });
});
