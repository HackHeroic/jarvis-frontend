/**
 * Strict readers for the backend's JSON responses (the You page, the memories
 * API and the suggestions API). Each checks the field names and types the UI
 * relies on and throws `ContractError` on any drift, so a renamed field fails
 * loudly (and in lib/__tests__/contracts.test.ts) instead of rendering blanks.
 * Extra fields are ignored. Pure: no fetch, no React.
 */

import type {
  AcceptSuggestionResponse,
  ActionResultOut,
  AutonomyMode,
  CheckInReviewed,
  ConsentBehavior,
  ConsentOut,
  DraftScheduleView,
  DraftSlot,
  DraftState,
  DraftStatus,
  FocusProfile,
  HourFocus,
  MemoryOut,
  PatternShown,
  Provenance,
  Receipt,
  RuleCheckIn,
  RuleCheckInList,
  RuleShown,
  RunTriggerResponse,
  SuggestionOut,
  YouProfile,
  YouResponse,
} from "./types";

/** A response that does not match the shape the backend documents. */
export class ContractError extends Error {
  constructor(where: string, expected: string) {
    super(`Unexpected response: ${where} should be ${expected}`);
    this.name = "ContractError";
  }
}

type Obj = Record<string, unknown>;

function obj(value: unknown, where: string): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(where, "an object");
  }
  return value as Obj;
}

function str(o: Obj, key: string, where: string): string {
  const value = o[key];
  if (typeof value !== "string") throw new ContractError(`${where}.${key}`, "a string");
  return value;
}

function strOrNull(o: Obj, key: string, where: string): string | null {
  if (o[key] === null) return null;
  return str(o, key, where);
}

function num(o: Obj, key: string, where: string): number {
  const value = o[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ContractError(`${where}.${key}`, "a number");
  }
  return value;
}

function numOrNull(o: Obj, key: string, where: string): number | null {
  if (o[key] === null) return null;
  return num(o, key, where);
}

function bool(o: Obj, key: string, where: string): boolean {
  const value = o[key];
  if (typeof value !== "boolean") throw new ContractError(`${where}.${key}`, "a boolean");
  return value;
}

function oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], where: string): T {
  const value = o[key];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new ContractError(`${where}.${key}`, `one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function list<T>(o: Obj, key: string, where: string, item: (value: unknown, where: string) => T): T[] {
  const value = o[key];
  if (!Array.isArray(value)) throw new ContractError(`${where}.${key}`, "a list");
  return value.map((entry, i) => item(entry, `${where}.${key}[${i}]`));
}

const PROVENANCES: readonly Provenance[] = ["said", "inferred"];
const AUTONOMY_MODES: readonly AutonomyMode[] = ["suggest_only", "ask_first", "auto_low_risk"];
const CONSENT_BEHAVIORS: readonly ConsentBehavior[] = ["allow", "ask", "deny"];
const RUN_STATUSES: readonly RunTriggerResponse["status"][] = [
  "created",
  "already_done",
  "not_due",
  "nothing_to_say",
  "denied",
];
const HOURS_PER_DAY = 24;

// ---------------------------------------------------------------------------
// Memories
// ---------------------------------------------------------------------------

export function parseMemoryOut(value: unknown, where = "memory"): MemoryOut {
  const o = obj(value, where);
  return {
    memory_id: str(o, "memory_id", where),
    memory_type: str(o, "memory_type", where),
    content: str(o, "content", where),
    confidence: num(o, "confidence", where),
    provenance: oneOf(o, "provenance", PROVENANCES, where),
    freshness: num(o, "freshness", where),
    noted_at: str(o, "noted_at", where),
    last_confirmed_at: strOrNull(o, "last_confirmed_at", where),
    observation_count: num(o, "observation_count", where),
    pattern_key: strOrNull(o, "pattern_key", where),
  };
}

/** `GET /memories/` → `{memories, count}`. */
export function parseMemoryList(value: unknown): MemoryOut[] {
  return list(obj(value, "memories response"), "memories", "memories response", parseMemoryOut);
}

// ---------------------------------------------------------------------------
// The You page
// ---------------------------------------------------------------------------

export function parseYouProfile(value: unknown, where = "profile"): YouProfile {
  const o = obj(value, where);
  return {
    display_name: strOrNull(o, "display_name", where),
    timezone: str(o, "timezone", where),
    wake_time: str(o, "wake_time", where),
    autonomy_mode: oneOf(o, "autonomy_mode", AUTONOMY_MODES, where),
  };
}

function parsePattern(value: unknown, where: string): PatternShown {
  const o = obj(value, where);
  return {
    memory_id: strOrNull(o, "memory_id", where),
    pattern_key: str(o, "pattern_key", where),
    detector: str(o, "detector", where),
    description: str(o, "description", where),
    confidence: num(o, "confidence", where),
    occurrences: num(o, "occurrences", where),
    evidence: list(o, "evidence", where, (line, at) => {
      if (typeof line !== "string") throw new ContractError(at, "a string");
      return line;
    }),
    confirmed: bool(o, "confirmed", where),
  };
}

function parseRule(value: unknown, where: string): RuleShown {
  const o = obj(value, where);
  return {
    id: str(o, "id", where),
    text: str(o, "text", where),
    provenance: oneOf(o, "provenance", PROVENANCES, where),
    created_at: strOrNull(o, "created_at", where),
  };
}

function parseHour(value: unknown, where: string): HourFocus {
  const o = obj(value, where);
  return {
    hour: num(o, "hour", where),
    score: num(o, "score", where),
    done: num(o, "done", where),
    not_done: num(o, "not_done", where),
  };
}

function parseFocus(value: unknown, where: string): FocusProfile {
  const o = obj(value, where);
  const hours = list(o, "hours", where, parseHour);
  if (hours.length !== HOURS_PER_DAY || hours.some((h, i) => h.hour !== i)) {
    throw new ContractError(`${where}.hours`, "24 entries, hour 0 to 23 in order");
  }
  return {
    source: oneOf(o, "source", ["prior", "learned"] as const, where),
    observations: num(o, "observations", where),
    hours,
  };
}

function parseReceipt(value: unknown, where: string): Receipt {
  const o = obj(value, where);
  return {
    since: str(o, "since", where),
    truncated: bool(o, "truncated", where),
    on_device_calls: num(o, "on_device_calls", where),
    cloud_calls: num(o, "cloud_calls", where),
    pii_redactions: num(o, "pii_redactions", where),
    input_tokens: num(o, "input_tokens", where),
    output_tokens: num(o, "output_tokens", where),
  };
}

/**
 * One card per `pattern_key`, the first of each, in order. The key is the
 * pattern's identity: the You page keys its cards by it and removes by it, and
 * the dashboard's Patterns tile counts this same list, so the two cannot differ.
 */
function onePerKey(patterns: PatternShown[]): PatternShown[] {
  const seen = new Set<string>();
  return patterns.filter((p) => {
    if (seen.has(p.pattern_key)) return false;
    seen.add(p.pattern_key);
    return true;
  });
}

/**
 * `streak_days`: a non-negative integer when sent. A backend that does not send
 * it yet leaves it undefined — unknown, never 0.
 */
function streakDays(o: Obj, where: string): number | undefined {
  if (o.streak_days === undefined) return undefined;
  const value = num(o, "streak_days", where);
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(`${where}.streak_days`, "a non-negative integer");
  }
  return value;
}

/** `GET /you`. */
export function parseYouResponse(value: unknown): YouResponse {
  const where = "you";
  const o = obj(value, where);
  const streak = streakDays(o, where);
  return {
    profile: parseYouProfile(o.profile, `${where}.profile`),
    patterns: onePerKey(list(o, "patterns", where, parsePattern)),
    rules: list(o, "rules", where, parseRule),
    memories: list(o, "memories", where, parseMemoryOut),
    focus: parseFocus(o.focus, `${where}.focus`),
    receipt: parseReceipt(o.receipt, `${where}.receipt`),
    ...(streak === undefined ? {} : { streak_days: streak }),
  };
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export function parseSuggestion(value: unknown, where = "suggestion"): SuggestionOut {
  const o = obj(value, where);
  return {
    id: str(o, "id", where),
    trigger: str(o, "trigger", where),
    kind: str(o, "kind", where),
    title: str(o, "title", where),
    body: str(o, "body", where),
    status: str(o, "status", where),
    consent_behavior: oneOf(o, "consent_behavior", CONSENT_BEHAVIORS, where),
    consent_kind: strOrNull(o, "consent_kind", where),
    consent_reason: str(o, "consent_reason", where),
    created_at: str(o, "created_at", where),
    expires_at: strOrNull(o, "expires_at", where),
    details: obj(o.details, `${where}.details`),
  };
}

/** `GET /anticipation/suggestions` → `{suggestions}`. */
export function parseSuggestionList(value: unknown): SuggestionOut[] {
  return list(obj(value, "suggestions response"), "suggestions", "suggestions response", parseSuggestion);
}

function parseActionResult(value: unknown, where: string): ActionResultOut {
  const o = obj(value, where);
  return {
    kind: str(o, "kind", where),
    message: str(o, "message", where),
    tasks_written: numOrNull(o, "tasks_written", where),
    draft_id: strOrNull(o, "draft_id", where),
  };
}

/** `POST /anticipation/suggestions/{id}/accept` → `{suggestion, result}`. */
export function parseAcceptResponse(value: unknown): AcceptSuggestionResponse {
  const where = "accept response";
  const o = obj(value, where);
  return {
    suggestion: parseSuggestion(o.suggestion, `${where}.suggestion`),
    result: parseActionResult(o.result, `${where}.result`),
  };
}

function parseConsent(value: unknown, where: string): ConsentOut {
  const o = obj(value, where);
  return {
    behavior: oneOf(o, "behavior", CONSENT_BEHAVIORS, where),
    kind: str(o, "kind", where),
    message: str(o, "message", where),
  };
}

/** `POST /anticipation/run` → `{status, suggestion, consent}`. */
export function parseRunTriggerResponse(value: unknown): RunTriggerResponse {
  const where = "run response";
  const o = obj(value, where);
  return {
    status: oneOf(o, "status", RUN_STATUSES, where),
    suggestion: o.suggestion === null ? null : parseSuggestion(o.suggestion, `${where}.suggestion`),
    consent: o.consent === null ? null : parseConsent(o.consent, `${where}.consent`),
  };
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

function parseSlot(value: unknown, where: string): DraftSlot {
  const o = obj(value, where);
  return {
    task_id: str(o, "task_id", where),
    title: o.title === undefined ? null : strOrNull(o, "title", where),
    start_min: num(o, "start_min", where),
    end_min: num(o, "end_min", where),
    start: str(o, "start", where),
    end: str(o, "end", where),
    duration_minutes: num(o, "duration_minutes", where),
  };
}

function parseScheduleView(value: unknown, where: string): DraftScheduleView {
  const o = obj(value, where);
  const slots = obj(o.schedule, `${where}.schedule`);
  return {
    horizon_start: str(o, "horizon_start", where),
    schedule: Object.fromEntries(
      Object.entries(slots).map(([id, slot]) => [id, parseSlot(slot, `${where}.schedule.${id}`)]),
    ),
  };
}

/**
 * The chat `complete` frame's `draft_version` (Jarvis-Engine app/schemas/chat_stream.py
 * `ChatCompletePayload`): the handed-over draft's version, as `GET /drafts/{id}` reports
 * it, sent only with `draft_id`. Absent (or null): undefined. Anything but a non-empty
 * string is drift and throws — the review card must never accept a plan it cannot name.
 */
export function parseCompleteDraftVersion(frame: unknown): string | undefined {
  const where = "complete";
  const o = obj(frame, where);
  if (o.draft_version === undefined || o.draft_version === null) return undefined;
  const version = str(o, "draft_version", where);
  if (!version) throw new ContractError(`${where}.draft_version`, "a non-empty string");
  return version;
}

/**
 * `GET /drafts/{id}` (`DraftStateResponse`), with `schedule` null or its solved
 * slots, and the `version` the read saw (required: the accept sends it back).
 * Also the `draft` a stale accept's 409 carries in its details.
 */
export function parseDraftState(value: unknown): DraftState {
  const where = "draft";
  const o = obj(value, where);
  const version = str(o, "version", where);
  if (!version) throw new ContractError(`${where}.version`, "a non-empty string");
  const optional = (key: string) => (o[key] === undefined ? null : strOrNull(o, key, where));
  return {
    draft_id: str(o, "draft_id", where),
    user_id: str(o, "user_id", where),
    goal_id: optional("goal_id"),
    tasks: list(o, "tasks", where, (task, at) => obj(task, at)),
    horizon_start: optional("horizon_start"),
    status: str(o, "status", where) as DraftStatus,
    rejection_reason: optional("rejection_reason"),
    created_at: optional("created_at"),
    schedule:
      o.schedule === null || o.schedule === undefined
        ? null
        : parseScheduleView(o.schedule, `${where}.schedule`),
    version,
  };
}

// ---------------------------------------------------------------------------
// Habits: check-ins on the user's rules
// ---------------------------------------------------------------------------

/** A day on the user's clock, as the backend sends a `date`. */
function day(o: Obj, key: string, where: string): string {
  const value = str(o, key, where);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ContractError(`${where}.${key}`, "a YYYY-MM-DD day");
  return value;
}

function parseRuleCheckIn(value: unknown, where: string): RuleCheckIn {
  const o = obj(value, where);
  return {
    id: str(o, "id", where),
    constraint_id: str(o, "constraint_id", where),
    rule_text: str(o, "rule_text", where),
    source: oneOf(o, "source", PROVENANCES, where),
    learned_at: strOrNull(o, "learned_at", where),
    last_reviewed_at: strOrNull(o, "last_reviewed_at", where),
    next_due_on: day(o, "next_due_on", where),
    interval_days: num(o, "interval_days", where),
  };
}

/** `GET /habits/tracker/due` (`RuleCheckInList` in app/schemas/habits.py). */
export function parseRuleCheckInList(value: unknown): RuleCheckInList {
  const where = "check_ins";
  const o = obj(value, where);
  return {
    timezone: str(o, "timezone", where),
    today: day(o, "today", where),
    due_trackers: list(o, "due_trackers", where, parseRuleCheckIn),
    upcoming_trackers: list(o, "upcoming_trackers", where, parseRuleCheckIn),
  };
}

/** `POST /habits/tracker/{id}/complete` (`CheckInReviewed` in app/schemas/habits.py). */
export function parseCheckInReviewed(value: unknown): CheckInReviewed {
  const where = "check_in";
  const o = obj(value, where);
  return {
    next_review_date: str(o, "next_review_date", where),
    next_interval_days: num(o, "next_interval_days", where),
    next_due_on: day(o, "next_due_on", where),
  };
}
