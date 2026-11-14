"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeTask, skipTask } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { isSetAside } from "@/lib/constants";
import { tasksOnDay, unscheduledPending } from "@/lib/schedule";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { errorMessageOf } from "@/lib/you";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/app/EmptyState";
import { SM2QualityRating } from "@/components/app/SM2QualityRating";
import {
  CheckCircle2,
  SkipForward,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { ScheduleTask } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pixels per minute in the time grid */
const PX_PER_MINUTE = 1.4;

/** Grid starts at 8:00 AM (480 min from midnight) */
const GRID_START_HOUR = 8;
const GRID_START_MINUTES = GRID_START_HOUR * 60;

/** Grid ends at 11:00 PM (23:00 = 1380 min from midnight) */
const GRID_END_HOUR = 23;
const GRID_END_MINUTES = GRID_END_HOUR * 60;

/** Total grid height */
const GRID_HEIGHT = (GRID_END_MINUTES - GRID_START_MINUTES) * PX_PER_MINUTE;

/** Width of the hour-label gutter. Fits "12 AM" at the smallest label size. */
const HOUR_GUTTER = 52;

/** Hours array for labels */
const HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => GRID_START_HOUR + i,
);

type ViewMode = "day" | "week" | "month";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const day = r.getDay(); // 0=Sun
  r.setDate(r.getDate() - day);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getMinuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function shortDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function dayNumber(d: Date): number {
  return d.getDate();
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

/** Block colours by status. Skipped and missed are both "set aside": neutral, never alarming. */
const STATUS_COLORS: Record<ScheduleTask["status"], string> = {
  completed: "bg-sage/20 border-sage",
  pending: "bg-surface-muted border-border",
  skipped: "bg-surface-muted border-muted opacity-60",
  missed: "bg-surface-muted border-muted opacity-60",
};

const TRY_AGAIN = "That didn't go through. Try again.";

// ---------------------------------------------------------------------------
// Schedule Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  return (
    <Suspense>
      <SchedulePageInner />
    </Suspense>
  );
}

function SchedulePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks: allTasks, tasksLoading: loading, refreshTasks, showToast } = useJarvis();
  const initialView = (searchParams.get("view") as ViewMode) || "day";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);
  // The backend's own words after a skip (where the task could go, or that nothing changed).
  const [skipNote, setSkipNote] = useState<string | null>(null);
  // One request per task at a time: a double-click completes or skips once.
  const { run, isBusy } = useSingleFlight();

  const now = useMemo(() => new Date(), []);

  // ---- Tasks for selected day: slotted ones only (a task with no slot has no time to draw) ----
  const dayTasks = useMemo(() => tasksOnDay(allTasks, selectedDate), [allTasks, selectedDate]);
  // ---- Pending tasks with no slot yet: the "Not scheduled yet" strip ----
  const notScheduled = useMemo(() => unscheduledPending(allTasks), [allTasks]);

  // ---- Navigation helpers ----
  function navigatePrev() {
    if (viewMode === "day") setSelectedDate((d) => addDays(d, -1));
    else if (viewMode === "week") setSelectedDate((d) => addDays(d, -7));
    else setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function navigateNext() {
    if (viewMode === "day") setSelectedDate((d) => addDays(d, 1));
    else if (viewMode === "week") setSelectedDate((d) => addDays(d, 7));
    else setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  // ---- Actions ----
  async function handleComplete(taskId: string, quality: number) {
    const pending = run(taskId, () => completeTask(taskId, undefined, quality));
    if (!pending) return;
    setRatingTaskId(null);
    setSkipNote(null);
    try {
      await pending;
    } catch (err) {
      showToast(errorMessageOf(err, TRY_AGAIN), "error");
    } finally {
      await refreshTasks();
    }
  }

  async function handleSkip(taskId: string) {
    const pending = run(taskId, () => skipTask(taskId));
    if (!pending) return;
    setSkipNote(null);
    try {
      const res = await pending;
      if (res.message) setSkipNote(res.message);
    } catch (err) {
      showToast(errorMessageOf(err, TRY_AGAIN), "error");
    } finally {
      await refreshTasks();
    }
  }

  // ---- NOW indicator position ----
  const nowMinute = getMinuteOfDay(now);
  const nowTop = (nowMinute - GRID_START_MINUTES) * PX_PER_MINUTE;
  const showNowLine =
    isSameDay(selectedDate, now) &&
    nowMinute >= GRID_START_MINUTES &&
    nowMinute <= GRID_END_MINUTES;

  // ---- Header label ----
  const headerLabel = useMemo(() => {
    if (viewMode === "day") return dateLabel(selectedDate);
    if (viewMode === "week") {
      const ws = startOfWeek(selectedDate);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return selectedDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewMode, selectedDate]);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Calendar size={20} className="shrink-0 text-terra" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-primary">Schedule</h1>
            <p className="truncate text-sm text-secondary">{headerLabel}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          {/* View toggle */}
          <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  viewMode === mode
                    ? "bg-terra text-white"
                    : "bg-surface-card text-secondary hover:bg-surface-muted",
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Nav arrows */}
          <button
            onClick={navigatePrev}
            aria-label="Previous"
            className="tap-target flex items-center justify-center rounded-lg p-1.5 text-secondary transition-colors hover:bg-surface-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-2.5 py-1 text-xs font-medium text-terra hover:bg-terra/10 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            aria-label="Next"
            className="tap-target flex items-center justify-center rounded-lg p-1.5 text-secondary transition-colors hover:bg-surface-muted"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* After a skip: the backend's own note, quietly */}
      {skipNote && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-card px-3.5 py-2.5"
        >
          <p className="min-w-0 text-xs text-secondary">{skipNote}</p>
          <button
            type="button"
            onClick={() => setSkipNote(null)}
            aria-label="Dismiss note"
            className="shrink-0 rounded p-0.5 text-muted transition-colors hover:text-secondary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-terra" />
          <p className="text-sm text-muted">Loading schedule...</p>
        </div>
      )}

      {/* Pending tasks with no slot yet: listed, never drawn at a made-up time */}
      {!loading && notScheduled.length > 0 && (
        <NotScheduledStrip
          tasks={notScheduled}
          onOpen={(t) => router.push(`/workspace/${t.task_id}`)}
        />
      )}

      {/* Empty state — only for day view when no tasks */}
      {!loading && allTasks.length === 0 && (
        <Card className="px-6 py-12">
          <EmptyState
            icon="📅"
            headline="No tasks scheduled"
            subtitle="Start by chatting with Jarvis to build your schedule."
            ctaLabel="Go to Chat"
            onCta={() => router.push("/chat")}
          />
        </Card>
      )}

      {/* ---- DAY VIEW ---- */}
      {!loading && allTasks.length > 0 && viewMode === "day" && (
        <DayGrid
          tasks={dayTasks}
          now={now}
          showNowLine={showNowLine}
          nowTop={nowTop}
          ratingTaskId={ratingTaskId}
          isBusy={isBusy}
          onTaskClick={(t) => {
            if (!t.constraint_applied) router.push(`/workspace/${t.task_id}`);
          }}
          onComplete={(id) => setRatingTaskId(id)}
          onSkip={handleSkip}
          onRate={handleComplete}
          onCancelRating={() => setRatingTaskId(null)}
        />
      )}

      {/* ---- WEEK VIEW ---- */}
      {!loading && viewMode === "week" && (
        <WeekGrid
          allTasks={allTasks}
          selectedDate={selectedDate}
          now={now}
          onSelectDay={(d) => {
            setSelectedDate(d);
            setViewMode("day");
          }}
        />
      )}

      {/* ---- MONTH VIEW ---- */}
      {!loading && viewMode === "month" && (
        <MonthGrid
          allTasks={allTasks}
          selectedDate={selectedDate}
          now={now}
          onSelectDay={(d) => {
            setSelectedDate(d);
            setViewMode("day");
          }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// NOT SCHEDULED YET
// ===========================================================================

interface NotScheduledStripProps {
  /** Pending tasks with no slot, sorted by title. */
  tasks: ScheduleTask[];
  onOpen: (task: ScheduleTask) => void;
}

/** Tasks with no time yet, as a strip above the grid: they belong to no hour and no day. */
function NotScheduledStrip({ tasks, onOpen }: NotScheduledStripProps) {
  return (
    <section
      aria-label="Not scheduled yet"
      className="rounded-xl border border-border bg-surface-card px-3.5 py-3 sm:px-4"
    >
      <h2 className="flex items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
        <span>Not scheduled yet</span>
        <span className="font-normal normal-case tracking-normal text-muted">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} with no time yet
        </span>
      </h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {tasks.map((task) => (
          <li key={task.task_id} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="flex max-w-full items-center gap-2 rounded-lg border-l-[3px] bg-surface-muted px-2.5 py-1.5 text-left transition-colors hover:bg-surface-subtle"
              style={{ borderLeftColor: task.color }}
            >
              <span className="min-w-0 truncate text-xs font-medium text-primary">{task.title}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">
                {task.duration_minutes} min
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ===========================================================================
// DAY GRID
// ===========================================================================

/**
 * Assign overlapping tasks to side-by-side lanes so same-slot blocks render
 * next to each other instead of stacking text on top of each other.
 */
function assignLanes(
  tasks: ScheduleTask[],
): Map<string, { lane: number; lanes: number }> {
  const sorted = [...tasks]
    .map((t) => {
      const start = getMinuteOfDay(t.start_time);
      return { id: t.task_id, start, end: start + t.duration_minutes };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: { id: string; start: number; end: number; lane: number }[] = [];
  let laneEnds: number[] = [];

  const flush = () => {
    const lanes = laneEnds.length || 1;
    for (const c of cluster) result.set(c.id, { lane: c.lane, lanes });
    cluster = [];
    laneEnds = [];
  };

  for (const t of sorted) {
    if (cluster.length > 0 && laneEnds.every((end) => end <= t.start)) flush();
    let lane = laneEnds.findIndex((end) => end <= t.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(t.end);
    } else {
      laneEnds[lane] = t.end;
    }
    cluster.push({ ...t, lane });
  }
  flush();
  return result;
}

interface DayGridProps {
  tasks: ScheduleTask[];
  now: Date;
  showNowLine: boolean;
  nowTop: number;
  ratingTaskId: string | null;
  /** True while a Complete or Skip for that task is in flight. */
  isBusy: (taskId: string) => boolean;
  onTaskClick: (task: ScheduleTask) => void;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onRate: (taskId: string, quality: number) => void;
  onCancelRating: () => void;
}

function DayGrid({
  tasks,
  showNowLine,
  nowTop,
  ratingTaskId,
  isBusy,
  onTaskClick,
  onComplete,
  onSkip,
  onRate,
  onCancelRating,
}: DayGridProps) {
  const router = useRouter();
  return (
    <div className="relative flex rounded-xl border border-border bg-surface-card overflow-hidden">
      {/* Hour labels — width is driven by HOUR_GUTTER so the absolutely
          positioned labels always line up with the gutter they sit in */}
      <div
        className="shrink-0 border-r border-border"
        style={{ width: HOUR_GUTTER }}
      >
        {HOURS.map((hour) => {
          const top = (hour * 60 - GRID_START_MINUTES) * PX_PER_MINUTE;
          return (
            <div
              key={hour}
              className="absolute text-[10px] font-medium text-muted tabular-nums sm:text-[11px]"
              style={{
                top,
                left: 0,
                width: HOUR_GUTTER,
                textAlign: "right",
                paddingRight: 8,
              }}
            >
              {formatHourLabel(hour)}
            </div>
          );
        })}
      </div>

      {/* Time grid area */}
      <div className="relative flex-1" style={{ height: GRID_HEIGHT }}>
        {/* Hour lines */}
        {HOURS.map((hour) => {
          const top = (hour * 60 - GRID_START_MINUTES) * PX_PER_MINUTE;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border/40"
              style={{ top }}
            />
          );
        })}

        {/* NOW indicator */}
        {showNowLine && (
          <div
            className="absolute left-0 right-0 z-30 flex items-center"
            style={{ top: nowTop }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0" />
            <div className="h-[2px] flex-1 bg-red-500" />
          </div>
        )}

        {/* Task blocks */}
        {(() => {
          const lanesById = assignLanes(tasks);
          return tasks.map((task) => {
          const laneInfo = lanesById.get(task.task_id) ?? { lane: 0, lanes: 1 };
          const startMin = getMinuteOfDay(task.start_time);
          const top = Math.max(0, (startMin - GRID_START_MINUTES) * PX_PER_MINUTE);
          const height = Math.max(task.duration_minutes * PX_PER_MINUTE, 28);
          const isBlocked = !!task.constraint_applied;
          // Complete works from pending or missed; Skip only from pending (the backend's moves).
          const isActionable = task.status === "pending" || task.status === "missed";
          const canSkip = task.status === "pending";
          const busy = isBusy(task.task_id);
          const showRating = ratingTaskId === task.task_id;

          return (
            <div
              key={task.task_id}
              className={clsx(
                "absolute z-10 rounded-lg px-3 py-1.5 transition-all overflow-hidden",
                isBlocked
                  ? "border-2 border-dashed border-muted bg-surface-muted/50 cursor-default"
                  : "border-l-[3px] cursor-pointer hover:shadow-md",
                !isBlocked && STATUS_COLORS[task.status],
              )}
              style={{
                top,
                left: `calc(${(laneInfo.lane / laneInfo.lanes) * 100}% + 8px)`,
                width: `calc(${100 / laneInfo.lanes}% - ${laneInfo.lanes > 1 ? 12 : 16}px)`,
                height: showRating ? "auto" : height,
                minHeight: height,
                borderLeftColor: isBlocked ? undefined : task.color,
              }}
              onClick={() => {
                if (!isBlocked && !showRating) onTaskClick(task);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={clsx(
                      "text-xs font-semibold text-primary truncate",
                      task.status === "completed" && "line-through opacity-60",
                      isSetAside(task.status) && "opacity-60",
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {formatTime(task.start_time)} – {formatTime(task.end_time)}
                    {isBlocked && (
                      <span className="ml-1.5 text-muted italic">
                        ({task.constraint_applied})
                      </span>
                    )}
                  </p>
                </div>

                {/* Action buttons */}
                {isActionable && !isBlocked && !showRating && busy && (
                  <Loader2 size={14} className="shrink-0 animate-spin text-muted" aria-label="Saving" />
                )}
                {isActionable && !isBlocked && !showRating && !busy && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/workspace/${task.task_id}`);
                      }}
                      className="text-[10px] text-terra underline transition-opacity hover:opacity-70"
                    >
                      Workspace
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete(task.task_id);
                      }}
                      className="p-1 rounded-md hover:bg-sage/20 text-sage transition-colors"
                      title="Complete"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    {canSkip && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSkip(task.task_id);
                        }}
                        className="p-1 rounded-md hover:bg-gold/20 text-gold transition-colors"
                        title="Set aside"
                        aria-label="Set aside"
                      >
                        <SkipForward size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* SM2 Rating dialog */}
              {showRating && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                >
                  <SM2QualityRating
                    onRate={(quality) => onRate(task.task_id, quality)}
                    taskTitle={task.title}
                  />
                  <button
                    onClick={onCancelRating}
                    className="mt-1.5 text-[10px] text-muted hover:text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
          });
        })()}
      </div>
    </div>
  );
}

// ===========================================================================
// WEEK GRID
// ===========================================================================

interface WeekGridProps {
  allTasks: ScheduleTask[];
  selectedDate: Date;
  now: Date;
  onSelectDay: (date: Date) => void;
}

function WeekGrid({ allTasks, selectedDate, now, onSelectDay }: WeekGridProps) {
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="grid min-w-[640px] grid-cols-7 gap-1 rounded-xl border border-border bg-surface-card p-2">
      {days.map((day) => {
        const isToday = isSameDay(day, now);
        const tasksForDay = tasksOnDay(allTasks, day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={clsx(
              "flex flex-col rounded-lg p-2 text-left transition-colors min-h-[140px]",
              isToday
                ? "bg-terra/10 border border-terra/30"
                : "hover:bg-surface-muted border border-transparent",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-muted uppercase">
                {shortDayLabel(day)}
              </span>
              <span
                className={clsx(
                  "text-sm font-bold",
                  isToday ? "text-terra" : "text-primary",
                )}
              >
                {dayNumber(day)}
              </span>
            </div>

            <div className="space-y-1 flex-1">
              {tasksForDay.slice(0, 5).map((task) => (
                <div
                  key={task.task_id}
                  className={clsx(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium truncate",
                    task.constraint_applied
                      ? "border border-dashed border-muted text-muted"
                      : "text-primary",
                    task.status === "completed" && "line-through opacity-50",
                    isSetAside(task.status) && "opacity-50",
                  )}
                  style={
                    !task.constraint_applied
                      ? { backgroundColor: `${task.color}20`, borderLeft: `2px solid ${task.color}` }
                      : undefined
                  }
                >
                  {task.title}
                </div>
              ))}
              {tasksForDay.length > 5 && (
                <p className="text-[10px] text-muted">
                  +{tasksForDay.length - 5} more
                </p>
              )}
            </div>
          </button>
        );
      })}
      </div>
    </div>
  );
}

// ===========================================================================
// MONTH GRID
// ===========================================================================

interface MonthGridProps {
  allTasks: ScheduleTask[];
  selectedDate: Date;
  now: Date;
  onSelectDay: (date: Date) => void;
}

function MonthGrid({ allTasks, selectedDate, now, onSelectDay }: MonthGridProps) {
  const monthStart = startOfMonth(selectedDate);
  const calStart = startOfWeek(monthStart);
  const currentMonth = selectedDate.getMonth();

  // Build 6 weeks (42 cells)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(calStart, i));

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-xl border border-border bg-surface-card p-3">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-[10px] font-semibold text-muted uppercase py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, now);
          const tasksForDay = tasksOnDay(allTasks, day);
          // Collect unique colors
          const dotColors = Array.from(
            new Set(
              tasksForDay
                .filter((t) => !t.constraint_applied)
                .map((t) => t.color),
            ),
          ).slice(0, 4);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={clsx(
                "flex flex-col items-center rounded-lg py-2 px-1 transition-colors min-h-[60px]",
                !isCurrentMonth && "opacity-30",
                isToday
                  ? "bg-terra/10 border border-terra/30"
                  : "hover:bg-surface-muted border border-transparent",
              )}
            >
              <span
                className={clsx(
                  "text-xs font-semibold",
                  isToday ? "text-terra" : "text-primary",
                )}
              >
                {dayNumber(day)}
              </span>
              {tasksForDay.length > 0 && (
                <>
                  <span className="text-[10px] text-muted mt-0.5">
                    {tasksForDay.length}
                  </span>
                  <div className="flex gap-0.5 mt-1">
                    {dotColors.map((c) => (
                      <div
                        key={c}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
