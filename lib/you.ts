/**
 * Pure helpers for the You page and the "While you were away" panel: how a
 * memory's age, its source, the privacy receipt, the focus profile and an
 * accepted suggestion read. No React, no fetch — unit-tested with Vitest.
 */

import type {
  ActionResultOut,
  AutonomyMode,
  ChatResponse,
  DraftState,
  FocusProfile,
  HourFocus,
  Provenance,
  Receipt,
  RunTriggerResponse,
  SuggestionOut,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Memories: how old, and whose words
// ---------------------------------------------------------------------------

/** The calendar day of `d` on the clock of `timeZone` (the browser's when unset), as a day number. */
function localDayNumber(d: Date, timeZone?: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
  } catch {
    // An unknown zone name: fall back to the browser's own clock.
    return localDayNumber(d, undefined);
  }
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY_MS;
}

/**
 * How long ago a memory was noted, in calendar days on the user's clock
 * (`timeZone`, e.g. the profile's; the browser's when unset): "noted today",
 * "noted yesterday", "noted 12 days ago". An unreadable stamp gives "".
 */
export function freshnessLabel(notedAt: string, now: Date, timeZone?: string): string {
  const noted = new Date(notedAt);
  if (Number.isNaN(noted.getTime())) return "";
  const days = Math.max(0, localDayNumber(now, timeZone) - localDayNumber(noted, timeZone));
  if (days === 0) return "noted today";
  if (days === 1) return "noted yesterday";
  return `noted ${days} days ago`;
}

/** Whose words a memory or rule is: the user's, or Jarvis's reading of what happened. */
export function provenanceLabel(p: Provenance): string {
  return p === "said" ? "you said" : "I noticed";
}

/**
 * The memories split by whose words they are: "What you told me" (said) and "What I
 * noticed" (inferred), each in the order given. A memory with any other provenance is
 * not the user's own words, so it is listed as noticed.
 */
export function groupMemories<T extends { provenance: Provenance }>(memories: T[]): { said: T[]; noticed: T[] } {
  const said: T[] = [];
  const noticed: T[] = [];
  for (const memory of memories) (memory.provenance === "said" ? said : noticed).push(memory);
  return { said, noticed };
}

/** The most a memory may say: the backend's limit on an edit (`MemoryEdit.content`). */
export const MEMORY_MAX_CHARS = 2000;

/**
 * Whether an edited memory can be saved, and if not, why (shown under the input).
 * Words that are unchanged (spacing aside) cannot be saved, without a reason: there is
 * nothing to save. Blank and too long have a reason.
 */
export function memoryEditCheck(draft: string, original: string): { canSave: boolean; problem: string | null } {
  const words = draft.trim();
  if (!words) return { canSave: false, problem: "A memory needs at least one word." };
  if (words.length > MEMORY_MAX_CHARS) {
    return {
      canSave: false,
      problem: `That's too long — keep it under ${MEMORY_MAX_CHARS.toLocaleString("en-US")} characters.`,
    };
  }
  return { canSave: words !== original.trim(), problem: null };
}

// ---------------------------------------------------------------------------
// Privacy receipt
// ---------------------------------------------------------------------------

/**
 * "12 on this device · 3 sent to the cloud · 1 redaction". Never a vendor name.
 * When the store stopped at its read bound (`truncated`), every count is "at least".
 */
export function receiptLine(r: Receipt): string {
  const atLeast = r.truncated ? "at least " : "";
  const redactions = r.pii_redactions === 1 ? "redaction" : "redactions";
  return [
    `${atLeast}${r.on_device_calls} on this device`,
    `${atLeast}${r.cloud_calls} sent to the cloud`,
    `${atLeast}${r.pii_redactions} ${redactions}`,
  ].join(" · ");
}

/** The window the receipt covers, from its `since`: "in the last 30 days". "" when unreadable. */
export function receiptWindow(since: string, now: Date): string {
  const start = new Date(since);
  if (Number.isNaN(start.getTime())) return "";
  const days = Math.max(1, Math.round((now.getTime() - start.getTime()) / DAY_MS));
  return days === 1 ? "in the last day" : `in the last ${days} days`;
}

// ---------------------------------------------------------------------------
// Focus profile
// ---------------------------------------------------------------------------

