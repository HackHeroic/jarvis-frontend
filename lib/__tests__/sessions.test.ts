/**
 * Opening a conversation tells an outage from a deletion by status and code
 * (Jarvis-Engine app/api/v1/endpoints/sessions.py: 404 `not_found` for a session
 * that is not the caller's, 503 `persistence_unavailable` when the database cannot
 * be reached). The sidebar's list says when a refresh failed instead of quietly
 * showing the last one.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, loadConversation } from "@/lib/api";
import { CONVERSATION_GONE, conversationLoadFailure, sessionsListNote } from "@/lib/sessions";

function envelope(code: string, message: string) {
  return { error: { code, message, details: null, request_id: "req-1" } };
}

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("loadConversation", () => {
  it("a 404 is an ApiError (not_found), never an empty conversation", async () => {
    respond(404, envelope("not_found", "Session not found."));
    const err = await loadConversation("s-1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("not_found");
  });

  it("a 503 is an ApiError carrying the backend's words", async () => {
    respond(503, envelope("persistence_unavailable", "Could not reach the database."));
    const err = await loadConversation("s-1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
    expect(err.serverMessage).toBe("Could not reach the database.");
  });

  it("a session with no messages is still an empty list", async () => {
    respond(200, { session: { id: "s-1" }, messages: [] });
    expect(await loadConversation("s-1")).toEqual([]);
  });
});

describe("conversationLoadFailure", () => {
  it("404 not_found: the conversation may have been deleted", () => {
    const failure = conversationLoadFailure(new ApiError("x", 404, "not_found", "Session not found."));
    expect(failure).toEqual({ kind: "gone", message: CONVERSATION_GONE });
    expect(CONVERSATION_GONE).toBe("Could not load this conversation. It may have been deleted.");
  });

  it("503: Jarvis can't be reached right now — with Retry, and no word of deletion", () => {
    const failure = conversationLoadFailure(
      new ApiError("x", 503, "persistence_unavailable", "Could not reach the database."),
    );
    expect(failure).toEqual({
      kind: "unreachable",
      headline: "Can't reach Jarvis right now",
      detail: "Could not reach the database.",
    });
  });

  it("a database_unavailable code, a network failure or any other status is an outage too, never a deletion", () => {
    for (const err of [
      { code: "database_unavailable" },
      new TypeError("Failed to fetch"),
      new ApiError("x", 500, undefined, undefined),
    ]) {
      const failure = conversationLoadFailure(err);
      expect(failure.kind).toBe("unreachable");
      expect(JSON.stringify(failure)).not.toMatch(/deleted/i);
    }
  });
});

describe("sessionsListNote", () => {
  it("a refresh that worked says nothing", () => {
    expect(sessionsListNote({ loaded: true, refreshFailed: false, count: 3 })).toEqual({ note: null, showEmpty: false });
    expect(sessionsListNote({ loaded: true, refreshFailed: false, count: 0 })).toEqual({ note: null, showEmpty: true });
  });

  it("a failed refresh keeps the last list and says so, quietly", () => {
    expect(sessionsListNote({ loaded: true, refreshFailed: true, count: 3 })).toEqual({
      note: "Couldn't refresh — showing the last list",
      showEmpty: false,
    });
  });

  it("a list that never loaded is not 'no conversations yet'", () => {
    expect(sessionsListNote({ loaded: false, refreshFailed: true, count: 0 })).toEqual({
      note: "Couldn't load your conversations",
      showEmpty: false,
    });
  });
});
