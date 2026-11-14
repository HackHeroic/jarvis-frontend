"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/app/ErrorState";
import { acceptDraft, getDraftById, rejectDraft } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { describeError } from "@/lib/learning";
import type { DraftState } from "@/lib/types";
import {
  bannerAcceptOutcome,
  bannerDiscardOutcome,
  bannerErrorOutcome,
  draftBannerActions,
  summarizeDraft,
  type BannerOutcome,
  type DraftSummary,
} from "@/lib/draftBanner";

const OPEN = new Set(["pending", "modified"]);

/**
 * The dashboard's "pending schedule" banner. A chat turn's plan links to its
 * review card in chat. A plan drafted by an accepted suggestion has no card in
 * chat, so it is acted on here: a summary of what it would add, then
 * "Lock it in" or "Discard".
 */
export function PendingDraftBanner() {
  const router = useRouter();
  const { draftResponse } = useJarvis();
  const draftId = draftResponse?.draft_id || draftResponse?.schedule?.draft_id || null;
  if (!draftId || !draftResponse) return null;

  const actions = draftBannerActions(draftResponse.draft_source);
  if (!actions.reviewInChat) {
    return <SuggestionDraftBanner key={draftId} draftId={draftId} message={draftResponse.message} />;
  }

  return (
    <Card className="flex items-center justify-between gap-3 border-l-[3px] border-terra px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">You have a pending schedule</p>
        <p className="mt-0.5 text-xs text-secondary">
          Review and confirm your tasks before they go live.
        </p>
      </div>
      <Button variant="primary" size="sm" className="shrink-0" onClick={() => router.push("/chat")}>
        Review in chat
        <ArrowRight size={14} className="ml-1" />
      </Button>
    </Card>
  );
}

/** The plan as shown, and the version of the read it came from (sent back on "Lock it in"). */
interface ShownPlan {
  summary: DraftSummary;
  version: string;
}

function SuggestionDraftBanner({ draftId, message }: { draftId: string; message: string }) {
  const { clearDraft, refreshTasks, showToast } = useJarvis();
  const { run, isBusy } = useSingleFlight();
  // undefined until GET /drafts/{id} answers.
  const [shown, setShown] = useState<ShownPlan | undefined>(undefined);
  const summary = shown?.summary;
  // The backend's words when the plan changed since it was read (shown above the latest).
  const [changedNote, setChangedNote] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const controllerRef = useRef<AbortController | null>(null);

  /** Show a draft as read; a closed one has nothing left to decide. */
  const show = useCallback(
    (draft: DraftState) => {
      if (!OPEN.has(draft.status)) {
        clearDraft(); // locked in or closed elsewhere
        return;
      }
      setShown({ summary: summarizeDraft(draft), version: draft.version });
    },
    [clearDraft],
  );

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    try {
      const draft = await getDraftById(draftId);
      if (controller.signal.aborted) return;
      show(draft);
    } catch (err) {
      if (controller.signal.aborted) return;
      if ((err as { status?: unknown }).status === 404) {
        clearDraft(); // the plan is gone
        return;
      }
      setError(err);
    }
  }, [draftId, clearDraft, show]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  function settle(outcome: BannerOutcome) {
    showToast(outcome.message, outcome.tone);
    if (outcome.refreshTasks) void refreshTasks();
    if (outcome.clearBanner) clearDraft();
  }

  async function lockIn() {
    // Accept exactly what is shown: the version of the read behind it.
    const version = shown?.version;
    // Lock it in and Discard share the plan's key: one request at a time.
    const pending = run(draftId, () => acceptDraft(draftId, version));
    if (!pending) return;
    setChangedNote(null);
    try {
      settle(bannerAcceptOutcome(await pending));
    } catch (err) {
      const outcome = bannerErrorOutcome(err, "accept");
      if (outcome.latest === undefined) {
        settle(outcome);
        return;
      }
      // The plan changed since it was read; nothing was written. Say so, show the
      // latest in place of the old one, and keep the banner open.
      setChangedNote(outcome.message);
      if (outcome.latest) show(outcome.latest);
      else void load();
    }
  }

  async function discard() {
    const pending = run(draftId, () => rejectDraft(draftId, []));
    if (!pending) return;
    setChangedNote(null);
    try {
      await pending;
      settle(bannerDiscardOutcome());
    } catch (err) {
      settle(bannerErrorOutcome(err, "discard"));
    }
  }

  const busy = isBusy(draftId);
  const failure = error !== null ? describeError(error) : null;

  return (
    <Card className="border-l-[3px] border-terra px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-primary">A plan is ready for you</p>
      {message && <p className="mt-0.5 text-xs text-secondary">{message}</p>}
      {changedNote && (
        <p role="status" className="mt-2 text-xs font-medium text-gold">
          {changedNote}
        </p>
      )}

      <div className="mt-3">
        {summary === undefined && !failure && (
          <div className="space-y-1.5" aria-busy="true">
            <span className="sr-only">Loading the plan</span>
            <div className="h-3 w-40 rounded bg-surface-muted animate-pulse" />
            <div className="h-3 w-56 rounded bg-surface-muted animate-pulse" />
          </div>
        )}
        {failure && (
          <ErrorState compact headline={failure.headline} message={failure.detail} onRetry={load} />
        )}
        {summary && summary.taskCount === 0 && (
          <p className="text-sm text-secondary">This plan has no tasks to add.</p>
        )}
        {summary && summary.taskCount > 0 && (
          <>
            <p className="text-xs font-medium text-secondary">
              {summary.taskCount} {summary.taskCount === 1 ? "task" : "tasks"} to add
              {!summary.timed && " — each keeps the slot Jarvis found when you lock it in"}
            </p>
            <ul className="mt-1.5 space-y-1">
              {summary.shown.map((task, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm text-primary">
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  {task.when && <span className="shrink-0 text-xs text-muted">{task.when}</span>}
                </li>
              ))}
            </ul>
            {summary.more > 0 && (
              <p className="mt-1 text-xs text-muted">and {summary.more} more</p>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !summary || summary.taskCount === 0}
          onClick={lockIn}
        >
          {busy ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
          Lock it in
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={discard}>
          <X size={12} className="mr-1" />
          Discard
        </Button>
      </div>
    </Card>
  );
}
