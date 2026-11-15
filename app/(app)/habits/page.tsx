"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Target, X } from "lucide-react";
import { completeHabit, deleteBehavioralConstraint, getRuleCheckIns } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { SM2QualityRating } from "@/components/app/SM2QualityRating";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import {
  CHECK_IN_ANSWERS,
  CHECK_IN_QUESTION,
  answeredLine,
  hasRules,
  lastCheckInLine,
  nextCheckInLine,
  nothingDueLine,
} from "@/lib/habits";
import { describeError } from "@/lib/learning";
import { errorMessageOf, freshnessLabel, provenanceLabel, removeWithRollback, statusOf } from "@/lib/you";
import type { RuleCheckIn, RuleCheckInList } from "@/lib/types";

type SetItems = (update: (items: RuleCheckIn[]) => RuleCheckIn[]) => void;

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** Whose words the rule is, and when it was learned: "YOU SAID · noted 6 days ago". */
function RuleOrigin({ checkIn, timeZone }: { checkIn: RuleCheckIn; timeZone: string }) {
  const noted = checkIn.learned_at ? freshnessLabel(checkIn.learned_at, new Date(), timeZone) : "";
  return (
    <>
      <Badge color={checkIn.source === "said" ? "dusk" : "sage"}>{provenanceLabel(checkIn.source)}</Badge>
      {noted && <span className="text-[11px] text-muted">{noted}</span>}
    </>
  );
}

function ForgetButton({ rule, busy, onForget }: { rule: string; busy: boolean; onForget: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto shrink-0"
      disabled={busy}
      onClick={onForget}
      aria-label={`Forget the rule “${rule}”`}
    >
      <X size={12} className="mr-1" />
      Forget
    </Button>
  );
}

type CardState = { kind: "asking" } | { kind: "saving" } | { kind: "answered"; line: string };

