/**
 * The You-page and suggestion calls in lib/api.ts over a stubbed fetch: the URL
 * carries `user_id`, the method and body are right, and every non-2xx answer is
 * an `ApiError` carrying the backend's own message (never a silent empty list).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  acceptSuggestion,
  confirmMemory,
  deleteBehavioralConstraint,
  deleteMemory,
  dismissMemory,
  dismissSuggestion,
  getYou,
  listMemories,
  listSuggestions,
  runTrigger,
  updateYouSettings,
} from "@/lib/api";
import { API_BASE, USER_ID } from "@/lib/constants";

interface Call {
  url: string;
  method: string;
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
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

function envelope(code: string, message: string, details: Record<string, unknown> | null = null) {
  return { error: { code, message, details, request_id: "req-1" } };
}

const SUGGESTION = {
  id: "s-1",
  trigger: "morning_brief",
  kind: "apply_plan",
  title: "Today is ready",
  body: "4 tasks are planned for today.",
  status: "pending",
  consent_behavior: "ask",
  consent_kind: "mode_decision",
  consent_reason: "This changes your schedule, so I'm asking first.",
  created_at: "2026-11-14T03:30:00Z",
  expires_at: "2026-11-14T18:29:59Z",
  details: { kind: "apply_plan", draft_id: "d-1", dedupe_key: "apply_plan:d-1" },
};

const MEMORY = {
  memory_id: "m-1",
  memory_type: "goal",
  content: "Training for the Mumbai marathon in March",
  confidence: 0.9,
  provenance: "said",
  freshness: 1.0,
  noted_at: "2026-11-02T08:00:00Z",
  last_confirmed_at: "2026-11-14T10:00:00Z",
  observation_count: 2,
  pattern_key: null,
};

const PROFILE = { display_name: null, timezone: "Asia/Kolkata", wake_time: "06:30", autonomy_mode: "suggest_only" };

const userParam = `user_id=${encodeURIComponent(USER_ID)}`;

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getYou", () => {
  it("reads GET /api/v1/you with the user id", async () => {
    respond(200, {
      profile: PROFILE,
      patterns: [],
      rules: [],
      memories: [MEMORY],
      focus: {
        source: "learned",
        observations: 18,
        hours: Array.from({ length: 24 }, (_, hour) => ({ hour, score: 0.5, done: 1, not_done: 0 })),
      },
      receipt: {
        since: "2026-10-15T10:00:00Z",
        truncated: true,
        on_device_calls: 5000,
        cloud_calls: 3,
        pii_redactions: 1,
        input_tokens: 1,
        output_tokens: 1,
      },
    });
    const you = await getYou();
    expect(calls).toEqual([{ url: `${API_BASE}/api/v1/you?${userParam}`, method: "GET", body: undefined }]);
    expect(you.focus.source).toBe("learned");
    expect(you.receipt.truncated).toBe(true);
  });

  it("a 503 envelope is an ApiError with the backend's message, never an empty page", async () => {
    respond(503, envelope("persistence_unavailable", "Could not reach the database."));
    const err = await getYou().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
    expect(err.serverMessage).toBe("Could not reach the database.");
  });
});

describe("updateYouSettings", () => {
  it("PATCHes only the given settings", async () => {
    respond(200, PROFILE);
    const profile = await updateYouSettings({ wake_time: "06:30" });
    expect(calls[0]).toEqual({
      url: `${API_BASE}/api/v1/you/settings?${userParam}`,
      method: "PATCH",
      body: { wake_time: "06:30" },
    });
    expect(profile.wake_time).toBe("06:30");
  });

  it("a 422 envelope is an ApiError with code validation_error", async () => {
    respond(422, envelope("validation_error", "That timezone isn't one Jarvis knows. Use a name like Asia/Kolkata.", { fields: ["timezone"] }));
    const err = await updateYouSettings({ timezone: "Mars/Olympus_Mons" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.serverMessage).toContain("timezone");
  });
});

describe("suggestions", () => {
  it("listSuggestions reads the pending list", async () => {
    respond(200, { suggestions: [SUGGESTION] });
    const list = await listSuggestions();
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/anticipation/suggestions?${userParam}`);
    expect(list).toHaveLength(1);
    expect(list[0].details.draft_id).toBe("d-1");
  });

  it("listSuggestions on a 503 throws, never []", async () => {
    respond(503, envelope("persistence_unavailable", "Could not reach the database."));
    await expect(listSuggestions()).rejects.toBeInstanceOf(ApiError);
  });

  it("acceptSuggestion POSTs to /accept and parses the result", async () => {
    respond(200, {
      suggestion: { ...SUGGESTION, status: "accepted" },
      result: { kind: "apply_plan", message: "Today's plan is saved.", tasks_written: 4, draft_id: null },
    });
    const accepted = await acceptSuggestion("s-1");
    expect(calls[0]).toEqual({
      url: `${API_BASE}/api/v1/anticipation/suggestions/s-1/accept?${userParam}`,
      method: "POST",
      body: undefined,
    });
    expect(accepted.result.tasks_written).toBe(4);
  });

  it("acceptSuggestion on a 409 is an ApiError carrying the plain message", async () => {
    respond(409, envelope("invalid_state_transition", "This suggestion is out of date — a newer plan replaced it."));
    const err = await acceptSuggestion("s-1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.serverMessage).toBe("This suggestion is out of date — a newer plan replaced it.");
  });

  it("dismissSuggestion POSTs to /dismiss", async () => {
    respond(200, { ...SUGGESTION, status: "dismissed" });
    const dismissed = await dismissSuggestion("s-1");
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/anticipation/suggestions/s-1/dismiss?${userParam}`);
    expect(calls[0].method).toBe("POST");
    expect(dismissed.status).toBe("dismissed");
  });

  it("runTrigger POSTs {trigger} to /run", async () => {
    respond(200, { status: "nothing_to_say", suggestion: null, consent: null });
    const run = await runTrigger("morning_brief");
    expect(calls[0]).toEqual({
      url: `${API_BASE}/api/v1/anticipation/run?${userParam}`,
      method: "POST",
      body: { trigger: "morning_brief" },
    });
    expect(run.status).toBe("nothing_to_say");
  });
});

describe("memories", () => {
  it("listMemories reads the new shape (memory_id, noted_at, provenance)", async () => {
    respond(200, { memories: [MEMORY], count: 1 });
    const [memory] = await listMemories();
    expect(memory.memory_id).toBe("m-1");
    expect(memory.noted_at).toBe("2026-11-02T08:00:00Z");
    expect(memory.provenance).toBe("said");
  });

  it("confirmMemory returns the confirmed memory", async () => {
    respond(200, MEMORY);
    const confirmed = await confirmMemory("m-1");
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/memories/m-1/confirm?${userParam}`);
    expect(confirmed.confidence).toBe(0.9);
  });

  it("confirmMemory on a dismissed memory is a 409 ApiError", async () => {
    respond(409, envelope("conflict", "That memory was let go of and can't be confirmed."));
    const err = await confirmMemory("m-1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
  });

  it("dismissMemory POSTs to /dismiss", async () => {
    respond(200, MEMORY);
    await dismissMemory("m-1");
    expect(calls[0]).toMatchObject({ url: `${API_BASE}/api/v1/memories/m-1/dismiss?${userParam}`, method: "POST" });
  });

  it("deleteMemory (forget) DELETEs and throws ApiError on a 503", async () => {
    respond(200, { status: "forgotten" });
    await deleteMemory("m-1");
    expect(calls[0]).toMatchObject({ url: `${API_BASE}/api/v1/memories/m-1?${userParam}`, method: "DELETE" });
    respond(503, envelope("persistence_unavailable", "Could not reach the database."));
    await expect(deleteMemory("m-1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("rules", () => {
  it("deleteBehavioralConstraint throws ApiError with the status (404: already gone)", async () => {
    respond(404, envelope("not_found", "Constraint not found"));
    const err = await deleteBehavioralConstraint("r-1").catch((e) => e);
    expect(calls[0]).toMatchObject({ url: `${API_BASE}/api/v1/habits/constraints/r-1?${userParam}`, method: "DELETE" });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
  });
});
