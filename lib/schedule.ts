/**
 * Pure helpers for the Schedule page's Day, Week and Month grids. A task the
 * backend gave no slot (`unscheduled`) carries a placeholder start — 8 AM today,
 * lib/transforms.ts — that is not a time anyone chose: the grids never draw it,
 * and the "Not scheduled yet" strip lists it instead. No React, no fetch.
 */

import { taskStatusDisplay } from "./constants";
import type { ScheduleTask } from "./types";

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The slotted tasks whose start falls on `day` (local clock), in the order given. Never an `unscheduled` task. */
export function tasksOnDay(tasks: ScheduleTask[], day: Date): ScheduleTask[] {
  return tasks.filter((t) => !t.unscheduled && isSameLocalDay(t.start_time, day));
}

/**
 * The tasks with no slot yet that are still to do, sorted by title. One done or
 * set aside has no day to show it on, so it is left out.
 */
export function unscheduledPending(tasks: ScheduleTask[]): ScheduleTask[] {
  return tasks
    .filter((t) => t.unscheduled && taskStatusDisplay(t.status).kind === "pending")
    .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
}

/** One task as the Day grid places it: start and length in minutes of the day. */
export interface DayBlockInput {
  id: string;
  startMinute: number;
  durationMinutes: number;
}

/** Where a block is drawn: pixels from the grid's top, its height, and its column. */
export interface DayBlockLayout {
  top: number;
  height: number;
  /** Zero-based column within its cluster of overlapping blocks. */
  lane: number;
  /** How many columns that cluster is split into. */
  lanes: number;
}

/**
 * Lays out the Day grid's blocks. Each block is drawn at least `minHeightPx` tall so
 * its title, time and controls fit, and columns are assigned on that drawn extent,
 * not the task's own minutes: a short task drawn taller than its slot moves the next
 * task beside it instead of under it. Blocks that touch end-to-end share a column.
 */
export function layoutDayBlocks(
  items: DayBlockInput[],
  opts: { gridStartMinute: number; pxPerMinute: number; minHeightPx: number },
): Map<string, DayBlockLayout> {
  const minMinutes = opts.minHeightPx / opts.pxPerMinute;
  const drawn = items
    .map((t) => {
      const start = Math.max(t.startMinute, opts.gridStartMinute);
      const end = Math.max(t.startMinute + t.durationMinutes, start + minMinutes);
      return { id: t.id, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = new Map<string, DayBlockLayout>();
  let cluster: { id: string; start: number; end: number; lane: number }[] = [];
  let laneEnds: number[] = [];

  const flush = () => {
    const lanes = laneEnds.length || 1;
    for (const c of cluster) {
      result.set(c.id, {
        top: (c.start - opts.gridStartMinute) * opts.pxPerMinute,
        height: (c.end - c.start) * opts.pxPerMinute,
        lane: c.lane,
        lanes,
      });
    }
    cluster = [];
    laneEnds = [];
  };

  for (const t of drawn) {
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
