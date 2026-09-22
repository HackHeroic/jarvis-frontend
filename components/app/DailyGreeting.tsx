"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
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

const VIEW_HREFS: Record<string, string> = {
  Today: "/schedule",
  Week: "/schedule?view=week",
  Month: "/schedule?view=month",
};

export default function DailyGreeting({ taskCount, estimatedMinutes }: DailyGreetingProps) {
  const router = useRouter();
  const today = new Date();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight text-primary sm:text-[22px]">
          {getGreeting()}, {DEMO_USER.name}
        </h1>
        {/* The three facts wrap as whole phrases instead of breaking mid-clause */}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-secondary sm:text-sm">
          <span className="whitespace-nowrap">{formatDate(today)}</span>
          <span aria-hidden="true" className="text-muted">
            &middot;
          </span>
          <span className="whitespace-nowrap">{taskCount} tasks</span>
          <span aria-hidden="true" className="text-muted">
            &middot;
          </span>
          <span className="whitespace-nowrap">~{estimatedMinutes} min estimated</span>
        </p>
      </div>

      <div className="flex shrink-0 gap-1 self-start rounded-button bg-surface-muted p-0.5">
        {(["Today", "Week", "Month"] as const).map((label) => {
          const isActive = label === "Today";

          return (
            <button
              key={label}
              onClick={() => {
                if (label === "Today") return;
                router.push(VIEW_HREFS[label]);
              }}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "rounded-button px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-terra text-white"
                  : "text-secondary hover:text-primary hover:bg-surface-subtle cursor-pointer"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
