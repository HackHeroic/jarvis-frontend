"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listTasks } from "@/lib/api";
import DailyGreeting from "@/components/app/DailyGreeting";
import StatsStrip from "@/components/app/StatsStrip";
import ScheduleTimeline from "@/components/app/ScheduleTimeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, Send } from "lucide-react";
import type { ScheduleTask, PearlInsight } from "@/lib/types";

// ---------------------------------------------------------------------------
// Color palette for auto-assigning goal colors
// ---------------------------------------------------------------------------

const GOAL_COLORS: Record<string, string> = {};
const PALETTE = ["#D4775A", "#4A7B6B", "#6B7FB5", "#C9A84C", "#3D3D3D"];

function colorForGoal(goalId?: string): string {
  if (!goalId) return PALETTE[0];
  if (!GOAL_COLORS[goalId]) {
    GOAL_COLORS[goalId] = PALETTE[Object.keys(GOAL_COLORS).length % PALETTE.length];
  }
  return GOAL_COLORS[goalId];
}

// ---------------------------------------------------------------------------
// Demo fallback data
// ---------------------------------------------------------------------------

const today = new Date();
function timeToday(hour: number, minute: number): Date {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const DEMO_TASKS: ScheduleTask[] = [
  {
    task_id: "t1",
    title: "Calculus Review",
    start_time: timeToday(9, 0),
    end_time: timeToday(9, 30),
    duration_minutes: 30,
    status: "completed",
    completed_at: timeToday(9, 23),
    goal_id: "calc-101",
    color: "#6B7FB5",
  },
  {
    task_id: "t2",
    title: "History Research",
    start_time: timeToday(9, 30),
    end_time: timeToday(10, 0),
    duration_minutes: 30,
    status: "completed",
    completed_at: timeToday(9, 52),
    goal_id: "hist-201",
    color: "#4A7B6B",
  },
  {
    task_id: "t3",
    title: "Calculus Practice",
    start_time: timeToday(10, 0),
    end_time: timeToday(10, 30),
    duration_minutes: 30,
    status: "in_progress",
    goal_id: "calc-101",
    color: "#6B7FB5",
  },
  {
    task_id: "t4",
    title: "History Write Intro",
    start_time: timeToday(10, 30),
    end_time: timeToday(11, 0),
    duration_minutes: 30,
    status: "pending",
    goal_id: "hist-201",
    color: "#D4775A",
    deadline_hint: "Essay due Thursday",
  },
  {
    task_id: "t5",
    title: "Calculus Integration",
    start_time: timeToday(11, 0),
    end_time: timeToday(11, 30),
    duration_minutes: 30,
    status: "pending",
    goal_id: "calc-101",
    color: "#6B7FB5",
    deadline_hint: "Exam Friday",
  },
];

// ---------------------------------------------------------------------------
// Helpers: convert API task records to ScheduleTask
// ---------------------------------------------------------------------------

function apiTasksToScheduleTasks(
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
      } satisfies ScheduleTask;
    })
    .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ScheduleTask[]>(DEMO_TASKS);
  const [isLive, setIsLive] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [pearlInsights, setPearlInsights] = useState<PearlInsight[]>([]);
  const [brainDump, setBrainDump] = useState("");

  // ---- Fetch real tasks on mount ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await listTasks();
        if (!cancelled && raw.length > 0) {
          setTasks(apiTasksToScheduleTasks(raw));
          setIsLive(true);
        }
      } catch {
        // Backend unavailable — keep demo data
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load draft & PEARL insights from localStorage ----
  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem("jarvis-active-draft");
      if (draftRaw) {
        const parsed = JSON.parse(draftRaw);
        setActiveDraftId(parsed.draft_id || parsed.id || null);
      }
    } catch {
      // ignore
    }

    try {
      const chatRaw = localStorage.getItem("jarvis-last-chat-response");
      if (chatRaw) {
        const parsed = JSON.parse(chatRaw);
        if (parsed.pearl_insights && parsed.pearl_insights.length > 0) {
          setPearlInsights(parsed.pearl_insights);
        } else if (parsed.memories && parsed.memories.length > 0) {
          // Fall back to memory patterns
          setPearlInsights(
            parsed.memories
              .filter((m: Record<string, unknown>) => m.content)
              .slice(0, 3)
              .map((m: Record<string, unknown>) => ({
                insight: m.content as string,
                confidence: (m.confidence as number) || 0.5,
              })),
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // ---- Compute stats ----
  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "completed");
    const inProgress = tasks.find((t) => t.status === "in_progress");
    const progressMin = inProgress
      ? Math.min(
          inProgress.duration_minutes,
          Math.round(
            (Date.now() - inProgress.start_time.getTime()) / 60_000,
          ),
        )
      : 0;
    const focusMinutes =
      completed.reduce((s, t) => s + t.duration_minutes, 0) +
      Math.max(0, progressMin);

    return {
      tasksCompleted: completed.length,
      tasksTotal: tasks.length,
      focusMinutes,
      estimatedMinutes: tasks.reduce((s, t) => s + t.duration_minutes, 0),
      // Streak: count from localStorage or default
      streakDays: (() => {
        try {
          const s = localStorage.getItem("jarvis-streak-days");
          return s ? parseInt(s, 10) : 7;
        } catch {
          return 7;
        }
      })(),
      patternsLearned: (() => {
        try {
          const m = localStorage.getItem("jarvis-last-chat-response");
          if (m) {
            const parsed = JSON.parse(m);
            return (parsed.memories?.length as number) || 0;
          }
        } catch {
          // ignore
        }
        return 0;
      })(),
    };
  }, [tasks]);

  // ---- Brain dump submit ----
  function handleBrainDump() {
    if (!brainDump.trim()) return;
    const encoded = encodeURIComponent(brainDump.trim());
    router.push(`/chat?prompt=${encoded}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
      {/* Greeting */}
      <DailyGreeting
        taskCount={stats.tasksTotal}
        estimatedMinutes={stats.estimatedMinutes}
        focusMinutes={stats.focusMinutes}
      />

      {/* Stats */}
      <StatsStrip
        tasksCompleted={stats.tasksCompleted}
        tasksTotal={stats.tasksTotal}
        focusMinutes={stats.focusMinutes}
        streakDays={stats.streakDays}
        patternsLearned={stats.patternsLearned}
      />

      {/* Active Draft Banner */}
      {activeDraftId && (
        <Card className="flex items-center justify-between border-l-[3px] border-terra px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              You have a pending schedule
            </p>
            <p className="mt-0.5 text-xs text-secondary">
              Review and confirm your tasks before they go live.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/chat")}
          >
            Review
            <ArrowRight size={14} className="ml-1" />
          </Button>
        </Card>
      )}

      {/* PEARL Insights */}
      {pearlInsights.length > 0 && (
        <Card className="border-l-[3px] border-sage px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-sage" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sage">
              Jarvis Noticed
            </h3>
          </div>
          <ul className="space-y-1.5">
            {pearlInsights.map((p, i) => (
              <li key={i} className="text-sm text-primary">
                {p.insight}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Schedule Timeline */}
      <ScheduleTimeline tasks={tasks} />

      {/* Quick Brain Dump */}
      <Card className="px-5 py-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-secondary">
          Quick brain dump
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBrainDump()}
            placeholder="What's on your plate?"
            className="flex-1 rounded-button border border-border bg-transparent px-3 py-2 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-terra"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleBrainDump}
            disabled={!brainDump.trim()}
          >
            <Send size={14} />
          </Button>
        </div>
      </Card>

      {/* Live indicator */}
      {isLive && (
        <p className="text-center text-[10px] text-muted">
          Connected to Jarvis Engine
        </p>
      )}
    </div>
  );
}
