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
      const startTime = t.start_time
        ? new Date(t.start_time as string)
        : t.horizon_start && typeof t.start_min === "number"
          ? new Date(
              new Date(t.horizon_start as string).getTime() +
                (t.start_min as number) * 60_000,
            )
          : new Date();
      const dur = (t.duration_minutes as number) || 25;
      const endTime = t.end_time
        ? new Date(t.end_time as string)
        : new Date(startTime.getTime() + dur * 60_000);

      const status =
        (t.status as ScheduleTask["status"]) || "pending";

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
