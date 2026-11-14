/**
 * Pure helpers for the dashboard's schedule card and stat tiles: which tasks fall
 * in the selected range on the user's local clock, how they group by day, and
 * what the tiles count. No React, no fetch — unit-tested with Vitest.
 */

import { taskStatusDisplay } from "./constants";
import type { ScheduleTask } from "./types";

export type DashboardRange = "today" | "week" | "month";

// ---------------------------------------------------------------------------
// Local days
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The local calendar day of `d`, as "YYYY-MM-DD". */
export function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The selected range as [start, end) on the local clock: today, the week (Sunday
 * to Saturday, like the Schedule page's week view), or the calendar month.
 */
export function rangeBounds(range: DashboardRange, now: Date): { start: Date; end: Date } {
  const today = startOfDay(now);
  if (range === "today") return { start: today, end: addDays(today, 1) };
  if (range === "week") {
    const start = addDays(today, -today.getDay());
    return { start, end: addDays(start, 7) };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

// ---------------------------------------------------------------------------
// Tasks in a range
// ---------------------------------------------------------------------------

export interface DayGroup {
  /** The local day, "YYYY-MM-DD". */
  key: string;
  /** Local midnight of that day. */
  date: Date;
  /** Sorted by start time. */
  tasks: ScheduleTask[];
}

export interface RangeView {
  /** Days that have a task, in order. */
  days: DayGroup[];
  /** Every slotted task in the range, sorted by start time. */
  inRange: ScheduleTask[];
  /** Pending tasks with no slot yet, listed last as "Not scheduled yet". */
  unscheduled: ScheduleTask[];
}

const byStart = (a: ScheduleTask, b: ScheduleTask) =>
  a.start_time.getTime() - b.start_time.getTime();

/**
 * The tasks whose slot starts inside the range, grouped by local day. A task with
 * no slot belongs to no day: it is kept apart while it is still pending, and left
 * out once done or set aside (it has no day to show it on).
 */
export function tasksInRange(tasks: ScheduleTask[], range: DashboardRange, now: Date): RangeView {
  const { start, end } = rangeBounds(range, now);
  const inRange = tasks
    .filter((t) => !t.unscheduled && t.start_time >= start && t.start_time < end)
    .sort(byStart);
  const days: DayGroup[] = [];
  for (const task of inRange) {
    const key = localDayKey(task.start_time);
    const last = days[days.length - 1];
    if (last?.key === key) last.tasks.push(task);
    else days.push({ key, date: startOfDay(task.start_time), tasks: [task] });
  }
  const unscheduled = tasks.filter(
    (t) => t.unscheduled && taskStatusDisplay(t.status).kind === "pending",
  );
  return { days, inRange, unscheduled };
}

export interface RangeStats {
  /** Slotted tasks in the range. */
  total: number;
  done: number;
  setAside: number;
  /** The minutes those tasks carry. */
  minutes: number;
  /** Pending tasks with no slot yet (not in `total`). */
  unscheduled: number;
}

/** What the header line and the "Tasks done" tile say about the range. */
export function rangeStats(view: RangeView): RangeStats {
  let done = 0;
  let setAside = 0;
  let minutes = 0;
  for (const t of view.inRange) {
    const kind = taskStatusDisplay(t.status).kind;
    if (kind === "done") done += 1;
    if (kind === "set_aside") setAside += 1;
    minutes += t.duration_minutes;
  }
  return { total: view.inRange.length, done, setAside, minutes, unscheduled: view.unscheduled.length };
}

// ---------------------------------------------------------------------------
// Stat tiles
// ---------------------------------------------------------------------------

/** The local day a finished task counts on: when it was done, else its slot's day. */
function doneDay(t: ScheduleTask): string | null {
  if (t.completed_at && !Number.isNaN(t.completed_at.getTime())) return localDayKey(t.completed_at);
  return t.unscheduled ? null : localDayKey(t.start_time);
}

/**
 * Minutes of work scheduled or done today: pending tasks slotted today, and tasks
 * done today (on the day they were done, when the backend says). Set-aside work
 * and other days never count.
 */
export function focusMinutesToday(tasks: ScheduleTask[], now: Date): number {
  const today = localDayKey(now);
  let minutes = 0;
  for (const t of tasks) {
    const kind = taskStatusDisplay(t.status).kind;
    if (kind === "set_aside") continue;
    const day = kind === "done" ? doneDay(t) : t.unscheduled ? null : localDayKey(t.start_time);
    if (day === today) minutes += t.duration_minutes;
  }
  return minutes;
}

/**
 * Consecutive local days with at least one task done, counted back from today.
 * Today is not over: with nothing done yet today, the count runs back from
 * yesterday, so an evening streak is not reset at breakfast.
 */
export function completionStreak(tasks: ScheduleTask[], now: Date): number {
  const days = new Set<string>();
  for (const t of tasks) {
    if (taskStatusDisplay(t.status).kind !== "done") continue;
    const day = doneDay(t);
    if (day) days.add(day);
  }
  let day = startOfDay(now);
  if (!days.has(localDayKey(day))) day = addDays(day, -1);
  let streak = 0;
  while (days.has(localDayKey(day))) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** The pending task whose slot is running right now, if any. */
export function activeTaskId(tasks: ScheduleTask[], now: Date): string | null {
  const running = tasks.find(
    (t) =>
      !t.unscheduled &&
      taskStatusDisplay(t.status).kind === "pending" &&
      t.start_time <= now &&
      now < t.end_time,
  );
  return running?.task_id ?? null;
}

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

/** The range in words: "Saturday, November 14" · "Nov 8 – Nov 14" · "November 2026". */
export function rangeHeading(range: DashboardRange, now: Date): string {
  if (range === "today") {
    return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }
  if (range === "week") {
    const { start, end } = rangeBounds("week", now);
    const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${short(start)} – ${short(addDays(end, -1))}`;
  }
  return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** A day's header: "Today", "Yesterday", "Tomorrow", else "Mon, Nov 9". */
export function dayHeading(date: Date, now: Date): string {
  const key = localDayKey(date);
  const today = startOfDay(now);
  if (key === localDayKey(today)) return "Today";
  if (key === localDayKey(addDays(today, -1))) return "Yesterday";
  if (key === localDayKey(addDays(today, 1))) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