/** The chart's caption. The prior is a starting assumption and never reads as learned. */
export function focusCaption(f: FocusProfile): string {
  if (f.source === "learned") {
    return `Learned from ${f.observations} ${f.observations === 1 ? "outcome" : "outcomes"}`;
  }
  return "Not enough history yet — this is a starting guess";
}

/** A local hour as the user reads it: 0 → "12 AM", 9 → "9 AM", 13 → "1 PM". */
export function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
}

/** True when an hour has outcomes behind it; without any, its bar is the starting assumption. */
export function hourIsObserved(h: HourFocus): boolean {
  return h.done + h.not_done > 0;
}

/**
 * The hour to call "your strongest hour": the best-scoring hour with outcomes
 * behind it (a tie goes to the one with more), only on a learned profile. Null on
 * the prior, or when no hour has outcomes — an assumption is never "yours".
 */
export function strongestObservedHour(f: FocusProfile): HourFocus | null {
  if (f.source !== "learned") return null;
  let best: HourFocus | null = null;
  for (const h of f.hours) {
    if (!hourIsObserved(h)) continue;
    const seen = h.done + h.not_done;
    if (
      !best ||
      h.score > best.score ||
      (h.score === best.score && seen > best.done + best.not_done)
    ) {
      best = h;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Autonomy mode
// ---------------------------------------------------------------------------

/**
 * The three modes, in plain words that match what the consent chain does with each.
 * `note` is an honest caveat shown under the option.
 */
export const AUTONOMY_OPTIONS: {
  value: AutonomyMode;
  label: string;
  description: string;
  note?: string;
}[] = [
  {
    value: "suggest_only",
    label: "Only suggest",
    description: "Jarvis tells you what it would change. Nothing moves until you accept.",
  },
  {
    value: "ask_first",
    label: "Ask first",
    description: "Jarvis asks before anything that changes your schedule.",
  },
  {
    value: "auto_low_risk",
    label: "Small changes on its own",
    description: "Jarvis makes small, low-risk changes by itself and asks before anything bigger.",
    // The backend has no low-risk actions yet, so the consent chain asks first.
    note: "Nothing counts as a small change yet, so this behaves like Ask first for now.",
  },
];

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

/**
 * What an accepted suggestion did, for the toast. Tasks written: "4 tasks are
 * on today's plan." Otherwise (a draft proposed, an insight noted, or nothing
 * written) the backend's own message.
 */
export function acceptResultMessage(r: ActionResultOut): string {
  const written = r.tasks_written ?? 0;
  if (written > 0) {
    return written === 1 ? "1 task is on today's plan." : `${written} tasks are on today's plan.`;
  }
  return r.message;
}

/** One line of a suggestion's body; `noticed` marks an "I noticed …" line (a learning note). */
export interface BriefLine {
  text: string;
  noticed: boolean;
}

/** A suggestion body (the brief arrives with "\n" between lines), one entry per non-blank line. */
export function briefLines(body: string): BriefLine[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text, noticed: /^I noticed\b/i.test(text) }));
}

/** A quiet line under the "While you were away" header; `consent` says why Jarvis held off. */
export interface PanelNote {
  text: string;
  detail?: string;
  tone: "quiet" | "consent";
}

export interface CheckNowOutcome {
  /** A suggestion waiting for the user, to show as a card (if it is not already). */
  card: SuggestionOut | null;
  note: PanelNote | null;
  /** The run changed the plan on its own: re-read the tasks. */
  tasksChanged: boolean;
}

const NOTHING_NEEDED = "Nothing needs your attention right now.";

/**
 * What a "Check now" run of the morning brief (`POST /anticipation/run`) says,
 * honestly: a new card; "already here"; nothing to say; or, when consent said no,
 * the consent rule's own words for why Jarvis held off.
 */
export function checkNowOutcome(r: RunTriggerResponse): CheckNowOutcome {
  const waiting = r.suggestion?.status === "pending" ? r.suggestion : null;
  switch (r.status) {
    case "created":
      if (waiting) return { card: waiting, note: null, tasksChanged: false };
      if (r.suggestion) {
        return {
          card: null,
          note: { text: `Done on its own: ${r.suggestion.title}.`, tone: "quiet" },
          tasksChanged: true,
        };
      }
      return { card: null, note: { text: NOTHING_NEEDED, tone: "quiet" }, tasksChanged: false };
    case "already_done":
      return {
        card: waiting,
        note: { text: "Today's brief is already here.", tone: "quiet" },
        tasksChanged: false,
      };
    case "denied": {
      const why = r.consent?.message?.trim();
      return {
        card: null,
        note: why ? { text: "I held off.", detail: why, tone: "consent" } : { text: "I held off.", tone: "consent" },
        tasksChanged: false,
      };
    }
    default: // nothing_to_say, not_due
      return { card: null, note: { text: NOTHING_NEEDED, tone: "quiet" }, tasksChanged: false };
  }
}

