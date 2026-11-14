"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/app/ErrorState";
import { LearningToast } from "@/components/app/LearningToast";
import { acceptSuggestion, dismissSuggestion, listSuggestions } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { LIST_ERROR_MESSAGE } from "@/lib/learning";
import {
  acceptResultMessage,
  errorMessageOf,
  patternToastOf,
  removeWithRollback,
  statusOf,
} from "@/lib/you";
import type { PatternDetectedEvent, SuggestionOut } from "@/lib/types";

const POLL_MS = 30_000;
const TRY_AGAIN = "That didn't go through. Try again.";
/** Suggestion ids that already raised the learning toast, so a revisit doesn't repeat it. */
const TOASTED_KEY = "jarvis-toasted-suggestions";

function readToasted(): Set<string> {
  try {
    const raw = localStorage.getItem(TOASTED_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function rememberToasted(ids: Set<string>): void {
  try {
    localStorage.setItem(TOASTED_KEY, JSON.stringify(Array.from(ids).slice(-50)));
  } catch {
    // storage unavailable: the toast may show again on a later visit, nothing worse
  }
}

/**
 * "While you were away": what Jarvis prepared on its own (pending suggestions),
 * to accept or dismiss. Polled every 30 s while the tab is visible. Renders
 * nothing when there is nothing pending; an outage is said, never shown as empty.
 */
export function WhileYouWereAway() {
  const { showToast, refreshTasks } = useJarvis();
  // undefined until the first read answers.
  const [items, setItems] = useState<SuggestionOut[] | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [toast, setToast] = useState<PatternDetectedEvent | null>(null);
  const { run, isBusy } = useSingleFlight();
  const controllerRef = useRef<AbortController | null>(null);
  const toastedRef = useRef<Set<string> | null>(null);
  // Suggestions settled here (accepted, dismissed, found already handled): a poll that
  // started before the settle must not bring their cards back.
  const settledRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    controllerRef.current?.abort(); // a newer read replaces one still in flight
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const fresh = await listSuggestions({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setItems(fresh.filter((s) => !settledRef.current.has(s.id)));
      setError(null);
      // A strong, recurring pattern_rule suggestion seen for the first time raises the toast.
      const toasted = (toastedRef.current ??= readToasted());
      for (const s of fresh) {
        if (toasted.has(s.id)) continue;
        const pattern = patternToastOf(s);
        if (!pattern) continue;
        toasted.add(s.id);
        rememberToasted(toasted);
        setToast(pattern);
        break;
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err);
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

  async function accept(s: SuggestionOut) {
    // Accept and Dismiss share the suggestion's key: one request per card at a time.
    const pending = run(s.id, () => acceptSuggestion(s.id));
    if (!pending) return;
    try {
      const { result } = await pending;
      settle(s.id);
      showToast(acceptResultMessage(result), "success");
      void refreshTasks(); // an accepted brief writes tasks
    } catch (err) {
      if (statusOf(err) === 409) {
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
          if (statusOf(err) !== 409 && statusOf(err) !== 404) return false;
          outcome.stale = err;
          return true;
        },
      }),
    );
    if (!pending) return;
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

  const dismissToast = useCallback(() => setToast(null), []);

  const learning = <LearningToast pattern={toast} onDismiss={dismissToast} />;

  // First read in flight: a slim placeholder, so loading never reads as "nothing happened".
  if (items === undefined && error === null) {
    return (
      <div aria-busy="true" className="h-5 w-48 rounded bg-surface-muted animate-pulse">
        <span className="sr-only">Checking what happened while you were away</span>
      </div>
    );
  }

  // Nothing pending: nothing to show.
  if (!items?.length && error === null) return learning;

  return (
    <section aria-labelledby="while-away-title" className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-terra" />
        <h2
          id="while-away-title"
          className="text-xs font-semibold uppercase tracking-wider text-secondary"
        >
          While you were away
        </h2>
      </div>

      {error !== null && (
        <Card className="px-4 py-3">
          <ErrorState compact message={errorMessageOf(error, LIST_ERROR_MESSAGE)} onRetry={load} />
        </Card>
      )}

      {items?.map((s, index) => {
        const busy = isBusy(s.id);
        return (
          <Card key={s.id} className="border-l-[3px] border-l-terra px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-primary">{s.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-secondary">{s.body}</p>
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
      {learning}
    </section>
  );
}
