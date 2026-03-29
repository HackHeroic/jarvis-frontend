"use client";

import { Card } from "@/components/ui/Card";
import TaskBlock from "@/components/app/TaskBlock";
import type { ScheduleTask } from "@/lib/types";

interface ScheduleTimelineProps {
  tasks: ScheduleTask[];
}

export default function ScheduleTimeline({ tasks }: ScheduleTimelineProps) {
  // Detect active task: first pending or in_progress
  const activeIndex = tasks.findIndex(
    (t) => t.status === "pending" || t.status === "in_progress"
  );

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

      {/* NOW indicator */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-terra" />
        <div className="h-px flex-1 bg-terra/40" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-terra">
          NOW
        </span>
        <div className="h-px flex-1 bg-terra/40" />
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <TaskBlock
            key={task.task_id}
            task={task}
            isActive={i === activeIndex}
            progressMinutes={
              i === activeIndex && task.status === "in_progress" ? 12 : 0
            }
          />
        ))}
      </div>
    </Card>
  );
}
