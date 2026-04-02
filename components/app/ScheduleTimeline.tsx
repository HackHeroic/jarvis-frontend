"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import TaskBlock from "@/components/app/TaskBlock";
import { EmptyState } from "@/components/app/EmptyState";
import type { ScheduleTask } from "@/lib/types";

interface ScheduleTimelineProps {
  tasks: ScheduleTask[];
}

export default function ScheduleTimeline({ tasks }: ScheduleTimelineProps) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);

  // Find where NOW falls in the schedule
  const nowIndex = useMemo(() => {
    for (let i = 0; i < tasks.length; i++) {
      if (now < tasks[i].start_time) return i; // NOW is before this task
      if (now >= tasks[i].start_time && now <= tasks[i].end_time) return i; // NOW is during this task
    }
    return tasks.length; // NOW is after all tasks
  }, [tasks, now]);

  // Detect active task: in_progress or first pending after NOW
  const activeIndex = tasks.findIndex(
    (t) => t.status === "in_progress",
  );
  const effectiveActive =
    activeIndex >= 0
      ? activeIndex
      : tasks.findIndex((t) => t.status === "pending");

  if (tasks.length === 0) {
    return (
      <Card className="px-5 py-8">
        <EmptyState
          icon="📋"
          headline="No tasks scheduled"
          subtitle="Start a brain dump in chat to build your schedule."
          ctaLabel="Go to Chat"
          onCta={() => router.push("/chat")}
        />
      </Card>
    );
  }

  // Compute progress minutes for active task
  function getProgressMinutes(task: ScheduleTask): number {
    if (task.status !== "in_progress") return 0;
    const elapsed = Math.round(
      (now.getTime() - task.start_time.getTime()) / 60_000,
    );
    return Math.max(0, Math.min(task.duration_minutes, elapsed));
  }

  return (
    <Card className="px-5 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">
          Today&apos;s Schedule
        </h2>
        <a
          href="/schedule"
          className="text-xs font-medium text-terra transition-colors hover:text-terra/80"
        >
          View full calendar &rarr;
        </a>
      </div>

      {/* Tasks with NOW indicator */}
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <div key={task.task_id}>
            {/* NOW indicator: render before the task where NOW falls */}
            {i === nowIndex && task.status !== "completed" && (
              <div className="my-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-terra shadow-[0_0_6px_rgba(212,119,90,0.5)]" />
                <div className="h-px flex-1 bg-terra/40" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-terra">
                  NOW
                </span>
                <div className="h-px flex-1 bg-terra/40" />
              </div>
            )}

            <div
              className="cursor-pointer"
              onClick={() => router.push(`/workspace/${task.task_id}`)}
            >
              <TaskBlock
                task={task}
                isActive={i === effectiveActive}
                progressMinutes={getProgressMinutes(task)}
              />
            </div>
          </div>
        ))}

        {/* NOW indicator at end if past all tasks */}
        {nowIndex === tasks.length && (
          <div className="my-3 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-terra shadow-[0_0_6px_rgba(212,119,90,0.5)]" />
            <div className="h-px flex-1 bg-terra/40" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-terra">
              NOW
            </span>
            <div className="h-px flex-1 bg-terra/40" />
          </div>
        )}
      </div>
    </Card>
  );
}
