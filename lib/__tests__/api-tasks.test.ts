/**
 * Complete and Skip over a stubbed fetch: the request is right, a success hands
 * back the backend's own message (the skip's anti-guilt note), and a failure is an
 * `ApiError` carrying the backend's user-facing message — never raw response text.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, completeTask, skipTask } from "@/lib/api";
import { API_BASE, USER_ID } from "@/lib/constants";
import { errorMessageOf } from "@/lib/you";

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
      return new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

const envelope = (code: string, message: string) => ({
  error: { code, message, details: { task_id: "t-1" }, request_id: "req-1" },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("completeTask", () => {
  it("POSTs the user and the quality rating to /complete", async () => {
    respond(200, { task_id: "t-1", status: "completed", message: "Task completed.", replan_triggered: false });
    const res = await completeTask("t-1", undefined, 4);
    expect(calls).toEqual([
      {
        url: `${API_BASE}/api/v1/tasks/t-1/complete`,
        method: "POST",
        body: { user_id: USER_ID, quality: 4 },
      },
    ]);
    expect(res.message).toBe("Task completed.");
  });

  it("a 404 is an ApiError with the backend's message, not raw text", async () => {
    respond(404, envelope("not_found", "That task does not exist."));
    const err = await completeTask("t-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).code).toBe("not_found");
    expect(errorMessageOf(err, "fallback")).toBe("That task does not exist.");
  });

  it("a 503 says the backend's words; a body with none falls back", async () => {
    respond(503, envelope("persistence_unavailable", "Could not reach the database."));
    expect(errorMessageOf(await completeTask("t-1").catch((e: unknown) => e), "fallback")).toBe(
      "Could not reach the database.",
    );
    respond(500, "Internal Server Error");
    const err = await completeTask("t-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessageOf(err, "That didn't go through. Try again.")).toBe("That didn't go through. Try again.");
  });
});

describe("skipTask", () => {
  it("POSTs the user to /skip and hands back the anti-guilt message", async () => {
    const message =
      "Life happened — 'DSA practice: graphs' is off the list for now, and tomorrow morning suits it well. No stress.";
    respond(200, { task_id: "t-1", status: "skipped", message, replan_triggered: false });
    const res = await skipTask("t-1");
    expect(calls).toEqual([
      { url: `${API_BASE}/api/v1/tasks/t-1/skip`, method: "POST", body: { user_id: USER_ID } },
    ]);
    expect(res).toMatchObject({ status: "skipped", message });
  });

  it("a skip of a task already done answers 200 with what is true, and that is returned", async () => {
    respond(200, {
      task_id: "t-1",
      status: "completed",
      message: "'DSA practice: graphs' is already done, so nothing changed.",
      replan_triggered: false,
    });
    expect((await skipTask("t-1")).message).toBe("'DSA practice: graphs' is already done, so nothing changed.");
  });

  it("a failure is an ApiError with the backend's message", async () => {
    respond(404, envelope("not_found", "That task does not exist."));
    const err = await skipTask("t-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessageOf(err, "fallback")).toBe("That task does not exist.");
  });
});
