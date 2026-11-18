"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Timer, Flame, Brain } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { streakLabel } from "@/lib/dashboard";

interface StatsStripProps {
  /** Done tasks out of every task in the selected range. */
  tasksCompleted: number;
  tasksTotal: number;
  /** The tile's label for the selected range, e.g. "Done today", "Done this week". */
  doneLabel: string;
  /** Minutes of work scheduled or done today. */
  focusMinutes: number;
  /** Days in a row with something done (GET /you); null while unknown, shown as "—". */
  streakDays: number | null;
  /** Patterns Jarvis sees (GET /you); null while unknown, so no wrong number is shown. */
  patternsLearned: number | null;
}

const CARD = "flex w-full items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-4";
const ICON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9";
const VALUE = "truncate text-base font-semibold sm:text-lg";
const LABEL = "text-[11px] leading-tight text-secondary sm:text-xs";

function AnimatedNumber({
  value,
  format = (number: number) => String(number),
}: {
  value: number;
  format?: (number: number) => string;
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const duration = 620;
    const started = performance.now();
    let frame = 0;
    setShown(0);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, value]);

  return <span className="tabular-nums">{format(shown)}</span>;
}

export default function StatsStrip({
  tasksCompleted,
  tasksTotal,
  doneLabel,
  focusMinutes,
  streakDays,
  patternsLearned,
}: StatsStripProps) {
  const taskPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 2xl:grid-cols-4">
      {/* Tasks — progress reads as a bar under the row rather than a ring
          beside it, which left no room for the label at four-up widths */}
      <Card className="px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className={`${ICON} bg-dusk/10 text-dusk`}>
            <ClipboardList size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`${VALUE} text-dusk`}>
              <AnimatedNumber value={tasksCompleted} />/<AnimatedNumber value={tasksTotal} />
            </p>
            <p className={LABEL}>{doneLabel}</p>
          </div>
        </div>
        <div
          className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-dusk/15"
          role="progressbar"
          aria-valuenow={taskPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={doneLabel}
        >
          <div
            className="stats-progress h-full rounded-full bg-dusk transition-all duration-500"
            style={{ width: `${taskPercent}%` }}
          />
        </div>
      </Card>

      {/* Focus */}
      <Card className={CARD}>
        <div className={`${ICON} bg-sage/10 text-sage`}>
          <Timer size={18} />
        </div>
        <div className="min-w-0">
          <p className={`${VALUE} text-sage`}><AnimatedNumber value={focusMinutes} format={formatTime} /></p>
          <p className={LABEL}>Focus today</p>
        </div>
      </Card>

      {/* Streak */}
      <Card className={CARD}>
        <div className={`${ICON} bg-gold/10 text-gold`}>
          <Flame size={18} />
        </div>
        <div className="min-w-0">
          <p className={`${VALUE} text-gold`}>
            {streakDays === null ? (
              <span aria-label="Not known yet">{streakLabel(null)}</span>
            ) : (
              <AnimatedNumber value={streakDays} format={(days) => streakLabel(days)} />
            )}
          </p>
          <p className={LABEL}>Streak</p>
        </div>
      </Card>

      {/* Patterns — the count the You page shows; opens it */}
      <Tooltip content="Patterns Jarvis sees in what happened. Open You to see them." className="w-full">
        <Link
          href="/you"
          className="block h-full w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
        >
          <Card className={`${CARD} h-full transition-colors hover:bg-surface-subtle`}>
            <div className={`${ICON} bg-terra/10 text-terra`}>
              <Brain size={18} />
            </div>
            <div className="min-w-0">
              <p className={`${VALUE} text-terra`}>
                {patternsLearned === null ? (
                  <span aria-label="Not known yet">—</span>
                ) : (
                  <AnimatedNumber value={patternsLearned} />
                )}
              </p>
              <p className={LABEL}>Patterns</p>
            </div>
          </Card>
        </Link>
      </Tooltip>
    </div>
  );
}
