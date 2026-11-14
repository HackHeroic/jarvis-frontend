/**
 * A 422 from request validation says why in `error.details.errors` — FastAPI's
 * `[{loc, msg, type}]`, as Jarvis-Engine app/api/error_handlers.py
 * (_handle_request_validation) sends it, under the generic message "The request
 * is invalid." The person sees a short reason in words: never JSON, never a
 * field path. The chat input refuses the same sends before they leave.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, chatStream, readApiError, updateYouSettings, validationReason } from "@/lib/api";
import {
  FILE_TOO_BIG,
  MAX_CHAT_PROMPT_CHARS,
  MAX_CHAT_UPLOAD_BYTES,
  PROMPT_TOO_LONG,
  fileProblem,
  promptProblem,
} from "@/lib/chatLimits";
import { USER_ID } from "@/lib/constants";

/** The envelope `_handle_request_validation` answers with. */
function validation(errors: Array<{ loc: Array<string | number>; msg: string; type: string }>) {
  return {
    error: {
      code: "validation_error",
      message: "The request is invalid.",
      details: { errors },
      request_id: "req-1",
    },
  };
}

// Exactly what pydantic says for ChatStreamRequest (app/schemas/chat_stream.py).
const PROMPT_OVER = validation([
  { loc: ["body", "user_prompt"], msg: "String should have at most 8000 characters", type: "string_too_long" },
]);
const FILE_OVER = validation([
  { loc: ["body", "file_base64"], msg: "Value error, The file can be at most 10 MB.", type: "value_error" },
]);

function looksRaw(text: string): boolean {
  return /[{}[\]]|body\.|user_prompt|file_base64|string_too_long|value_error/.test(text);
}

describe("validationReason", () => {
  it("a chat message over the limit reads as a reason in words", () => {
    expect(validationReason(PROMPT_OVER.error.details)).toBe(
      "That message is too long — keep it under 8,000 characters.",
    );
  });

  it("a file over the limit reads as a reason in words", () => {
    expect(validationReason(FILE_OVER.error.details)).toBe("That file is too big — keep it under 10 MB.");
  });

  it("another field that is too long says the limit pydantic gave, without naming the field", () => {
    const details = validation([
      { loc: ["body", "timezone"], msg: "String should have at most 64 characters", type: "string_too_long" },
    ]).error.details;
    const reason = validationReason(details);
    expect(reason).toBe("That's too long — keep it under 64 characters.");
    expect(looksRaw(reason!)).toBe(false);
  });

  it("anything it cannot put in words is null, so the envelope's own message stands", () => {
    expect(validationReason(null)).toBeNull();
    expect(validationReason(undefined)).toBeNull();
    expect(validationReason({ fields: ["timezone"] })).toBeNull(); // a JarvisError's own details
    expect(validationReason({ errors: "nope" })).toBeNull();
    expect(
      validationReason(
        validation([{ loc: ["body", "wake_time"], msg: "String should match pattern '^\\d{2}:\\d{2}$'", type: "string_pattern_mismatch" }]).error.details,
      ),
    ).toBeNull();
  });
});

describe("readApiError and ApiError surface the reason", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("readApiError prefers the reason over the generic 'The request is invalid.'", () => {
    expect(readApiError(PROMPT_OVER, "fallback")).toBe(PROMPT_TOO_LONG);
    expect(readApiError(FILE_OVER, "fallback")).toBe(FILE_TOO_BIG);
  });

  it("with no reason it keeps the envelope's message, as before", () => {
    const body = {
      error: {
        code: "validation_error",
        message: "That timezone isn't one Jarvis knows.",
        details: { fields: ["timezone"] },
        request_id: "r",
      },
    };
    expect(readApiError(body, "fallback")).toBe("That timezone isn't one Jarvis knows.");
  });

  it("an ApiError from a 422 carries the reason as its serverMessage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify(
            validation([{ loc: ["body", "timezone"], msg: "String should have at most 64 characters", type: "string_too_long" }]),
          ),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const err = await updateYouSettings({ timezone: "x".repeat(65) }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.serverMessage).toBe("That's too long — keep it under 64 characters.");
    expect(looksRaw(err.serverMessage)).toBe(false);
  });

  it("a chat turn refused with a 422 ends with the reason alone — no status, no JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(PROMPT_OVER), { status: 422, headers: { "Content-Type": "application/json" } }),
      ),
    );
    const errors: string[] = [];
    await chatStream({ user_prompt: "x", user_id: USER_ID }, { onError: (e) => errors.push(e.message) });
    expect(errors).toEqual([PROMPT_TOO_LONG]);
  });
});

describe("the chat input refuses an over-limit send before it leaves", () => {
  it("the limits mirror the backend's config", () => {
    expect(MAX_CHAT_PROMPT_CHARS).toBe(8_000);
    expect(MAX_CHAT_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("a message is allowed up to the limit, inclusive", () => {
    expect(promptProblem("x".repeat(MAX_CHAT_PROMPT_CHARS))).toBeNull();
    expect(promptProblem("x".repeat(MAX_CHAT_PROMPT_CHARS + 1))).toBe(PROMPT_TOO_LONG);
    expect(promptProblem("")).toBeNull();
  });

  it("characters are counted as the backend counts them: an emoji is one", () => {
    // 8,000 emoji are 16,000 UTF-16 units but 8,000 characters to Python.
    expect(promptProblem("🙂".repeat(MAX_CHAT_PROMPT_CHARS))).toBeNull();
    expect(promptProblem("🙂".repeat(MAX_CHAT_PROMPT_CHARS + 1))).toBe(PROMPT_TOO_LONG);
  });

  it("a file is refused past 10 MB, the same words as the backend's 422", () => {
    expect(fileProblem(MAX_CHAT_UPLOAD_BYTES)).toBeNull();
    expect(fileProblem(MAX_CHAT_UPLOAD_BYTES + 1)).toBe(FILE_TOO_BIG);
    expect(fileProblem(0)).toBeNull();
  });
});
