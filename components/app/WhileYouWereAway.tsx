"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/app/ErrorState";
import {
  acceptSuggestion,
  dismissSuggestion,
  getDraftById,
  listSuggestions,
  runTrigger,
} from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { describeError, isShapeError } from "@/lib/learning";
import {
  acceptResultMessage,
  briefLines,
  checkNowOutcome,
  draftAwaitingReview,
  draftToChatResponse,
  errorMessageOf,
  removeWithRollback,
  statusOf,
  type PanelNote,
} from "@/lib/you";
import type { SuggestionOut } from "@/lib/types";

const POLL_MS = 30_000;
const TRY_AGAIN = "That didn't go through. Try again.";
const CHECK_NOW = "check-now";

/** One body line. An "I noticed …" line reads like a learning note: quiet, with its spark. */
function BodyLine({ text, noticed }: { text: string; noticed: boolean }) {
  if (!noticed) return <p className="text-sm text-secondary">{text}</p>;
  const [, lead, rest] = text.match(/^(I noticed)(.*)$/i) ?? [text, text, ""];
  return (
    <p className="flex items-start gap-1.5 pt-0.5 text-xs text-secondary">
      <Sparkles size={12} className="mt-0.5 shrink-0 text-sage" aria-hidden="true" />
      <span className="min-w-0 break-words">
        <span className="font-medium text-primary">{lead}</span>
        {rest}
      </span>
    </p>
  );
}

/** The outcome of "Check now": a quiet line, or why Jarvis held off. */
function Note({ note }: { note: PanelNote }) {
  if (note.tone === "consent") {
    return (
      <p className="flex items-start gap-1.5 text-xs text-secondary">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-dusk" aria-hidden="true" />
        <span className="min-w-0 break-words">
          <span className="font-medium text-primary">{note.text}</span>
          {note.detail && <> {note.detail}</>}
        </span>
      </p>
    );
  }
  return <p className="text-xs text-secondary">{note.text}</p>;
}

interface WhileYouWereAwayProps {
  /** Called once, when the first read of the suggestions has answered (or failed). */
  onSettled?: () => void;
}

/**
 * "While you were away": what Jarvis prepared on its own (pending suggestions),
 * to accept or dismiss. Polled every 30 s while the tab is visible. "Check now"
 * runs the morning brief on demand and says honestly how it went — including,
 * when consent said no, why Jarvis held off. An outage is said, never shown as
 * empty. The card is the dashboard's surface for what Jarvis noticed: the
 * learning toast belongs to the chat's pattern_detected frames only.
 */
