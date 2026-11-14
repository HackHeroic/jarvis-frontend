/**
 * Pure logic for the chat review card: which card is live (only the latest open
 * draft's), accept or discard the plan it shows — by the version its turn handed over
 * (the `complete` frame's `draft_version`) — and redraw it on the latest draft when
 * that plan changed since. A failed accept or discard reads exactly as the dashboard
 * banner reads it (`bannerErrorOutcome`, lib/draftBanner.ts). No React; the requests
 * come in as arguments.
 */

import { bannerAcceptOutcome, bannerDiscardOutcome, bannerErrorOutcome, isOpenDraft } from "./draftBanner";
import { noDraftToAccept } from "./learning";
import type { ChatResponse, DraftState, JarvisMessage, TaskSchedule } from "./types";

export interface CardAcceptDeps {
  /** `POST /drafts/{id}/accept` with the version the card shows (lib/api.ts `acceptDraft`). */
  accept: (draftId: string, expectedVersion?: string) => Promise<{ status: string; draft_id?: string; task_count?: number }>;
  /** `GET /drafts/{id}` (lib/api.ts `getDraftById`), for a stale accept whose error carried no readable draft. */
  reread: (draftId: string) => Promise<DraftState>;
}

export interface CardAcceptOutcome {
  tone: "success" | "info" | "error";
  message: string;
  /** Tasks saved: the plan is locked in. */
  accepted: boolean;
  /** The plan is settled or gone: the chat drops its draft. */
  clearDraft: boolean;
  refreshTasks: boolean;
  /**
   * Set only when the plan changed since the card was drawn (409 `stale_version`) and
   * the latest could be read: the draft to redraw the card on. The card stays open.
   */
  latest?: DraftState;
}

/** The draft a card shows: its turn's `draft_id` (older payloads carried it on the schedule). */
export function cardDraftId(card: Pick<ChatResponse, "draft_id" | "schedule">): string | undefined {
  return card.draft_id || card.schedule?.draft_id || undefined;
}

/**
 * The card's identity: its draft id, else (a plan the turn could not store) its
 * turn's message id. Keys the remembered outcomes and the one in-flight guard that
 * Accept and Discard share.
 */
export function draftKey(card: Pick<ChatResponse, "draft_id" | "schedule" | "message_id">): string | undefined {
  return cardDraftId(card) ?? (card.message_id || undefined);
}

// ---------------------------------------------------------------------------
// Which card is live
// ---------------------------------------------------------------------------

/** How a draft the chat held was settled: locked in, discarded, or closed or gone on the backend. */
export type DraftOutcome = "accepted" | "discarded" | "closed";

export type DraftCardState =
  /** The latest open draft's card: Accept and Discard work. `busy`: the request in flight. */
  | { kind: "active"; busy: "accept" | "discard" | null }
  /** Any other card: the plan shows, read-only, with a quiet note why. */
  | { kind: "read-only"; note: string };

const OUTCOME_NOTE: Record<DraftOutcome, string> = {
  accepted: "Accepted — it's on your schedule",
  discarded: "Discarded — nothing was added",
  closed: "This plan is closed",
};

/**
 * Which card is live, from the state — never from message order: only the card
 * whose draft id and version are the open draft's (`current`, the chat's draft) has
 * working buttons. A draft accepted or discarded makes every card for it read-only
 * with its outcome; while another plan is open, the rest say a newer plan replaced
 * them; with none open, they are no longer up for review.
 */
export function draftCardState(
  card: ChatResponse,
  s: {
    current: ChatResponse | null;
    settled: Readonly<Record<string, DraftOutcome>>;
    busy?: "accept" | "discard" | null;
  },
): DraftCardState {
  const key = draftKey(card);
  const outcome = key ? s.settled[key] : undefined;
  if (outcome) return { kind: "read-only", note: OUTCOME_NOTE[outcome] };
  if (s.current) {
    const live = key !== undefined && key === draftKey(s.current) && card.draft_version === s.current.draft_version;
    return live ? { kind: "active", busy: s.busy ?? null } : { kind: "read-only", note: "A newer plan replaced this one" };
  }
  return { kind: "read-only", note: "This plan is no longer up for review" };
}

const KEPT_OUTCOMES = 50;
const OUTCOMES: readonly DraftOutcome[] = ["accepted", "discarded", "closed"];

/** `settled` with `key`'s outcome recorded as the newest; only the newest `keep` are kept. */
export function recordDraftOutcome(
  settled: Readonly<Record<string, DraftOutcome>>,
  key: string,
  outcome: DraftOutcome,
  keep: number = KEPT_OUTCOMES,
): Record<string, DraftOutcome> {
  const entries = Object.entries(settled).filter(([k]) => k !== key);
  entries.push([key, outcome]);
  return Object.fromEntries(entries.slice(-keep));
}

/** The remembered outcomes as stored (anything may be there): only the entries it understands. */
export function readSettledDrafts(value: unknown): Record<string, DraftOutcome> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, DraftOutcome] =>
      (OUTCOMES as readonly unknown[]).includes(entry[1]),
    ),
  );
}

/**
 * Accept the plan the card shows. Only `accepted` with tasks saved is a success. A
 * 409 `stale_version` (nothing written) gives the backend's words and the latest draft
 * — from the error, else re-read — to show in place of the old one; the card stays
 * open and nothing reads as success. A latest draft already closed (locked in
 * elsewhere) clears the card's draft, as the banner does.
 */
