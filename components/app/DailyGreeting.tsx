"use client";

import clsx from "clsx";
import { DEMO_USER } from "@/lib/constants";
import type { DashboardRange } from "@/lib/dashboard";

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface DailyGreetingProps {
  now: Date;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  /** The selected range in words, e.g. "Saturday, November 14" or "Nov 8 – Nov 14". */
  rangeLabel: string;
  /** Slotted tasks in the selected range. */
  taskCount: number;
  /** The minutes those tasks carry. */
  estimatedMinutes: number;
  /** Pending tasks with no slot yet. */
  unscheduledCount: number;
}

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default function DailyGreeting({
  now,
  range,
  onRangeChange,
  rangeLabel,
  taskCount,
  estimatedMinutes,
  unscheduledCount,
}: DailyGreetingProps) {
  const facts = [
    rangeLabel,
    `${taskCount} ${taskCount === 1 ? "task" : "tasks"}`,
    `~${estimatedMinutes} min estimated`,
    ...(unscheduledCount > 0 ? [`${unscheduledCount} not scheduled yet`] : []),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight text-primary sm:text-[22px]">
          {getGreeting(now)}, {DEMO_USER.name}
        </h1>
        {/* The facts describe the selected range; they wrap as whole phrases */}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-secondary sm:text-sm">
          {facts.map((fact, i) => (
            <span key={fact} className="flex items-center gap-x-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-muted">
                  &middot;
                </span>
              )}
              <span className="whitespace-nowrap">{fact}</span>
            </span>
          ))}
        </p>
      </div>

      <div
        role="group"
        aria-label="Show"
        className="flex shrink-0 gap-1 self-start rounded-button bg-surface-muted p-0.5"
      >
        {RANGES.map(({ value, label }) => {
          const isActive = value === range;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onRangeChange(value)}
              aria-pressed={isActive}
              className={clsx(
                "rounded-button px-3 py-1.5 text-xs font-medium transition-colors max-md:min-h-10",
                isActive
                  ? "bg-terra text-white"
                  : "cursor-pointer text-secondary hover:bg-surface-subtle hover:text-primary",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