/** The suggestion kind (the trigger's name) whose accept can draft a plan for review. */
const PATTERN_RULE_KIND = "pattern_rule";

/**
 * The draft an accept leaves for the user to review, or null. Only a
 * pattern-rule accept does (it saves the rule, then drafts a plan that keeps
 * the hour free). Decided by the suggestion's kind, never by `draft_id` alone:
 * the morning brief's accept also returns its draft_id, already applied —
 * tasks written always win.
 */
export function draftAwaitingReview(s: SuggestionOut, r: ActionResultOut): string | null {
  if (s.kind !== PATTERN_RULE_KIND) return null;
  if ((r.tasks_written ?? 0) > 0) return null;
  return r.draft_id || null;
}

const OPEN_DRAFT_STATUSES: ReadonlySet<string> = new Set(["pending", "modified"]);

/**
 * An open draft (`GET /drafts/{id}`) as the draft response the dashboard's
 * "pending schedule" banner reads, carrying the backend's own words. Null for a
 * closed draft (accepted, rejected, expired, superseded): nothing to review.
 */
export function draftToChatResponse(draft: DraftState, message: string): ChatResponse | null {
  if (typeof draft?.draft_id !== "string" || !OPEN_DRAFT_STATUSES.has(draft.status)) return null;
  return {
    intent: "PLAN_DAY",
    message,
    draft_id: draft.draft_id,
    schedule_status: "draft",
    draft_source: "suggestion",
  };
}

// ---------------------------------------------------------------------------
// Optimistic edits and double-click guards
// ---------------------------------------------------------------------------

/**
 * Roll back an optimistic removal: `item` back at `index` (or the end), unless
 * an item with its key is already there (a refetch brought it back).
 */
export function reinsert<T>(items: T[], item: T, index: number, key: (t: T) => string): T[] {
  if (items.some((t) => key(t) === key(item))) return items;
  const at = Math.min(Math.max(index, 0), items.length);
  return [...items.slice(0, at), item, ...items.slice(at)];
}

/**
 * One request per key at a time. `run` returns null, and does not call `fn`,
 * while a run with the same key is in flight — a double-click fires once.
 * Checked synchronously, so it holds before React re-renders a disabled button.
 */
export function createSingleFlight() {
  const inFlight = new Set<string>();
  return {
    run<T>(key: string, fn: () => Promise<T>): Promise<T> | null {
      if (inFlight.has(key)) return null;
      inFlight.add(key);
      let pending: Promise<T>;
      try {
        pending = fn();
      } catch (err) {
        pending = Promise.reject(err);
      }
      return pending.finally(() => inFlight.delete(key));
    },
    busy(key: string): boolean {
      return inFlight.has(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Errors from lib/api.ts (`ApiError`), read without importing it
// ---------------------------------------------------------------------------

/** The HTTP status an `ApiError` carries, if any. */
export function statusOf(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/** The backend's user-facing message (`ApiError.serverMessage`), else `fallback`. */
export function errorMessageOf(err: unknown, fallback: string): string {
  const message = (err as { serverMessage?: unknown } | null)?.serverMessage;
  return typeof message === "string" && message ? message : fallback;
}

/**
 * Remove `item` at once, then run `request`. On failure the item is put back
 * where it was and the error returned — unless `isGone(err)` says it is gone
 * anyway (e.g. a 404), which counts as done. Resolves null when done.
 */
export async function removeWithRollback<T>(opts: {
  item: T;
  index: number;
  key: (t: T) => string;
  setItems: (update: (items: T[]) => T[]) => void;
  request: () => Promise<unknown>;
  isGone?: (err: unknown) => boolean;
}): Promise<unknown | null> {
  const { item, index, key, setItems, request, isGone } = opts;
  const id = key(item);
  setItems((items) => items.filter((t) => key(t) !== id));
  try {
    await request();
    return null;
  } catch (err) {
    if (isGone?.(err)) return null;
    setItems((items) => reinsert(items, item, index, key));
    return err;
  }
}
