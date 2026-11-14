/**
 * Pure logic for the dashboard's pending-plan banner: which actions it offers,
 * a summary of what the plan would add, and what an accept or discard outcome
 * says. No React, no fetch — unit-tested with Vitest.
 */

import { parseDraftState } from "./contracts";
import { describeAcceptOutcome } from "./learning";
import type { DraftSlot, DraftState } from "./types";

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

/** When a task's slot starts: the slot's own instant, else minute `start_min` from the horizon. */
function slotStart(slot: DraftSlot | undefined, horizonStart: string | null | undefined): Date | undefined {
  if (!slot) return undefined;
  const own = new Date(slot.start);
  if (!Number.isNaN(own.getTime())) return own;
  const origin = horizonStart ? new Date(horizonStart) : null;
  const minutes = finite(slot.start_min);
  if (!origin || Number.isNaN(origin.getTime()) || minutes === undefined) return undefined;
  return new Date(origin.getTime() + minutes * 60_000);
}

/** "Mon 19:00" in the user's locale (and zone), weekday and time only. */
function formatSlot(instant: Date, locale?: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", hour: "2-digit", minute: "2-digit" };
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(instant);
  } catch {
    // An unknown locale or zone: the browser's own.
    return new Intl.DateTimeFormat(undefined, options).format(instant);
  }
}

/**
 * What a plan would add: the task count and the first few tasks. A task the
 * solver placed shows its start (from `schedule`, `GET /drafts/{id}`) in the
 * user's locale — "Mon 19:00" — earliest first. A task it did not place, or
 * every task when `schedule` is null, shows its length instead: never a
 * made-up time. `locale`/`timeZone` default to the browser's.
 */
export function summarizeDraft(
  draft: Pick<DraftState, "tasks" | "horizon_start" | "schedule">,
  opts: { limit?: number; locale?: string; timeZone?: string } = {},
): DraftSummary {
  const limit = opts.limit ?? SUMMARY_LIMIT;
  const tasks = Array.isArray(draft.tasks) ? draft.tasks : [];
  const slots = draft.schedule?.schedule ?? {};
  const horizon = draft.schedule?.horizon_start ?? draft.horizon_start;

  const lines = tasks.map((task, order) => {
    const id = typeof task.task_id === "string" ? task.task_id : "";
    const slot = id ? slots[id] : undefined;
    const named = typeof task.title === "string" && task.title.trim() ? task.title.trim() : slot?.title?.trim();
    const title = named || "Untitled task";
    const start = slotStart(slot, horizon);
    if (start) {
      return { title, when: formatSlot(start, opts.locale, opts.timeZone), at: start.getTime(), order };
    }
    const minutes = finite(task.duration_minutes) ?? finite(slot?.duration_minutes);
    return { title, when: minutes !== undefined ? `${minutes} min` : "", at: undefined, order };
  });

  const timed = lines.some((l) => l.at !== undefined);
  if (timed) {
    // Placed tasks first, earliest first; the rest keep the plan's order.
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
  /**
   * Set only when the plan changed since it was read (409 `stale_version`): the
   * latest draft, to show in place of the old one — or null when the error did not
   * carry a readable one, so the banner re-reads it.
   */
  latest?: DraftState | null;
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

/** The latest draft a stale accept's 409 carries (`details.draft`), or null when it has none readable. */
function latestDraftOf(details: unknown): DraftState | null {
  const draft = (details as { draft?: unknown } | null | undefined)?.draft;
  if (!draft) return null;
  try {
    return parseDraftState(draft);
  } catch {
    return null;
  }
}

const PLAN_CHANGED = "This plan changed since you looked — here is the latest.";

/**
 * A failed accept or discard (an `ApiError`, read by shape — its status and code,
 * never its message's words):
 * - 409 `stale_version` (the plan changed since the user read it; nothing was
 *   written): the backend's words, and the latest plan in place of the old one.
 *   The banner stays open and nothing reads as success.
 * - 409 `invalid_state_transition` (already locked in, or closed): the
 *   backend's words, and the banner clears; after an accept the task list
 *   refreshes, in case it was locked in elsewhere.
 * - 409 `conflict` on accept (clashes with existing tasks): the plan stays open.
 * - 404: the plan is gone; the banner clears.
 * - Anything else (an outage): the plan stays, and nothing claims success.
 */
export function bannerErrorOutcome(err: unknown, action: "accept" | "discard"): BannerOutcome {
  const e = (err ?? {}) as { status?: unknown; code?: unknown; serverMessage?: unknown; details?: unknown };
  const serverMessage = typeof e.serverMessage === "string" && e.serverMessage ? e.serverMessage : undefined;
  if (e.status === 409 && e.code === "stale_version") {
    return {
      tone: "info",
      message: serverMessage ?? PLAN_CHANGED,
      clearBanner: false,
      refreshTasks: false,
      latest: latestDraftOf(e.details),
    };
  }
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
