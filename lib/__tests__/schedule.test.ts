/**
 * The Schedule page's grids and its "Not scheduled yet" strip. A task the backend
 * gave no slot carries a placeholder start (8 AM today, lib/transforms.ts) that is
 * never a real time: no grid may draw it. Dates are local-time constructors.
 */
import { describe, expect, it } from "vitest";
import { tasksOnDay, unscheduledPending } from "@/lib/schedule";
import { apiTasksToScheduleTasks } from "@/lib/transforms";
import type { ScheduleTask, TaskStatus } from "@/lib/types";

let seq = 0;
function task(
  start: Date | null,
  status: TaskStatus = "pending",
  over: Partial<ScheduleTask> = {},
): ScheduleTask {
  seq += 1;
  const begin = start ?? new Date(2026, 10, 14, 8, 0); // the placeholder transforms.ts uses
  return {
    task_id: `t${seq}`,
    title: `Task ${seq}`,
    start_time: begin,
    end_time: new Date(begin.getTime() + 25 * 60_000),
    duration_minutes: 25,
    status,
    color: "#000",
    ...(start ? {} : { unscheduled: true }),
    ...over,
  };
}

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const ids = (tasks: ScheduleTask[]) => tasks.map((t) => t.task_id);

describe("tasksOnDay", () => {
  it("tasksOnDay never includes an unslotted task", () => {
    const slotted = task(at(14, 8)); // a real 8 AM slot
    const loose = task(null); // its start is the 8 AM placeholder, on the same day
    const looseDone = task(null, "completed");
    expect(ids(tasksOnDay([slotted, loose, looseDone], at(14, 0)))).toEqual([slotted.task_id]);
  });

  it("an unslotted task off the wire is not drawn either", () => {
    const tasks = apiTasksToScheduleTasks([
      { task_id: "slot", title: "Slotted", status: "pending", duration_minutes: 25, scheduled_start: new Date(2026, 10, 14, 10).toISOString() },
      { task_id: "none", title: "No slot", status: "pending", duration_minutes: 25, scheduled_start: null },
    ]);
    const today = tasks.find((t) => t.task_id === "none")!.start_time; // the placeholder's own day
    const drawn = tasksOnDay(tasks, today);
    expect(ids(drawn)).not.toContain("none");
  });

  it("keeps every slotted task of that local day, and no other day's", () => {
    const early = task(at(14, 0, 0));
    const late = task(at(14, 23, 59));
    const tomorrow = task(at(15, 0, 0));
    const yesterday = task(at(13, 23, 59));
    expect(ids(tasksOnDay([yesterday, early, late, tomorrow], at(14, 12)))).toEqual([
      early.task_id,
      late.task_id,
    ]);
  });
});

describe("unscheduledPending", () => {
  it("unscheduledPending lists pending unslotted tasks only", () => {
    const loose = task(null, "pending", { title: "Read chapter 4" });
    const looseDone = task(null, "completed", { title: "Already done" });
    const looseSkipped = task(null, "skipped", { title: "Set aside" });
    const looseMissed = task(null, "missed", { title: "Missed" });
    const slotted = task(at(14, 9), "pending", { title: "Slotted" });
    expect(ids(unscheduledPending([slotted, looseDone, loose, looseSkipped, looseMissed]))).toEqual([
      loose.task_id,
    ]);
  });

  it("sorted by title, whatever order they arrive in", () => {
    const b = task(null, "pending", { title: "Revise DBMS" });
    const a = task(null, "pending", { title: "arrays practice" });
    const c = task(null, "pending", { title: "Write the OS lab" });
    expect(unscheduledPending([b, c, a]).map((t) => t.title)).toEqual([
      "arrays practice",
      "Revise DBMS",
      "Write the OS lab",
    ]);
  });

  it("nothing unslotted is an empty strip", () => {
    expect(unscheduledPending([task(at(14, 9)), task(at(15, 9), "completed")])).toEqual([]);
  });
});
