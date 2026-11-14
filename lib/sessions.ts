/**
 * Pure logic for chat sessions: what a conversation that would not open says, and
 * what the sidebar's list says about its last refresh. No React, no fetch.
 */

import { describeError } from "./learning";

export const CONVERSATION_GONE = "Could not load this conversation. It may have been deleted.";

export type ConversationLoadFailure =
  | { kind: "gone"; message: string }
  | { kind: "unreachable"; headline: string; detail?: string };

/**
 * Why a conversation would not open, told apart by status and code (never by the
 * message's words): 404 `not_found` (Jarvis-Engine app/api/v1/endpoints/sessions.py)
 * may mean it was deleted. Anything else — 503 `persistence_unavailable` (or
 * `database_unavailable`), a network failure, any other status — is an outage: "Can't
 * reach Jarvis right now", with the backend's words as detail and a Retry, and never
 * blames deletion.
 */
export function conversationLoadFailure(err: unknown): ConversationLoadFailure {
  const e = (err ?? {}) as { status?: unknown; code?: unknown };
  if (e.status === 404 || e.code === "not_found") return { kind: "gone", message: CONVERSATION_GONE };
  const { headline, detail } = describeError(err);
  return detail ? { kind: "unreachable", headline, detail } : { kind: "unreachable", headline };
}

export interface SessionsListNote {
  /** A quiet line over the list when the last refresh failed; null when it worked. */
  note: string | null;
  /** Show "No conversations yet": only for a list that loaded and is empty. */
  showEmpty: boolean;
}

/**
 * What the sidebar's list says. A failed refresh keeps the last list and says so;
 * a list that never loaded is not "no conversations yet".
 */
export function sessionsListNote(s: { loaded: boolean; refreshFailed: boolean; count: number }): SessionsListNote {
  if (s.refreshFailed && !s.loaded) return { note: "Couldn't load your conversations", showEmpty: false };
  if (s.refreshFailed) return { note: "Couldn't refresh — showing the last list", showEmpty: s.count === 0 };
  return { note: null, showEmpty: s.count === 0 };
}
