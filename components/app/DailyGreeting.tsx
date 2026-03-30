"use client";

import clsx from "clsx";
import { DEMO_USER } from "@/lib/constants";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface DailyGreetingProps {
  taskCount: number;
  estimatedMinutes: number;
  focusMinutes?: number;
}

export default function DailyGreeting({ taskCount, estimatedMinutes, focusMinutes: _focusMinutes }: DailyGreetingProps) {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-[22px] font-bold text-primary">
          {getGreeting()}, {DEMO_USER.name}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {dayName} &middot; {formatDate(today)} &middot; {taskCount} tasks &middot;{" "}
          ~{estimatedMinutes} min estimated
        </p>
      </div>

      <div className="flex gap-1 rounded-button bg-surface-muted p-0.5">
        {(["Today", "Week", "Month"] as const).map((label) => (
          <button
            key={label}
            className={clsx(
              "rounded-button px-3 py-1.5 text-xs font-medium transition-colors",
              label === "Today"
                ? "bg-terra text-white"
                : "text-secondary hover:text-primary"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
