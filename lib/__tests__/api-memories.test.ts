/**
 * Correcting a memory over a stubbed fetch: `editMemory` PATCHes the memory for the
 * user with only its new words, returns the memory as it now is, and every failure
 * is the `ApiError` the other memory calls throw, with the backend's own words.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, editMemory } from "@/lib/api";
import { ContractError } from "@/lib/contracts";
import { API_BASE, USER_ID } from "@/lib/constants";
import { errorMessageOf } from "@/lib/you";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

let calls: Call[] = [];

function respond(status: number, body: unknown) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method ?? "GET",
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

const envelope = (code: string, message: string, details: Record<string, unknown> | null = null) => ({
  error: { code, message, details, request_id: "req-1" },
});

const userParam = new URLSearchParams({ user_id: USER_ID }).toString();

const EDITED = {
  memory_id: "m-1",
  memory_type: "constraint",
  content: "Goes to the gym every weekday at 7 AM",
  confidence: 0.95,
  provenance: "said",
  freshness: 1.0,
  noted_at: "2026-11-02T08:00:00Z",
  last_confirmed_at: null,
  observation_count: 1,
  pattern_key: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("editMemory", () => {
  it("PATCHes the memory for the user with only its new words, trimmed", async () => {
    respond(200, EDITED);

    await editMemory("m-1", "  Goes to the gym every weekday at 7 AM \n");

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: `${API_BASE}/api/v1/memories/m-1?${userParam}`,
      method: "PATCH",
      body: { content: "Goes to the gym every weekday at 7 AM" },
    });
    expect(calls[0].headers["Content-Type"]).toBe("application/json");
  });

  it("returns the memory as it now is", async () => {
    respond(200, EDITED);

    const memory = await editMemory("m-1", "Goes to the gym every weekday at 7 AM");

    expect(memory.content).toBe("Goes to the gym every weekday at 7 AM");
    expect(memory.provenance).toBe("said");
  });

  it("encodes the memory id in the path", async () => {
    respond(200, EDITED);
    await editMemory("m/1 x", "words");
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/memories/m%2F1%20x?${userParam}`);
  });

  it("an unknown memory (404) is an ApiError, as the other memory calls raise", async () => {
    respond(404, envelope("not_found", "That memory does not exist."));

    const err = await editMemory("m-x", "words").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("not_found");
    expect(err.serverMessage).toBe("That memory does not exist.");
  });

  it("a forgotten memory (409) carries the backend's reason", async () => {
    respond(409, envelope("conflict", "This memory was forgotten, so it can't be edited."));

    const err = await editMemory("m-1", "words").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(errorMessageOf(err, "fallback")).toBe("This memory was forgotten, so it can't be edited.");
  });

  it("words over the limit (422) read as the limit in words", async () => {
    respond(
      422,
      envelope("validation_error", "The request is not valid.", {
        errors: [{ loc: ["body", "content"], msg: "String should have at most 2000 characters", type: "string_too_long" }],
      }),
    );

    const err = await editMemory("m-1", "x".repeat(2001)).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.serverMessage).toBe("That's too long — keep it under 2,000 characters.");
  });

  it("an outage (503) throws, never reads as saved", async () => {
    respond(503, envelope("persistence_unavailable", "Could not reach the database."));
    await expect(editMemory("m-1", "words")).rejects.toBeInstanceOf(ApiError);
  });

  it("a 2xx in another shape is a ContractError", async () => {
    respond(200, { status: "ok" });
    await expect(editMemory("m-1", "words")).rejects.toBeInstanceOf(ContractError);
  });
});
