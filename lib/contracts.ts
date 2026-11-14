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
  ConsentBehavior,
  ConsentOut,
  FocusProfile,
  HourFocus,
  MemoryOut,
  PatternShown,
  Provenance,
  Receipt,
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

/** `GET /you`. */
export function parseYouResponse(value: unknown): YouResponse {
  const where = "you";
  const o = obj(value, where);
  return {
    profile: parseYouProfile(o.profile, `${where}.profile`),
    patterns: list(o, "patterns", where, parsePattern),
    rules: list(o, "rules", where, parseRule),
    memories: list(o, "memories", where, parseMemoryOut),
    focus: parseFocus(o.focus, `${where}.focus`),
    receipt: parseReceipt(o.receipt, `${where}.receipt`),
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