export async function acceptFromCard(card: ChatResponse, deps: CardAcceptDeps): Promise<CardAcceptOutcome> {
  const draftId = cardDraftId(card);
  if (!draftId) {
    // The turn could not store this plan for review: nothing to accept, no request.
    const outcome = noDraftToAccept();
    return { tone: outcome.tone, message: outcome.message, accepted: false, clearDraft: false, refreshTasks: false };
  }
  try {
    const outcome = bannerAcceptOutcome(await deps.accept(draftId, card.draft_version));
    return {
      tone: outcome.tone,
      message: outcome.message,
      accepted: outcome.clearBanner,
      clearDraft: outcome.clearBanner,
      refreshTasks: outcome.refreshTasks,
    };
  } catch (err) {
    const outcome = bannerErrorOutcome(err, "accept");
    const settled: CardAcceptOutcome = {
      tone: outcome.tone,
      message: outcome.message,
      accepted: false,
      clearDraft: outcome.clearBanner,
      refreshTasks: outcome.refreshTasks,
    };
    if (outcome.latest === undefined) return settled;
    // The plan changed since the card was drawn: show the latest, never success.
    const latest = outcome.latest ?? (await deps.reread(draftId).catch(() => null));
    if (!latest) return settled; // unreadable now: the card stays as it was, and open
    if (!isOpenDraft(latest)) return { ...settled, clearDraft: true, refreshTasks: true };
    return { ...settled, latest };
  }
}

export interface CardDiscardDeps {
  /** `POST /drafts/{id}/reject` (lib/api.ts `rejectDraft`). */
  reject: (draftId: string, components: string[]) => Promise<unknown>;
}

export interface CardDiscardOutcome {
  tone: "success" | "info" | "error";
  message: string;
  /** The plan is discarded, closed or gone: the chat drops its draft. */
  clearDraft: boolean;
  /** What to remember for every card of this draft; absent when it stays open. */
  settled?: DraftOutcome;
}

/**
 * Discard the plan the card shows, read as the banner reads a discard: done, or
 * 409/404 (already closed, or gone) — the draft clears; an outage keeps it open and
 * says so. A plan the turn could not store has nothing to discard: no request.
 */
export async function discardFromCard(card: ChatResponse, deps: CardDiscardDeps): Promise<CardDiscardOutcome> {
  const draftId = cardDraftId(card);
  const done = bannerDiscardOutcome();
  if (!draftId) return { tone: done.tone, message: done.message, clearDraft: true };
  try {
    await deps.reject(draftId, ["tasks", "schedule"]);
    return { tone: done.tone, message: done.message, clearDraft: true, settled: "discarded" };
  } catch (err) {
    const outcome = bannerErrorOutcome(err, "discard");
    return outcome.clearBanner
      ? { tone: outcome.tone, message: outcome.message, clearDraft: true, settled: "closed" }
      : { tone: outcome.tone, message: outcome.message, clearDraft: false };
  }
}

/**
 * The card redrawn on the latest draft: its solved slots (a slot without a title
 * takes its task's) and horizon, and its version for the next accept. The turn's own
 * words stay. A latest draft with no solved slots shows none — never the old times
 * under the new version.
 */
export function withLatestDraft(card: ChatResponse, latest: DraftState): ChatResponse {
  const titles = new Map<string, string>();
  for (const task of latest.tasks) {
    if (typeof task.task_id === "string" && typeof task.title === "string" && task.title.trim()) {
      titles.set(task.task_id, task.title.trim());
    }
  }
  const slots: Record<string, TaskSchedule> = {};
  for (const [id, slot] of Object.entries(latest.schedule?.schedule ?? {})) {
    const title = slot.title?.trim() || titles.get(id);
    slots[id] = { start_min: slot.start_min, end_min: slot.end_min, ...(title ? { title } : {}) };
  }
  const horizon = latest.schedule?.horizon_start ?? latest.horizon_start ?? card.schedule?.horizon_start ?? "";
  return {
    ...card,
    draft_id: latest.draft_id,
    draft_version: latest.version,
    schedule: { ...card.schedule, horizon_start: horizon, schedule: slots },
  };
}

/** The messages with the turn that handed over `latest`'s draft redrawn on it; the rest unchanged. */
export function replaceDraftInMessages(messages: JarvisMessage[], latest: DraftState): JarvisMessage[] {
  return messages.map((m) =>
    m.response && cardDraftId(m.response) === latest.draft_id
      ? { ...m, response: withLatestDraft(m.response, latest) }
      : m,
  );
}


/** A stored chat message, as far as restoring its plan needs it. */
interface StoredTurn {
  id?: string;
  role: string;
  content: string;
  metadata?: { draft_id?: string | null; schedule?: ChatResponse["schedule"] | null } | null;
}

/**
 * The newest plan a reopened conversation proposed, as the turn's response would have
 * carried it, with the index of its message. Undefined when no turn kept a plan.
 * Whether that plan is still open is the caller's to check (`GET /drafts/{id}`):
 * stored messages do not say.
 */
export function storedPlanOf(
  messages: readonly StoredTurn[],
  conversationId: string,
): { index: number; draftId: string; response: ChatResponse } | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const turn = messages[index];
    const draftId = turn.metadata?.draft_id;
    const schedule = turn.metadata?.schedule;
    if (turn.role !== "assistant" || !draftId || !schedule) continue;
    return {
      index,
      draftId,
      response: {
        intent: "PLAN_DAY",
        message: turn.content,
        schedule,
        schedule_status: "draft",
        draft_id: draftId,
        conversation_id: conversationId,
        message_id: turn.id,
      },
    };
  }
  return undefined;
}
