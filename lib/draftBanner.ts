/**
 * Pure logic for the dashboard's pending-plan banner: which actions it offers,
 * a summary of what the plan would add, and what an accept or discard outcome
 * says. No React, no fetch — unit-tested with Vitest.
 */

import { describeAcceptOutcome } from "./learning";
import type { DraftState } from "./types";

// ---------------------------------------------------------------------------
// Which actions the banner offers
// ---------------------------------------------------------------------------

export interface DraftBannerActions {
  reviewInChat: boolean;
  lockIn: boolean;
  discard: boolean;
}

/**
 * A chat turn's plan has its review card in chat, so the banner links there.
 * A plan drafted by an accepted suggestion has no card in chat, so the banner
 * acts on it in place (lock it in, or discard) and offers no "Review in chat".
 * Untagged plans were stored before tagging, and came from chat turns.
 */
export function draftBannerActions(source: "chat" | "suggestion" | undefined): DraftBannerActions {
  if (source === "suggestion") return { reviewInChat: false, lockIn: true, discard: true };
  return { reviewInChat: true, lockIn: false, discard: false };
}

// ---------------------------------------------------------------------------
// What the plan would add
// ---------------------------------------------------------------------------

export interface DraftSummary {
  taskCount: number;
  /** The first few tasks: earliest first when times are known, else in the plan's order. */
  shown: { title: string; when: string }[];
  more: number;
  /** True when the lines carry local times; false when they carry durations. */
  timed: boolean;
}

const SUMMARY_LIMIT = 3;

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** A task's start minute: on the task itself, or in a schedule map (flat or `{schedule: {...}}`). */
function startMinOf(task: Record<string, unknown>, schedule: unknown): number | undefined {
  const own = finite(task.start_min);
  if (own !== undefined) return own;
  if (!schedule || typeof schedule !== "object") return undefined;
  const map = schedule as Record<string, unknown>;
  const slots =
    map.schedule && typeof map.schedule === "object" ? (map.schedule as Record<string, unknown>) : map;
  const slot = typeof task.task_id === "string" ? slots[task.task_id] : undefined;
  return slot && typeof slot === "object" ? finite((slot as Record<string, unknown>).start_min) : undefined;
}

/** "Sat 19:00" on the given clock (the browser's when unset). */
function formatSlot(instant: Date, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(instant).replace(",", "");
  } catch {
    return new Intl.DateTimeFormat("en-GB", options).format(instant).replace(",", "");
  }
}

/**
 * What a plan would add: the task count and the first few tasks. Each line has
 * its local time when the payload carries the solved slots (`start_min` on the
 * task, or a `schedule` map, from `horizon_start`); otherwise its duration —
 * never a made-up time.
 */
export function summarizeDraft(
  draft: Pick<DraftState, "tasks" | "horizon_start" | "schedule">,
  opts: { limit?: number; timeZone?: string } = {},
): DraftSummary {
  const limit = opts.limit ?? SUMMARY_LIMIT;
  const tasks = Array.isArray(draft.tasks) ? draft.tasks : [];
  const origin = draft.horizon_start ? new Date(draft.horizon_start) : null;
  const hasOrigin = origin !== null && !Number.isNaN(origin.getTime());

  const lines = tasks.map((task, order) => {
    const title = typeof task.title === "string" && task.title.trim() ? task.title.trim() : "Untitled task";
    const startMin = hasOrigin ? startMinOf(task, draft.schedule) : undefined;
    if (startMin !== undefined && origin) {
      const at = new Date(origin.getTime() + startMin * 60_000);
      return { title, when: formatSlot(at, opts.timeZone), at: at.getTime(), order };
    }
    const minutes = finite(task.duration_minutes);
    return { title, when: minutes !== undefined ? `${minutes} min` : "", at: undefined, order };
  });

  const timed = lines.length > 0 && lines.some((l) => l.at !== undefined);
  if (timed) {
    lines.sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity) || a.order - b.order);
  }
  return {
    taskCount: tasks.length,
    shown: lines.slice(0, limit).map(({ title, when }) => ({ title, when })),
    more: Math.max(0, tasks.length - limit),
    timed,
  };
}

// ---------------------------------------------------------------------------
// What an outcome says, and what it does to the banner
// ---------------------------------------------------------------------------

export interface BannerOutcome {
  tone: "success" | "info" | "error";
  message: string;
  /** The plan is settled (or gone): drop it from the banner. */
  clearBanner: boolean;
  refreshTasks: boolean;
}

/**
 * `POST /drafts/{id}/accept` answered 2xx. Only `accepted` with tasks saved is
 * a success (the banner clears, the task list refreshes); `empty` or anything
 * else keeps the plan open and never reads as success.
 */
export function bannerAcceptOutcome(res: {
  status?: string;
  task_count?: number;
  draft_id?: string;
}): BannerOutcome {
  const outcome = describeAcceptOutcome(res);
  return { tone: outcome.tone, message: outcome.message, clearBanner: outcome.ok, refreshTasks: outcome.ok };
}

/** `POST /drafts/{id}/reject` answered 2xx. */
export function bannerDiscardOutcome(): BannerOutcome {
  return {
    tone: "info",
    message: "Discarded. Nothing was added to your schedule.",
    clearBanner: true,
    refreshTasks: false,
  };
}

/**
 * A failed accept or discard (an `ApiError`, read by shape):
 * - 409 `invalid_state_transition` (already locked in, or closed): the
 *   backend's words, and the banner clears; after an accept the task list
 *   refreshes, in case it was locked in elsewhere.
 * - 409 `conflict` on accept (clashes with existing tasks): the plan stays open.
 * - 404: the plan is gone; the banner clears.
 * - Anything else (an outage): the plan stays, and nothing claims success.
 */
export function bannerErrorOutcome(err: unknown, action: "accept" | "discard"): BannerOutcome {
  const e = (err ?? {}) as { status?: unknown; code?: unknown; serverMessage?: unknown };
  const serverMessage = typeof e.serverMessage === "string" && e.serverMessage ? e.serverMessage : undefined;
  if (e.status === 409 && !(action === "accept" && e.code === "conflict")) {
    return {
      tone: "info",
      message: serverMessage ?? "This plan is already closed.",
      clearBanner: true,
      refreshTasks: action === "accept",
    };
  }
  if (e.status === 409) {
    return {
      tone: "error",
      message: serverMessage ?? "This plan clashes with tasks you already have.",
      clearBanner: false,
      refreshTasks: false,
    };
  }
  if (e.status === 404) {
    return { tone: "info", message: "This plan is no longer available.", clearBanner: true, refreshTasks: false };
  }
  return {
    tone: "error",
    message: action === "accept" ? describeAcceptOutcome({}).message : "That didn't go through. Try again.",
    clearBanner: false,
    refreshTasks: false,
  };
}
