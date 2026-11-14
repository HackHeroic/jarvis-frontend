import { describe, expect, it } from "vitest";
import { consumeSSE, type StreamHandlers } from "@/lib/api";

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
});
