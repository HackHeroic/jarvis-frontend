"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import TaskBlock from "@/components/app/TaskBlock";
import { activeTaskId, dayHeading, type DashboardRange, type RangeView } from "@/lib/dashboard";
import type { ScheduleTask } from "@/lib/types";

interface ScheduleTimelineProps {
  view: RangeView;
  range: DashboardRange;
  now: Date;
}

const TITLES: Record<DashboardRange, string> = {
  today: "Today's Schedule",
  week: "This week",
  month: "This month",
};

const CALENDAR_HREFS: Record<DashboardRange, string> = {
  today: "/schedule",
  week: "/schedule?view=week",
  month: "/schedule?view=month",
};

const EMPTY: Record<DashboardRange, string> = {
  today: "Nothing on today's schedule yet.",
  week: "Nothing on this week's schedule yet.",
  month: "Nothing on this month's schedule yet.",
};

function NowLine() {
  return (
    <div className="my-3 flex items-center gap-2" aria-label="Now">
      <div className="h-2.5 w-2.5 rounded-full bg-terra shadow-[0_0_6px_rgba(212,119,90,0.5)]" />
      <div className="h-px flex-1 bg-terra/40" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-terra">NOW</span>
      <div className="h-px flex-1 bg-terra/40" />
    </div>
  );
}

function DayHeader({ label, count }: { label: string; count: number }) {
  return (
    <h3 className="flex items-baseline justify-between gap-2 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
      <span>{label}</span>
      <span className="font-normal normal-case tracking-normal text-muted">
        {count} {count === 1 ? "task" : "tasks"}
      </span>
    </h3>
  );
}

/**
 * The dashboard's schedule for the selected range. Today: the day's tasks in time
 * order with a NOW line. Week and month: grouped by day under a day header. Tasks
 * with no slot yet come last, under "Not scheduled yet".
 */
export default function ScheduleTimeline({ view, range, now }: ScheduleTimelineProps) {
  const router = useRouter();
  const active = range === "today" ? activeTaskId(view.inRange, now) : null;

  function progressMinutes(task: ScheduleTask): number {
    if (task.task_id !== active) return 0;
    const elapsed = Math.round((now.getTime() - task.start_time.getTime()) / 60_000);
    return Math.max(0, Math.min(task.duration_minutes, elapsed));
  }

  const row = (task: ScheduleTask) => (
    <div
      key={task.task_id}
      className="cursor-pointer"
      onClick={() => router.push(`/workspace/${task.task_id}`)}
    >
      <TaskBlock
        task={task}
        isActive={task.task_id === active}
        progressMinutes={progressMinutes(task)}
      />
    </div>
  );

  // Today: where NOW falls among the day's tasks (before the first one not yet over).
  const todayTasks = range === "today" ? view.inRange : [];
  const nowIndex = todayTasks.findIndex((t) => now < t.end_time);
  const isEmpty = view.inRange.length === 0 && view.unscheduled.length === 0;

  return (
    <Card className="px-3.5 py-4 sm:px-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-semibold text-primary">{TITLES[range]}</h2>
        <Link
          href={CALENDAR_HREFS[range]}
          className="-my-2 inline-flex shrink-0 items-center whitespace-nowrap py-2 text-xs font-medium text-terra transition-colors hover:text-terra/80 max-md:-my-3 max-md:min-h-10"
        >
          <span className="sm:hidden">Schedule &rarr;</span>
          <span className="hidden sm:inline">View full schedule &rarr;</span>
        </Link>
      </div>

      {view.inRange.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-secondary">{EMPTY[range]}</p>
          {isEmpty && (
            <Link
              href="/chat"
              className="mt-1 inline-block text-xs font-medium text-terra hover:text-terra/80"
            >
              Tell Jarvis what&apos;s on your mind &rarr;
            </Link>
          )}
        </div>
      )}

      {range === "today" && todayTasks.length > 0 && (
        <div className="space-y-2">
          {todayTasks.map((task, i) => (
            <div key={task.task_id}>
              {i === nowIndex && <NowLine />}
              {row(task)}
            </div>
          ))}
          {nowIndex === -1 && <NowLine />}
        </div>
      )}

      {range !== "today" && view.days.length > 0 && (
        <div className="space-y-5">
          {view.days.map((day) => (
            <section key={day.key} className="space-y-2">
              <DayHeader label={dayHeading(day.date, now)} count={day.tasks.length} />
              {day.tasks.map(row)}
            </section>
          ))}
        </div>
      )}

      {view.unscheduled.length > 0 && (
        <section className="mt-5 space-y-2">
          <DayHeader label="Not scheduled yet" count={view.unscheduled.length} />
          {view.unscheduled.map(row)}
        </section>
      )}
    </Card>
  );
}
