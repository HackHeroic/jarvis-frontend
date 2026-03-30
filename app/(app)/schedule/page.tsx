"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listTasks, completeTask, skipTask } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/app/EmptyState";
import { SM2QualityRating } from "@/components/app/SM2QualityRating";
import {
  CheckCircle2,
  SkipForward,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { apiTasksToScheduleTasks } from "@/lib/transforms";
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

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-sage/20 border-sage",
  in_progress: "bg-terra/20 border-terra",
  pending: "bg-surface-muted border-border",
  skipped: "bg-surface-muted border-muted opacity-50",
};

// ---------------------------------------------------------------------------
// Schedule Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  // ---- Data fetch ----
  const loadTasks = useCallback(async () => {
    try {
      const raw = await listTasks();
      setAllTasks(apiTasksToScheduleTasks(raw));
    } catch {
      setAllTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ---- Tasks for selected day ----
  const dayTasks = useMemo(
    () => allTasks.filter((t) => isSameDay(t.start_time, selectedDate)),
    [allTasks, selectedDate],
  );

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
    setRatingTaskId(null);
    try {
      await completeTask(taskId, undefined, quality);
    } catch {
      // silently fail in demo
    }
    setAllTasks((prev) =>
      prev.map((t) =>
        t.task_id === taskId ? { ...t, status: "completed" as const } : t,
      ),
    );
  }

  async function handleSkip(taskId: string) {
    try {
      await skipTask(taskId);
    } catch {
      // silently fail in demo
    }
    setAllTasks((prev) =>
      prev.map((t) =>
        t.task_id === taskId ? { ...t, status: "skipped" as const } : t,
      ),
    );
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
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-terra" />
          <div>
            <h1 className="text-xl font-bold text-primary">Schedule</h1>
            <p className="text-sm text-secondary">{headerLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
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
            className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-secondary"
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
            className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-secondary"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-terra" />
          <p className="text-sm text-muted">Loading schedule...</p>
        </div>
      )}

      {/* Empty state */}
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
      {!loading && allTasks.length > 0 && viewMode === "week" && (
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
      {!loading && allTasks.length > 0 && viewMode === "month" && (
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
// DAY GRID
// ===========================================================================

interface DayGridProps {
  tasks: ScheduleTask[];
  now: Date;
  showNowLine: boolean;
  nowTop: number;
  ratingTaskId: string | null;
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
  onTaskClick,
  onComplete,
  onSkip,
  onRate,
  onCancelRating,
}: DayGridProps) {
  return (
    <div className="relative flex rounded-xl border border-border bg-surface-card overflow-hidden">
      {/* Hour labels */}
      <div className="w-16 shrink-0 border-r border-border">
        {HOURS.map((hour) => {
          const top = (hour * 60 - GRID_START_MINUTES) * PX_PER_MINUTE;
          return (
            <div
              key={hour}
              className="absolute text-[11px] font-medium text-muted tabular-nums"
              style={{ top, left: 0, width: 64, textAlign: "right", paddingRight: 12 }}
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
        {tasks.map((task) => {
          const startMin = getMinuteOfDay(task.start_time);
          const top = Math.max(0, (startMin - GRID_START_MINUTES) * PX_PER_MINUTE);
          const height = Math.max(task.duration_minutes * PX_PER_MINUTE, 28);
          const isBlocked = !!task.constraint_applied;
          const isActionable =
            task.status === "pending" || task.status === "in_progress";
          const showRating = ratingTaskId === task.task_id;

          return (
            <div
              key={task.task_id}
              className={clsx(
                "absolute left-2 right-2 z-10 rounded-lg px-3 py-1.5 transition-all overflow-hidden",
                isBlocked
                  ? "border-2 border-dashed border-muted bg-surface-muted/50 cursor-default"
                  : "border-l-[3px] cursor-pointer hover:shadow-md",
                !isBlocked && STATUS_COLORS[task.status],
              )}
              style={{
                top,
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
                      task.status === "skipped" && "line-through opacity-40",
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
                {isActionable && !isBlocked && !showRating && (
                  <div className="flex items-center gap-1 shrink-0">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkip(task.task_id);
                      }}
                      className="p-1 rounded-md hover:bg-gold/20 text-gold transition-colors"
                      title="Skip"
                    >
                      <SkipForward size={16} />
                    </button>
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
        })}
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
    <div className="grid grid-cols-7 gap-1 rounded-xl border border-border bg-surface-card p-2">
      {days.map((day) => {
        const isToday = isSameDay(day, now);
        const tasksForDay = allTasks.filter((t) => isSameDay(t.start_time, day));

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
                    task.status === "skipped" && "line-through opacity-30",
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
          const tasksForDay = allTasks.filter((t) => isSameDay(t.start_time, day));
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