/** A rule whose check-in is due: the rule, "Still how you work?", 0-5, and a quiet line. */
function CheckInCard({
  checkIn,
  today,
  timeZone,
  forgetting,
  onForget,
}: {
  checkIn: RuleCheckIn;
  today: string;
  timeZone: string;
  forgetting: boolean;
  onForget: () => void;
}) {
  const [state, setState] = useState<CardState>({ kind: "asking" });
  const [error, setError] = useState<string | null>(null);

  async function answer(quality: number) {
    if (state.kind !== "asking") return;
    setState({ kind: "saving" });
    setError(null);
    try {
      const reviewed = await completeHabit(checkIn.id, quality);
      setState({ kind: "answered", line: answeredLine(quality, reviewed, today) });
    } catch (err) {
      setState({ kind: "asking" });
      setError(errorMessageOf(err, "That didn't save. Try again."));
    }
  }

  if (state.kind === "answered") {
    return (
      <Card className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-sage" aria-hidden />
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="break-words text-sm font-medium text-primary">{checkIn.rule_text}</p>
          <p className="mt-1 text-xs text-secondary">{state.line}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terra/10 sm:flex">
          <Target size={18} className="text-terra" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-primary">{checkIn.rule_text}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RuleOrigin checkIn={checkIn} timeZone={timeZone} />
          </div>
        </div>
        <ForgetButton rule={checkIn.rule_text} busy={forgetting || state.kind === "saving"} onForget={onForget} />
      </div>

      {state.kind === "saving" ? (
        <div className="mt-3 flex items-center justify-center gap-2 py-3">
          <Loader2 size={16} className="animate-spin text-terra" aria-hidden />
          <span className="text-xs text-muted">Saving…</span>
        </div>
      ) : (
        <SM2QualityRating onRate={answer} question={CHECK_IN_QUESTION} labels={CHECK_IN_ANSWERS} />
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-gold">
          {error}
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted">{lastCheckInLine(checkIn, today, timeZone)}</p>
    </Card>
  );
}

/** A rule not due yet: when Jarvis will ask about it next. */
function LaterRow({
  checkIn,
  today,
  timeZone,
  forgetting,
  onForget,
}: {
  checkIn: RuleCheckIn;
  today: string;
  timeZone: string;
  forgetting: boolean;
  onForget: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5 sm:flex-nowrap sm:px-4">
      <span className="min-w-0 flex-1 basis-full break-words text-sm text-primary sm:basis-auto">
        {checkIn.rule_text}
      </span>
      <RuleOrigin checkIn={checkIn} timeZone={timeZone} />
      <span className="text-[11px] text-secondary">{nextCheckInLine(checkIn, today)}</span>
      <ForgetButton rule={checkIn.rule_text} busy={forgetting} onForget={onForget} />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Habits Page
// ---------------------------------------------------------------------------

export default function HabitsPage() {
  const { showToast } = useJarvis();
  const { run, isBusy } = useSingleFlight();
  // undefined until the first fetch answers.
  const [list, setList] = useState<RuleCheckInList | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);

  const fetchCheckIns = useCallback(async () => {
    try {
      setList(await getRuleCheckIns());
      setError(null);
    } catch (err) {
      // Couldn't load (e.g. 503: database down) — say so; an outage is never "no rules".
      setError(err);
    }
  }, []);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const retry = useCallback(() => {
    setError(null);
    setList(undefined);
    fetchCheckIns();
  }, [fetchCheckIns]);

  const setDue: SetItems = useCallback(
    (update) => setList((prev) => prev && { ...prev, due_trackers: update(prev.due_trackers) }),
    [],
  );
  const setUpcoming: SetItems = useCallback(
    (update) => setList((prev) => prev && { ...prev, upcoming_trackers: update(prev.upcoming_trackers) }),
    [],
  );

  /** Forget the rule (and its check-ins); it leaves the list at once and comes back if that fails. */
  async function forget(checkIn: RuleCheckIn, index: number, setItems: SetItems) {
    const pending = run(checkIn.constraint_id, () =>
      removeWithRollback({
        item: checkIn,
        index,
        key: (c) => c.id,
        setItems,
        request: () => deleteBehavioralConstraint(checkIn.constraint_id),
        isGone: (err) => statusOf(err) === 404, // already removed: it is gone either way
      }),
    );
    if (!pending) return;
    const failure = await pending;
    if (failure) showToast(errorMessageOf(failure, "That didn't go through. Try again."), "error");
    else showToast("Forgotten — plans stop applying that rule.", "success");
  }

  const failed = error ? describeError(error) : null;
  const quiet = list ? nothingDueLine(list) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary">Habits</h1>
        <p className="mt-1 text-sm text-secondary">
          The rules Jarvis has learned about how you work. Now and then it checks one still fits — the
          longer a rule holds, the longer it waits to ask again.
        </p>
      </div>

      {/* Loading */}
      {!list && !failed && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface-muted" />
          ))}
        </div>
      )}

      {/* Outage, or an answer this page can't read — never "no rules" */}
      {failed && (
        <Card className="px-6 py-12">
          <ErrorState headline={failed.headline} message={failed.detail} onRetry={retry} />
        </Card>
      )}

      {/* No rules at all: say where they come from */}
      {list && !failed && !hasRules(list) && (
        <Card className="px-6 py-12">
          <EmptyState
            icon="🎯"
            headline="No rules yet"
            subtitle="Jarvis learns your rules from chat — tell it something like “no work after 10 PM”, and it will check in here now and then that the rule still fits."
          />
        </Card>
      )}

      {list && !failed && hasRules(list) && (
        <>
          {/* Due today */}
          <section aria-labelledby="habits-due" className="space-y-2">
            <h2 id="habits-due" className="text-sm font-semibold text-primary">
              Today&rsquo;s check-ins
            </h2>
            {quiet ? (
              <Card className="px-4 py-4 text-sm text-secondary sm:px-5">{quiet}</Card>
            ) : (
              list.due_trackers.map((checkIn, index) => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  today={list.today}
                  timeZone={list.timezone}
                  forgetting={isBusy(checkIn.constraint_id)}
                  onForget={() => forget(checkIn, index, setDue)}
                />
              ))
            )}
          </section>

          {/* Not due yet */}
          {list.upcoming_trackers.length > 0 && (
            <section aria-labelledby="habits-later" className="rounded-card border border-border bg-surface p-4">
              <h2 id="habits-later" className="text-sm font-semibold text-primary">
                Not due yet
              </h2>
              <p className="mt-0.5 text-xs text-secondary">
                Every plan respects these. Jarvis will ask about each again on its day.
              </p>
              <ul className="mt-3 space-y-2">
                {list.upcoming_trackers.map((checkIn, index) => (
                  <LaterRow
                    key={checkIn.id}
                    checkIn={checkIn}
                    today={list.today}
                    timeZone={list.timezone}
                    forgetting={isBusy(checkIn.constraint_id)}
                    onForget={() => forget(checkIn, index, setUpcoming)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
