import type { ScheduleTask } from "./types";

// ---------------------------------------------------------------------------
// Color palette for auto-assigning goal colors (deterministic hash)
// ---------------------------------------------------------------------------

const PALETTE = ["#D4775A", "#4A7B6B", "#6B7FB5", "#C9A84C", "#3D3D3D"];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function colorForGoal(goalId?: string): string {
  if (!goalId) return PALETTE[0];
  return PALETTE[hashCode(goalId) % PALETTE.length];
}

// ---------------------------------------------------------------------------
// Convert API task records to ScheduleTask
// ---------------------------------------------------------------------------

export function apiTasksToScheduleTasks(
  raw: Record<string, unknown>[],
): ScheduleTask[] {
  return raw
    .map((t) => {
      let startTime: Date;
      if (t.start_time) {
        startTime = new Date(t.start_time as string);
      } else if (t.scheduled_start) {
        startTime = new Date(t.scheduled_start as string);
      } else if (t.horizon_start && typeof t.start_min === "number") {
        startTime = new Date(
          new Date(t.horizon_start as string).getTime() +
            (t.start_min as number) * 60_000,
        );
      } else {
        const today = new Date();
        today.setHours(8, 0, 0, 0);
        startTime = today;
        console.warn(
          `[transforms] Task "${t.title || t.task_id}" has no start time — defaulting to 8 AM today`,
        );
      }

      let dur = t.duration_minutes as number;
      if (!dur || dur <= 0) {
        dur = 25;
        console.warn(
          `[transforms] Task "${t.title || t.task_id}" has no duration — defaulting to 25 min`,
        );
      }

      const endTime = t.end_time
        ? new Date(t.end_time as string)
        : t.scheduled_end
          ? new Date(t.scheduled_end as string)
          : new Date(startTime.getTime() + dur * 60_000);

      const VALID_STATUSES = new Set(["pending", "in_progress", "completed", "skipped"]);
      const rawStatus = (t.status as string) || "pending";
      const status = VALID_STATUSES.has(rawStatus)
        ? (rawStatus as ScheduleTask["status"])
        : "pending";

      return {
        task_id: (t.task_id as string) || (t.id as string) || "",
        title: (t.title as string) || "Untitled",
        start_time: startTime,
        end_time: endTime,
        duration_minutes: dur,
        status,
        completed_at: t.completed_at
          ? new Date(t.completed_at as string)
          : undefined,
        goal_id: (t.goal_id as string) || undefined,
        color: colorForGoal((t.goal_id as string) || undefined),
        deadline_hint: (t.deadline_hint as string) || undefined,
        constraint_applied: (t.constraint_applied as string) || undefined,
      } satisfies ScheduleTask;
    })
    .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
}
