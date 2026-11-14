/**
 * Pure logic for the chat review card: accept the plan it shows, by the version its
 * turn handed over (the `complete` frame's `draft_version`), and redraw it on the
 * latest draft when that plan changed since. A failed accept reads exactly as the
 * dashboard banner reads it (`bannerErrorOutcome`, lib/draftBanner.ts). No React;
 * the requests come in as arguments.
 */

import { bannerAcceptOutcome, bannerErrorOutcome, isOpenDraft } from "./draftBanner";
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
