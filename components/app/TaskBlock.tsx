"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ScheduleTask } from "@/lib/types";
import { taskStatusDisplay } from "@/lib/constants";
import clsx from "clsx";
import { dueHintLabel } from "@/lib/schedule";

interface TaskBlockProps {
  task: ScheduleTask;
  /** The pending task whose slot is running right now. */
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
  const status = taskStatusDisplay(task.status);
  const isCompleted = status.kind === "done";
  const isSetAside = status.kind === "set_aside";
  const isPlain = !isCompleted && !isActive && !isSetAside;
  const remaining = task.duration_minutes - progressMinutes;
  const progressPercent = task.duration_minutes > 0
    ? Math.min(100, Math.round((progressMinutes / task.duration_minutes) * 100))
    : 0;

  return (
    <div className="flex gap-2 sm:gap-3">
      {/* Time label — a task with no slot yet has none */}
      <div className="w-[56px] shrink-0 whitespace-nowrap pt-2.5 text-right text-[11px] tabular-nums text-muted sm:text-xs">
        {task.unscheduled ? <span aria-label="No time yet">—</span> : formatTime(task.start_time)}
      </div>

      {/* Task card */}
      <div
        className={clsx(
          "min-w-0 flex-1 rounded-[10px] border-l-[3px] px-3 py-2.5 transition-all sm:px-3.5",
          isCompleted && "border-sage bg-sage/[0.08] opacity-60",
          // Set aside is neutral, not crossed out: nothing here is a failure.
          isSetAside && "border-border bg-surface-muted",
          isActive && "border-terra bg-terra/[0.06] shadow-md",
        )}
        style={isPlain ? { borderLeftColor: task.color, backgroundColor: `${task.color}0F` } : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {isCompleted && (
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage text-white">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
              <span
                className={clsx(
                  "min-w-0 break-words text-sm font-medium",
                  isSetAside ? "text-secondary" : "text-primary",
                  isCompleted && "line-through opacity-70",
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
            {isPlain && task.deadline_hint && (
              <p className="mt-0.5 text-xs text-muted">{dueHintLabel(task.deadline_hint)}</p>
            )}
          </div>

          {/* Right side: the status chip (every status has one), or Now for the running slot */}
          {isActive ? (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge color="terra">Now</Badge>
              {/* The whole row already opens the workspace — the button is
                  redundant on a phone and only forces the card wider */}
              <Button size="sm" variant="primary" className="hidden sm:inline-flex">
                Open Workspace
              </Button>
            </div>
          ) : (
            <div className="shrink-0">
              <Badge color={status.badge}>{status.label}</Badge>
            </div>
          )}
        </div>

        {/* Mini progress bar for the running slot */}
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
