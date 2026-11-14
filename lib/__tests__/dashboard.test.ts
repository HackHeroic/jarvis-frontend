/**
 * The dashboard's schedule card and stat tiles: which tasks fall in the selected
 * range (on the user's local clock), how they group by day, what the tiles count,
 * and how a task's status reads. Dates are built with local-time constructors, so
 * these hold in any zone.
 */
import { describe, expect, it } from "vitest";
import {
  activeTaskId,
  dayHeading,
  focusMinutesToday,
  rangeBounds,
  rangeHeading,
  rangeStats,
  streakLabel,
  tasksInRange,
} from "@/lib/dashboard";
import { isSetAside, taskStatusDisplay } from "@/lib/constants";
import { apiTasksToScheduleTasks } from "@/lib/transforms";
import type { ScheduleTask, TaskStatus } from "@/lib/types";

// Saturday 14 November 2026, 15:30 local.
const NOW = new Date(2026, 10, 14, 15, 30);

let seq = 0;
function task(
  start: Date | null,
  status: TaskStatus = "pending",
  over: Partial<ScheduleTask> = {},
): ScheduleTask {
  seq += 1;
  const begin = start ?? new Date(2026, 10, 14, 8, 0);
  const duration = over.duration_minutes ?? 25;
  return {
    task_id: `t${seq}`,
    title: `Task ${seq}`,
    start_time: begin,
    end_time: new Date(begin.getTime() + duration * 60_000),
    duration_minutes: duration,
    status,
    color: "#000",
    ...(start ? {} : { unscheduled: true }),
    ...over,
  };
}

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

describe("taskStatusDisplay (one helper for every status chip)", () => {
  it("pending reads Pending", () => {
    expect(taskStatusDisplay("pending")).toMatchObject({ label: "Pending", kind: "pending" });
  });

  it("completed reads Done", () => {
    expect(taskStatusDisplay("completed")).toMatchObject({ label: "Done", kind: "done", badge: "sage" });
  });

  it("skipped and missed both read 'Set aside' in a neutral colour — never blank, never 'missed'", () => {
    for (const status of ["skipped", "missed"]) {
      const shown = taskStatusDisplay(status);
      expect(shown).toEqual({ label: "Set aside", kind: "set_aside", badge: "ink" });
      expect(shown.label.toLowerCase()).not.toContain("miss");
      expect(isSetAside(status)).toBe(true);
    }
    expect(isSetAside("pending")).toBe(false);
    expect(isSetAside("completed")).toBe(false);
  });

  it("a status the backend does not write reads as pending, not as its raw name", () => {
    expect(taskStatusDisplay("in_progress").label).toBe("Pending");
    expect(taskStatusDisplay("").label).toBe("Pending");
  });
});

describe("apiTasksToScheduleTasks (statuses and slots off the wire)", () => {
  it("keeps the four backend statuses and reads anything else as pending", () => {
    const tasks = apiTasksToScheduleTasks(
      ["pending", "completed", "skipped", "missed", "in_progress", "pacing_pushed"].map((status, i) => ({
        task_id: `t${i}`,
        title: status,
        status,
        duration_minutes: 25,
        scheduled_start: `2026-11-14T0${i}:00:00Z`,
      })),
    );
    expect(tasks.map((t) => t.status)).toEqual([
      "pending",
      "completed",
      "skipped",
      "missed",
      "pending",
      "pending",
    ]);
  });

  it("a task with no slot is marked unscheduled; one with a slot is not", () => {
    const tasks = apiTasksToScheduleTasks([
      { task_id: "a", title: "A", status: "pending", duration_minutes: 25, scheduled_start: "2026-11-14T03:30:00Z" },
      { task_id: "b", title: "B", status: "pending", duration_minutes: 25, scheduled_start: null },
    ]);
    const byId = (id: string) => tasks.find((t) => t.task_id === id);
    expect(byId("a")?.unscheduled).toBeFalsy();
    expect(byId("b")?.unscheduled).toBe(true);
  });
});

describe("rangeBounds (on the local clock)", () => {
  it("today runs midnight to midnight", () => {
    expect(rangeBounds("today", NOW)).toEqual({ start: at(14, 0), end: at(15, 0) });
  });

  it("the week runs Sunday to Saturday, like the Schedule page's week", () => {
    expect(rangeBounds("week", NOW)).toEqual({ start: at(8, 0), end: at(15, 0) });
  });

  it("the month is the calendar month", () => {
    expect(rangeBounds("month", NOW)).toEqual({
      start: new Date(2026, 10, 1),
      end: new Date(2026, 11, 1),
    });
  });
});

