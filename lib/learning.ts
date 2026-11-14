/**
 * Pure helpers for what Jarvis learns, what an accept really did, and what a
 * list fetch really returned. No React, no fetch — unit-tested with Vitest.
 */

import type { MemoryExtractedEvent, PatternDetectedEvent } from "./types";

// ---------------------------------------------------------------------------
// Learning moments
// ---------------------------------------------------------------------------

/** A pattern earns the popup only once it is confident and has recurred. */
const TOAST_MIN_CONFIDENCE = 0.7;
const TOAST_MIN_OCCURRENCES = 3;

/** True when a detected pattern is strong enough to toast (it always shows inline). */
export function shouldToast(p: { confidence: number; occurrence_count: number }): boolean {
  return p.confidence >= TOAST_MIN_CONFIDENCE && p.occurrence_count >= TOAST_MIN_OCCURRENCES;
}

/** One thing Jarvis learned on a turn, shown inline under that turn's reply. */
export interface LearningMoment {
  kind: "memory" | "pattern";
  id: string;
  content: string;
  /** 'said': the user's own words. 'inferred': Jarvis noticed it from what happened. */
  provenance: "said" | "inferred";
  confidence: number;
  occurrences?: number;
  action: string;
}

/** Normalise a memory_extracted or pattern_detected frame into a LearningMoment. */
export function toLearningMoment(
  e: MemoryExtractedEvent | PatternDetectedEvent,
  kind: "memory" | "pattern",
): LearningMoment {
  const moment: LearningMoment = {
    kind,
    id: e.memory_id,
    content: e.content,
    provenance: kind === "memory" ? "said" : "inferred",
    confidence: e.confidence,
    action: e.action,
  };
  if ("occurrence_count" in e && typeof e.occurrence_count === "number") {
    moment.occurrences = e.occurrence_count;
  }
  return moment;
}

// ---------------------------------------------------------------------------
// Accept outcomes
// ---------------------------------------------------------------------------

export interface AcceptOutcome {
  ok: boolean;
  tone: "success" | "info" | "error";
  message: string;
}

/**
 * What an accept response really means. Only `accepted` with at least one task
 * saved is a success; `empty` keeps the draft open; anything else is an error.
 */
export function describeAcceptOutcome(res: { status?: string; task_count?: number }): AcceptOutcome {
  const count = typeof res.task_count === "number" ? res.task_count : 0;
  if (res.status === "accepted" && count > 0) {
    return {
      ok: true,
      tone: "success",
      message: `Schedule saved — ${count} ${count === 1 ? "task" : "tasks"}.`,
    };
  }
  if (res.status === "empty") {
    return { ok: false, tone: "info", message: "Nothing in this plan could be scheduled." };
  }
  return { ok: false, tone: "error", message: "Failed to save schedule. Try again." };
}

// ---------------------------------------------------------------------------
// List state: an outage is never "nothing here"
// ---------------------------------------------------------------------------

export type ListState<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "ready"; items: T[] };

/** Shown when a list could not be fetched. */
export const LIST_ERROR_MESSAGE = "Can't reach Jarvis right now";

/** The backend's user-facing message (`ApiError.serverMessage`), if the error carries one. */
function userMessageOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const message = (error as { serverMessage?: unknown }).serverMessage;
  return typeof message === "string" && message ? message : undefined;
}

/**
 * The state of a list fetch. An error wins over any items; no items and no
 * error yet is still loading; a 200 with `[]` is empty.
 */
export function toListState<T>(r: { items?: T[]; error?: unknown }): ListState<T> {
  if (r.error) return { kind: "error", message: userMessageOf(r.error) ?? LIST_ERROR_MESSAGE };
  if (!r.items) return { kind: "loading" };
  if (r.items.length === 0) return { kind: "empty" };
  return { kind: "ready", items: r.items };
}
