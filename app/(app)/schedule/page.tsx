"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listTasks } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/app/EmptyState";
import {
  Clock,
  Check,
  SkipForward,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { apiTasksToScheduleTasks } from "@/lib/transforms";
import type { ScheduleTask } from "@/lib/types";

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

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { badge: "sage" | "terra" | "ink" | "gold"; label: string; icon: typeof Check }
> = {
  completed:   { badge: "sage",  label: "DONE",        icon: Check },
  in_progress: { badge: "terra", label: "IN PROGRESS", icon: Clock },
  pending:     { badge: "ink",   label: "PENDING",     icon: Clock },
  skipped:     { badge: "gold",  label: "SKIPPED",     icon: SkipForward },
};

// ---------------------------------------------------------------------------
// Schedule Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const raw = await listTasks();
        if (!cancelled) {
          setTasks(apiTasksToScheduleTasks(raw));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load schedule");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Find where NOW falls
  const nowIndex = useMemo(() => {
    for (let i = 0; i < tasks.length; i++) {
      if (now < tasks[i].start_time) return i;
      if (now >= tasks[i].start_time && now <= tasks[i].end_time) return i;
    }
    return tasks.length;
  }, [tasks, now]);

  // Today's date for header
  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary">Schedule</h1>
        <p className="mt-1 text-sm text-secondary">{todayLabel}</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-terra" />
          <p className="text-sm text-muted">Loading schedule...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="px-5 py-4 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
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

      {/* Timeline */}
      {!loading && tasks.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[26px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {tasks.map((task, i) => {
              const isActive = task.status === "in_progress" ||
                (task.status === "pending" && i === nowIndex);
              const isCompleted = task.status === "completed";
              const isSkipped = task.status === "skipped";
              const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

              return (
                <div key={task.task_id}>
                  {/* NOW indicator */}
                  {i === nowIndex && !isCompleted && (
                    <div className="my-3 flex items-center gap-2 pl-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-terra shadow-[0_0_6px_rgba(212,119,90,0.5)]" />
                      <div className="h-px flex-1 bg-terra/40" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-terra">
                        NOW
                      </span>
                      <div className="h-px flex-1 bg-terra/40" />
                    </div>
                  )}

                  <div
                    onClick={() => router.push(`/workspace/${task.task_id}`)}
                    className="group flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-subtle"
                  >
                    {/* Timeline dot */}
                    <div
                      className={clsx(
                        "relative z-10 mt-1 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border-2",
                        isCompleted && "border-sage bg-sage",
                        isActive && "border-terra bg-terra",
                        isSkipped && "border-muted bg-surface-muted",
                        !isCompleted && !isActive && !isSkipped && "border-border bg-surface-card",
                      )}
                    >
                      {isCompleted && <Check size={8} className="text-white" strokeWidth={3} />}
                    </div>

                    {/* Time */}
                    <div className="w-[70px] shrink-0 pt-0.5">
                      <p className="text-xs font-medium text-muted tabular-nums">
                        {formatTime(task.start_time)}
                      </p>
                      <p className="text-[10px] text-muted tabular-nums">
                        {formatTime(task.end_time)}
                      </p>
                    </div>

                    {/* Task card */}
                    <div
                      className={clsx(
                        "flex-1 rounded-[10px] border-l-[3px] px-3.5 py-2.5 transition-all",
                        isCompleted && "border-sage bg-sage/[0.06] opacity-60",
                        isActive && "border-terra bg-terra/[0.06] shadow-md",
                        isSkipped && "border-muted bg-surface-muted opacity-40",
                        !isCompleted && !isActive && !isSkipped && "bg-opacity-[0.06]",
                      )}
                      style={
                        !isCompleted && !isActive && !isSkipped
                          ? { borderLeftColor: task.color, backgroundColor: `${task.color}0F` }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={clsx(
                            "text-sm font-medium text-primary",
                            (isCompleted || isSkipped) && "line-through opacity-70",
                          )}
                        >
                          {task.title}
                        </span>
                        <Badge color={config.badge}>{config.label}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <Clock size={12} />
                        <span>{task.duration_minutes} min</span>
                        {task.deadline_hint && (
                          <>
                            <span className="text-border-strong">&middot;</span>
                            <span>{task.deadline_hint}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* NOW indicator at end */}
            {nowIndex === tasks.length && (
              <div className="my-3 flex items-center gap-2 pl-1">
                <div className="h-2.5 w-2.5 rounded-full bg-terra shadow-[0_0_6px_rgba(212,119,90,0.5)]" />
                <div className="h-px flex-1 bg-terra/40" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-terra">
                  NOW
                </span>
                <div className="h-px flex-1 bg-terra/40" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