export function WhileYouWereAway({ onSettled }: WhileYouWereAwayProps = {}) {
  const { showToast, refreshTasks, setDraft } = useJarvis();
  // undefined until the first read answers.
  const [items, setItems] = useState<SuggestionOut[] | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState<PanelNote | null>(null);
  const { run, isBusy } = useSingleFlight();
  const controllerRef = useRef<AbortController | null>(null);
  // Suggestions settled here (accepted, dismissed, found already handled): a poll that
  // started before the settle must not bring their cards back.
  const settledRef = useRef<Set<string>>(new Set());
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const firstReadDone = useRef(false);

  const load = useCallback(async () => {
    controllerRef.current?.abort(); // a newer read replaces one still in flight
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const fresh = await listSuggestions({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setItems(fresh.filter((s) => !settledRef.current.has(s.id)));
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err);
    }
    if (!firstReadDone.current) {
      firstReadDone.current = true;
      onSettledRef.current?.();
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      clearInterval(timer);
      controllerRef.current?.abort();
    };
  }, [load]);

  /** Take a settled suggestion off the list, for good. */
  const settle = (id: string) => {
    settledRef.current.add(id);
    setItems((list) => list?.filter((s) => s.id !== id));
  };

  /** Put a drafted plan where the dashboard's "pending schedule" banner shows it. */
  async function offerDraft(draftId: string, message: string) {
    try {
      const response = draftToChatResponse(await getDraftById(draftId), message);
      if (response) setDraft(response);
    } catch {
      showToast("The rule is saved, but its drafted plan couldn't be loaded here.", "info");
    }
  }

  /**
   * Run the morning brief now (single-flight; the backend answers a second run
   * within its cooldown with the first one's outcome) and say how it went.
   */
  async function checkNow() {
    const pending = run(CHECK_NOW, () => runTrigger("morning_brief"));
    if (!pending) return;
    setNote(null);
    try {
      const outcome = checkNowOutcome(await pending);
      const card = outcome.card;
      if (card && !settledRef.current.has(card.id)) {
        setItems((list) => (list?.some((x) => x.id === card.id) ? list : [card, ...(list ?? [])]));
      }
      setNote(outcome.note);
      if (outcome.tasksChanged) void refreshTasks();
    } catch (err) {
      if (isShapeError(err)) {
        // It ran (2xx), in a shape this page can't read: re-read what is there.
        setNote({ text: "Checked. Refreshing to show what's there.", tone: "quiet" });
        void load();
      } else {
        showToast(errorMessageOf(err, "Couldn't check right now. Try again."), "error");
      }
    }
  }

  async function accept(s: SuggestionOut) {
    // Accept and Dismiss share the suggestion's key: one request per card at a time.
    const pending = run(s.id, () => acceptSuggestion(s.id));
    if (!pending) return;
    setNote(null);
    try {
      const { result } = await pending;
      settle(s.id);
      showToast(acceptResultMessage(result), "success");
      void refreshTasks(); // an accepted brief writes tasks
      // A pattern rule's plan waits for review; the brief's draft is already applied.
      const draftId = draftAwaitingReview(s, result);
      if (draftId) void offerDraft(draftId, result.message);
    } catch (err) {
      if (isShapeError(err)) {
        // The accept answered 2xx, in a shape this page can't read: it happened.
        // Not a failure — show what changed by re-reading.
        showToast("Accepted. Refreshing to show what changed.", "info");
        settle(s.id);
        void refreshTasks();
        void load();
      } else if (statusOf(err) === 409) {
        // Already handled, or out of date: the backend says which. Never a success.
        showToast(errorMessageOf(err, "This suggestion was already handled."), "info");
        settle(s.id);
        void load();
      } else {
        showToast(errorMessageOf(err, TRY_AGAIN), "error");
      }
    }
  }

  async function dismiss(s: SuggestionOut, index: number) {
    // Set when the backend says it is no longer pending (409/404): it stays off the list.
    const outcome: { stale: unknown } = { stale: null };
    const pending = run(s.id, () =>
      removeWithRollback({
        item: s,
        index,
        key: (x) => x.id,
        setItems: (update) => setItems((list) => (list ? update(list) : list)),
        request: () => dismissSuggestion(s.id),
        isGone: (err) => {
          if (isShapeError(err)) return true; // answered 2xx: it is dismissed
          if (statusOf(err) !== 409 && statusOf(err) !== 404) return false;
          outcome.stale = err;
          return true;
        },
      }),
    );
    if (!pending) return;
    setNote(null);
    const failure = await pending;
    if (failure) {
      showToast(errorMessageOf(failure, TRY_AGAIN), "error");
    } else if (outcome.stale) {
      showToast(errorMessageOf(outcome.stale, "This suggestion was already handled."), "info");
      settle(s.id);
      void load();
    } else {
      settle(s.id); // a poll that landed mid-request may have brought it back
    }
  }

  const checking = isBusy(CHECK_NOW);
  const loading = items === undefined && error === null;
  const failure = error !== null ? describeError(error) : null;

  return (
    <section aria-labelledby="while-away-title" aria-busy={loading || undefined} className="space-y-2">
      <div>
        <div className="flex min-h-8 items-center gap-2">
          <Sparkles size={14} className="shrink-0 text-terra" />
          <h2
            id="while-away-title"
            className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-secondary"
          >
            While you were away
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-secondary"
            disabled={checking || loading}
            onClick={checkNow}
            aria-describedby="check-now-hint"
          >
            {checking ? (
              <Loader2 size={12} className="mr-1 animate-spin" />
            ) : (
              <RefreshCw size={12} className="mr-1" />
            )}
            Check now
          </Button>
          <span id="check-now-hint" className="sr-only">
            Ask Jarvis to look at today now and prepare your brief if there is one to make.
          </span>
        </div>

        {/* How the last "Check now" went; announced politely. Empty, it takes no room. */}
        <div role="status" aria-live="polite">
          {note && <Note note={note} />}
        </div>
      </div>

      {/* First read in flight: a card-sized placeholder, so loading never reads as "nothing happened" */}
      {loading && (
        <div className="h-28 rounded-card bg-surface-muted animate-pulse">
          <span className="sr-only">Checking what happened while you were away</span>
        </div>
      )}

      {failure && (
        <Card className="px-4 py-3">
          <ErrorState compact headline={failure.headline} message={failure.detail} onRetry={load} />
        </Card>
      )}

      {/* Nothing pending (and no outcome line already saying so) */}
      {items !== undefined && items.length === 0 && !failure && !note && (
        <p className="text-xs text-muted">Nothing is waiting on you.</p>
      )}

      {items?.map((s, index) => {
        const busy = isBusy(s.id);
        return (
          <Card key={s.id} className="border-l-[3px] border-l-terra px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-primary">{s.title}</p>
            <div className="mt-1 space-y-1">
              {briefLines(s.body).map((line, i) => (
                <BodyLine key={i} text={line.text} noticed={line.noticed} />
              ))}
            </div>
            {s.consent_reason && (
              <p className="mt-2 text-[11px] text-muted">{s.consent_reason}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => accept(s)}>
                {busy ? (
                  <Loader2 size={12} className="mr-1 animate-spin" />
                ) : (
                  <Check size={12} className="mr-1" />
                )}
                Accept
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => dismiss(s, index)}>
                <X size={12} className="mr-1" />
                Dismiss
              </Button>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