describe("tasksInRange", () => {
  const yesterday = task(at(13, 19), "completed");
  const todayLate = task(at(14, 19), "pending");
  const todayEarly = task(at(14, 9), "skipped");
  const tomorrow = task(at(15, 10), "pending");
  const lastWeek = task(at(3, 10), "completed");
  const lastMonth = task(new Date(2026, 9, 28, 10), "completed");
  const loose = task(null, "pending");
  const looseDone = task(null, "completed");
  const all = [lastMonth, todayLate, yesterday, loose, tomorrow, todayEarly, lastWeek, looseDone];

  it("today: only tasks whose slot starts on the local day, sorted by time", () => {
    const view = tasksInRange(all, "today", NOW);
    expect(view.inRange.map((t) => t.task_id)).toEqual([todayEarly.task_id, todayLate.task_id]);
    expect(view.days).toHaveLength(1);
    expect(view.days[0].tasks.map((t) => t.task_id)).toEqual([todayEarly.task_id, todayLate.task_id]);
  });

  it("a task at 23:59 belongs to its own day, one at 00:00 the next day to the next", () => {
    const lastMinute = task(at(14, 23, 59));
    const nextMidnight = task(at(15, 0));
    const view = tasksInRange([nextMidnight, lastMinute], "today", NOW);
    expect(view.inRange.map((t) => t.task_id)).toEqual([lastMinute.task_id]);
  });

  it("week: grouped by day in order, each day sorted by time", () => {
    const view = tasksInRange(all, "week", NOW);
    expect(view.days.map((d) => d.key)).toEqual(["2026-11-13", "2026-11-14"]);
    expect(view.days[1].tasks.map((t) => t.task_id)).toEqual([todayEarly.task_id, todayLate.task_id]);
    expect(view.inRange).toHaveLength(3);
  });

  it("month: every day of the calendar month that has a task, nothing from last month", () => {
    const view = tasksInRange(all, "month", NOW);
    expect(view.days.map((d) => d.key)).toEqual(["2026-11-03", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(view.inRange.map((t) => t.task_id)).not.toContain(lastMonth.task_id);
  });

  it("tasks without a slot are kept apart, last, and only while still pending", () => {
    for (const range of ["today", "week", "month"] as const) {
      const view = tasksInRange(all, range, NOW);
      expect(view.unscheduled.map((t) => t.task_id)).toEqual([loose.task_id]);
      expect(view.inRange.map((t) => t.task_id)).not.toContain(loose.task_id);
    }
  });

  it("no tasks today is an empty day list, not every task ever", () => {
    const view = tasksInRange([yesterday, lastWeek], "today", NOW);
    expect(view.inRange).toEqual([]);
    expect(view.days).toEqual([]);
  });
});

describe("rangeStats (the header line and the Tasks-done tile)", () => {
  it("counts done out of every task in the range, and the minutes they carry", () => {
    const view = tasksInRange(
      [
        task(at(14, 9), "completed", { duration_minutes: 30 }),
        task(at(14, 10), "skipped", { duration_minutes: 25 }),
        task(at(14, 11), "pending", { duration_minutes: 45 }),
        task(at(13, 11), "completed", { duration_minutes: 60 }),
        task(null, "pending", { duration_minutes: 20 }),
      ],
      "today",
      NOW,
    );
    expect(rangeStats(view)).toEqual({ total: 3, done: 1, setAside: 1, minutes: 100, unscheduled: 1 });
  });
});

describe("focusMinutesToday", () => {
  it("adds work scheduled today (pending or done), never set-aside work or other days", () => {
    const tasks = [
      task(at(14, 9), "completed", { duration_minutes: 30 }),
      task(at(14, 19), "pending", { duration_minutes: 45 }),
      task(at(14, 10), "skipped", { duration_minutes: 25 }),
      task(at(14, 11), "missed", { duration_minutes: 25 }),
      task(at(13, 19), "completed", { duration_minutes: 60 }),
      task(at(15, 9), "pending", { duration_minutes: 60 }),
      task(null, "pending", { duration_minutes: 60 }),
    ];
    expect(focusMinutesToday(tasks, NOW)).toBe(75);
  });

  it("a task done today counts on the day it was done, even if its slot was yesterday", () => {
    const tasks = [task(at(13, 19), "completed", { duration_minutes: 40, completed_at: at(14, 8) })];
    expect(focusMinutesToday(tasks, NOW)).toBe(40);
  });

  it("three weeks of history do not add up into today", () => {
    // Every evening from Oct 24 to yesterday (Nov 13), all done.
    const history = Array.from({ length: 21 }, (_, i) =>
      task(new Date(2026, 9, 24 + i, 19), "completed", { duration_minutes: 60 }),
    );
    expect(focusMinutesToday(history, NOW)).toBe(0);
  });
});

describe("streakLabel (the Streak tile: the number GET /you sends, as it is)", () => {
  it("streakLabel shows — until /you answers, then 1 day / N days", () => {
    expect(streakLabel(null)).toBe("—");
    expect(streakLabel(0)).toBe("0 days");
    expect(streakLabel(1)).toBe("1 day");
    expect(streakLabel(12)).toBe("12 days");
  });
});

describe("activeTaskId (the task whose slot is running now)", () => {
  it("a pending task whose slot contains now", () => {
    const running = task(at(14, 15, 15), "pending", { duration_minutes: 30 });
    expect(activeTaskId([task(at(14, 9)), running, task(at(14, 19))], NOW)).toBe(running.task_id);
  });

  it("none when no pending slot covers now — a later task is not 'in progress'", () => {
    expect(activeTaskId([task(at(14, 19)), task(at(14, 15, 15), "completed", { duration_minutes: 30 })], NOW)).toBeNull();
  });
});

describe("headings", () => {
  it("names the range", () => {
    expect(rangeHeading("today", NOW)).toBe("Saturday, November 14");
    expect(rangeHeading("week", NOW)).toBe("Nov 8 – Nov 14");
    expect(rangeHeading("month", NOW)).toBe("November 2026");
  });

  it("names a day relative to today", () => {
    expect(dayHeading(at(14, 0), NOW)).toBe("Today");
    expect(dayHeading(at(13, 0), NOW)).toBe("Yesterday");
    expect(dayHeading(at(15, 0), NOW)).toBe("Tomorrow");
    expect(dayHeading(at(9, 0), NOW)).toBe("Mon, Nov 9");
  });
});
