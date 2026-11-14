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
