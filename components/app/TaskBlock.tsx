"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ScheduleTask } from "@/lib/types";
import clsx from "clsx";

interface TaskBlockProps {
  task: ScheduleTask;
  isActive: boolean;
  progressMinutes: number;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TaskBlock({ task, isActive, progressMinutes }: TaskBlockProps) {
  const isCompleted = task.status === "completed";
  const isSkipped = task.status === "skipped";
  const remaining = task.duration_minutes - progressMinutes;
  const progressPercent = task.duration_minutes > 0
    ? Math.min(100, Math.round((progressMinutes / task.duration_minutes) * 100))
    : 0;

  return (
    <div className="flex gap-3">
      {/* Time label */}
      <div className="w-[52px] shrink-0 pt-2.5 text-right text-xs text-muted">
        {formatTime(task.start_time)}
      </div>

      {/* Task card */}
      <div
        className={clsx(
          "flex-1 rounded-[10px] border-l-[3px] px-3.5 py-2.5 transition-all",
          isCompleted && "border-sage bg-sage/[0.08] opacity-60",
          isSkipped && "border-muted bg-surface-muted opacity-40",
          isActive && "border-terra bg-terra/[0.06] shadow-md",
          !isCompleted && !isActive && !isSkipped && "bg-opacity-[0.06]"
        )}
        style={
          !isCompleted && !isActive && !isSkipped
            ? { borderLeftColor: task.color, backgroundColor: `${task.color}0F` }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isCompleted && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-sage text-white">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
              <span
                className={clsx(
                  "text-sm font-medium text-primary",
                  isCompleted && "line-through opacity-70",
                  isSkipped && "line-through opacity-50"
                )}
              >
                {task.title}
              </span>
            </div>

            {/* Subtitle */}
            {isCompleted && task.completed_at && (
              <p className="mt-0.5 text-xs text-muted">
                Completed at {formatTime(task.completed_at)}
              </p>
            )}
            {isActive && (
              <p className="mt-0.5 text-xs text-terra">
                {remaining} min remaining
              </p>
            )}
            {!isCompleted && !isActive && !isSkipped && task.deadline_hint && (
              <p className="mt-0.5 text-xs text-muted">{task.deadline_hint}</p>
            )}
          </div>

          {/* Right side badge/button */}
          {isActive && (
            <div className="flex flex-col items-end gap-1.5">
              <Badge color="terra">IN PROGRESS</Badge>
              <Button size="sm" variant="primary">
                Open Workspace
              </Button>
            </div>
          )}
          {!isActive && !isCompleted && !isSkipped && (
            <Badge color="ink">PENDING</Badge>
          )}
          {isCompleted && (
            <Badge color="sage">DONE</Badge>
          )}
        </div>

        {/* Mini progress bar for active task */}
        {isActive && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-terra/20">
            <div
              className="h-full rounded-full bg-terra transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
