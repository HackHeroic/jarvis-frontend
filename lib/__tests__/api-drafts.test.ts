/**
 * Accepting a draft names the version the user looked at (`expected_version`, from
 * GET /drafts/{id}); a draft changed since is refused with 409 `stale_version` and
 * the latest draft in the envelope's details — nothing written.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, acceptDraft, getDraftById } from "@/lib/api";
import { API_BASE, USER_ID } from "@/lib/constants";
import { DRAFT_READ, STALE_ACCEPT_409 } from "./draft-samples";

interface Call {
  url: string;
  body: unknown;
}

let calls: Call[] = [];

function respond(status: number, body: unknown) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const ACCEPTED = { status: "accepted", draft_id: DRAFT_READ.draft_id, task_count: 3, moved: false, message: null };

describe("acceptDraft and the version", () => {
  it("getDraftById keeps the version of what was read", async () => {
    respond(200, DRAFT_READ);
    const draft = await getDraftById(DRAFT_READ.draft_id);
    expect(draft.version).toBe("37506042eff02067");
  });

  it("sends the version it was given as expected_version", async () => {
    respond(200, ACCEPTED);
    await acceptDraft(DRAFT_READ.draft_id, "37506042eff02067");
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/drafts/${DRAFT_READ.draft_id}/accept`);
    expect(calls[0].body).toEqual({ user_id: USER_ID, expected_version: "37506042eff02067" });
  });

  it("without a version it sends none, and the backend does no check (the chat card's accept)", async () => {
    respond(200, ACCEPTED);
    await acceptDraft(DRAFT_READ.draft_id);
    expect(calls[0].body).toEqual({ user_id: USER_ID });
  });

  it("a stale accept is an ApiError: 409 stale_version, the backend's words, the latest draft in details", async () => {
    respond(409, STALE_ACCEPT_409);
    const err = await acceptDraft(DRAFT_READ.draft_id, "37506042eff02067").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe("stale_version");
    expect(err.serverMessage).toBe("This plan changed since you looked — here is the latest.");
    expect((err.details.draft as { version: string }).version).toBe("6f2f15015ab658b5");
  });

  it("an error with no details carries none", async () => {
    respond(503, { error: { code: "persistence_unavailable", message: "Could not reach the database.", details: null, request_id: "r" } });
    const err = await acceptDraft(DRAFT_READ.draft_id).catch((e) => e);
    expect(err.details).toBeUndefined();
  });
});
