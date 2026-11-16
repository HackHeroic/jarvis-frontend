import { toListState, type ListState } from "./learning";
import type { MemoryRecord, ScheduleTask } from "./types";

// ---------------------------------------------------------------------------
// Color palette for auto-assigning goal colors (deterministic hash)
// ---------------------------------------------------------------------------

const PALETTE = ["#D97859", "#A8664F", "#9A725F", "#C88A5E", "#292724"];

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
      let unscheduled = false;
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
        // No slot yet: listed under "Not scheduled yet"; 8 AM today is only a placeholder.
        const today = new Date();
        today.setHours(8, 0, 0, 0);
        startTime = today;
        unscheduled = true;
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

      // The backend's TaskStatus (app/domain/entities.py); anything else reads as pending.
      const VALID_STATUSES = new Set(["pending", "completed", "skipped", "missed"]);
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
        ...(unscheduled ? { unscheduled: true } : {}),
        goal_id: (t.goal_id as string) || undefined,
        color: colorForGoal((t.goal_id as string) || undefined),
        deadline_hint: (t.deadline_hint as string) || undefined,
        constraint_applied: (t.constraint_applied as string) || undefined,
      } satisfies ScheduleTask;
    })
    .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
}

// ---------------------------------------------------------------------------
// Panel memories from a chat `complete` frame
// ---------------------------------------------------------------------------

/**
 * One `complete` frame panel memory — `{memory_id, memory_type, content,
 * confidence, provenance}` — as a `MemoryRecord`, or null when it has no
 * content. Older backends send no `memory_id`/`provenance`: the memory still
 * shows, with `memory_id` null, so it offers no confirm/forget actions.
 */
export function toPanelMemory(raw: unknown): MemoryRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  const content = typeof m.content === "string" ? m.content.trim() : "";
  if (!content) return null;
  const confidence = Number(m.confidence);
  const memory: MemoryRecord = {
    memory_id: typeof m.memory_id === "string" && m.memory_id ? m.memory_id : null,
    memory_type: typeof m.memory_type === "string" && m.memory_type ? m.memory_type : "fact",
    content,
    confidence: Number.isFinite(confidence) ? confidence : 0,
  };
  if (m.provenance === "said" || m.provenance === "inferred") memory.provenance = m.provenance;
  return memory;
}

/**
 * What the chat Memory panel shows. Once `GET /memories/` has answered, its
 * list and nothing else — so forgetting the last memory leaves the panel
 * empty, never back on the turn's memories. Before that, the turn's own
 * memories (if any) until the first read answers, else loading. An error wins
 * (an outage is never "empty") unless a read — a Retry — is in flight.
 */
export function toMemoryPanelState(r: {
  loaded: MemoryRecord[] | undefined;
  loading: boolean;
  error: unknown;
  frame: MemoryRecord[];
}): ListState<MemoryRecord> {
  if (r.error && !r.loading) return toListState({ error: r.error });
  if (r.loaded !== undefined) return toListState({ items: r.loaded });
  return r.frame.length ? { kind: "ready", items: r.frame } : { kind: "loading" };
}
