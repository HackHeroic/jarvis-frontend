/**
 * Pure helpers for what Jarvis learns, what an accept really did, and what a
 * list fetch really returned. No React, no fetch — unit-tested with Vitest.
 */

import { ContractError } from "./contracts";
import type { ConsentRequestEvent, MemoryExtractedEvent, PatternDetectedEvent } from "./types";

// ---------------------------------------------------------------------------
// Frames off the wire are untrusted: coerce, never assume
// ---------------------------------------------------------------------------

/** `Number(value)`, or undefined when that is NaN / not finite. */
function finiteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** A non-blank trimmed string, or undefined. */
function nonBlank(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** `String(value)` for scalars; '' for null, undefined, objects and arrays. */
function scalarString(value: unknown): string {
  if (value === null || value === undefined || typeof value === "object") return "";
  return String(value);
}

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

/**
 * Normalise a memory_extracted or pattern_detected frame into a LearningMoment.
 * Null unless the frame has non-blank string content (never a blank row).
 * Numbers are coerced with `Number`: a NaN confidence reads as 0, a NaN
 * occurrence count is left out.
 */
export function toLearningMoment(
  e: MemoryExtractedEvent | PatternDetectedEvent,
  kind: "memory" | "pattern",
): LearningMoment | null {
  const raw: Record<string, unknown> =
    e && typeof e === "object" ? (e as unknown as Record<string, unknown>) : {};
  const content = nonBlank(raw.content);
  if (!content) return null;
  const moment: LearningMoment = {
    kind,
    id: scalarString(raw.memory_id),
    content,
    provenance: kind === "memory" ? "said" : "inferred",
    confidence: finiteNumber(raw.confidence) ?? 0,
    action: scalarString(raw.action),
  };
  const occurrences = finiteNumber(raw.occurrence_count);
  if (occurrences !== undefined) moment.occurrences = occurrences;
  return moment;
}

/**
 * What one pattern_detected frame does: an inline moment always (when the frame
 * is usable), and a toast only when the pattern is strong and recurring. The
 * toast copy carries the coerced numbers, so it never re-reads raw fields.
 */
export function readPatternFrame(e: PatternDetectedEvent): {
  moment: LearningMoment | null;
  toast: PatternDetectedEvent | null;
} {
  const moment = toLearningMoment(e, "pattern");
  if (!moment) return { moment: null, toast: null };
  const occurrence_count = moment.occurrences ?? 0;
  const toast = shouldToast({ confidence: moment.confidence, occurrence_count })
    ? { ...e, content: moment.content, confidence: moment.confidence, occurrence_count }
    : null;
  return { moment, toast };
}

/**
 * A consent_request frame, or null when it has no usable reason (missing,
 * blank, or not a scalar). Fields are coerced with `String`; an unusable
 * module becomes ''.
 */
export function toConsentRequest(data: unknown): ConsentRequestEvent | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const reason = scalarString(raw.reason).trim();
  if (!reason) return null;
  return { reason, module: scalarString(raw.module) };
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
  return { ok: false, tone: "error", message: "That didn't save. Try again." };
}

// ---------------------------------------------------------------------------
// List state: an outage is never "nothing here"
// ---------------------------------------------------------------------------

export type ListState<T> =
  | { kind: "loading" }
  /** `headline` says what kind of failure; `message` is the detail under it. */
  | { kind: "error"; headline: string; message: string }
  | { kind: "empty" }
  | { kind: "ready"; items: T[] };

/** Shown when a list could not be fetched. */
export const LIST_ERROR_MESSAGE = "Can't reach Jarvis right now";
/** Shown when Jarvis answered, but in a shape this page can't read (a `ContractError`). */
export const SHAPE_ERROR_MESSAGE = "Jarvis answered in a shape this page doesn't understand";
const SHAPE_ERROR_DETAIL = "Refresh the page, or update the app.";

/** The backend's user-facing message (`ApiError.serverMessage`), if the error carries one. */
function userMessageOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const message = (error as { serverMessage?: unknown }).serverMessage;
  return typeof message === "string" && message ? message : undefined;
}

/** True when the backend answered (2xx) but the body did not match its documented shape. */
export function isShapeError(error: unknown): boolean {
  return error instanceof ContractError;
}

/**
 * How a failed read reads to the user. An outage: "Can't reach Jarvis right
 * now", with the backend's own message as detail. Shape drift is not an
 * outage — Jarvis answered — so it says the page doesn't understand the answer.
 */
export function describeError(error: unknown): { headline: string; detail?: string; shape: boolean } {
  if (isShapeError(error)) {
    return { headline: SHAPE_ERROR_MESSAGE, detail: SHAPE_ERROR_DETAIL, shape: true };
  }
  return { headline: LIST_ERROR_MESSAGE, detail: userMessageOf(error), shape: false };
}

/**
 * The state of a list fetch. An error wins over any items; no items and no
 * error yet is still loading; a 200 with `[]` is empty.
 */
export function toListState<T>(r: { items?: T[]; error?: unknown }): ListState<T> {
  if (r.error) {
    const { headline, detail } = describeError(r.error);
    return { kind: "error", headline, message: detail ?? headline };
  }
  if (!r.items) return { kind: "loading" };
  if (r.items.length === 0) return { kind: "empty" };
  return { kind: "ready", items: r.items };
}
