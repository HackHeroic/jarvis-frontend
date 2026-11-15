/**
 * The Habits page's calls in lib/api.ts over a stubbed fetch: the check-ins are read
 * for the user, an answer posts only its quality, and a non-2xx answer is an
 * `ApiError` (an outage is never "no rules").
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, completeHabit, getRuleCheckIns } from "@/lib/api";
import { ContractError } from "@/lib/contracts";
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

const userParam = new URLSearchParams({ user_id: USER_ID }).toString();

const LIST = {
  timezone: "Asia/Kolkata",
  today: "2026-11-17",
  due_trackers: [
    {
      id: "t-1",
      constraint_id: "r-1",
      rule_text: "Keep 1 to 2 PM free for lunch",
      source: "said",
      learned_at: "2026-11-16T15:30:00Z",
      last_reviewed_at: null,
      next_due_on: "2026-11-17",
      interval_days: 1,
    },
  ],
  upcoming_trackers: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getRuleCheckIns", () => {
  it("GETs the user's check-ins and returns them parsed", async () => {
    respond(200, LIST);

    const list = await getRuleCheckIns();

    expect(calls[0]).toMatchObject({ url: `${API_BASE}/api/v1/habits/tracker/due?${userParam}`, method: "GET" });
    expect(list.due_trackers[0].rule_text).toBe("Keep 1 to 2 PM free for lunch");
  });

  it("a 503 is an ApiError carrying the backend's message, never an empty list", async () => {
    respond(503, {
      error: { code: "persistence_unavailable", message: "Could not reach the database.", details: null, request_id: "r" },
    });

    const err = await getRuleCheckIns().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
    expect(err.serverMessage).toBe("Could not reach the database.");
  });

  it("a body in another shape is a ContractError, never a blank page", async () => {
    respond(200, { due_trackers: [{ id: "t-1", repetitions: 0 }] });

    await expect(getRuleCheckIns()).rejects.toBeInstanceOf(ContractError);
  });
});

describe("completeHabit", () => {
  it("POSTs only the quality and returns when the rule comes back", async () => {
    respond(200, { next_review_date: "2026-11-18T15:30:00Z", next_interval_days: 1, next_due_on: "2026-11-18" });

    const reviewed = await completeHabit("t-1", 4);

    expect(calls[0]).toMatchObject({
      url: `${API_BASE}/api/v1/habits/tracker/t-1/complete?${userParam}`,
      method: "POST",
      body: { quality: 4 },
    });
    expect(reviewed.next_due_on).toBe("2026-11-18");
  });

  it("another user's tracker is a 404 ApiError", async () => {
    respond(404, { error: { code: "not_found", message: "That tracker does not exist.", details: null, request_id: "r" } });

    const err = await completeHabit("t-x", 4).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
  });
});
