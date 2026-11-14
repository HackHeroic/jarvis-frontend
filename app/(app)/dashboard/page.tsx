"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useJarvis } from "@/lib/context/JarvisContext";
import DailyGreeting from "@/components/app/DailyGreeting";
import StatsStrip from "@/components/app/StatsStrip";
import ScheduleTimeline from "@/components/app/ScheduleTimeline";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { WhileYouWereAway } from "@/components/app/WhileYouWereAway";
import { PendingDraftBanner } from "@/components/app/PendingDraftBanner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sparkles, Send } from "lucide-react";
import { toListState } from "@/lib/learning";
import type { PearlInsight } from "@/lib/types";

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { tasks, tasksLoading, tasksError, refreshTasks } = useJarvis();
  // Real tasks only: an outage shows ErrorState, a 200 with [] shows EmptyState.
  // While a fetch (or a Retry) is in flight with nothing to show, it is loading.
  const taskList = toListState({
    items: tasksLoading && tasks.length === 0 ? undefined : tasks,
    error: tasksLoading ? null : tasksError,
  });
  const isLive = taskList.kind === "ready" || taskList.kind === "empty";
  const [pearlInsights, setPearlInsights] = useState<PearlInsight[]>([]);
  const [brainDump, setBrainDump] = useState("");

  // ---- Load PEARL insights from localStorage ----
  useEffect(() => {
    try {
      const chatRaw = localStorage.getItem("jarvis-last-chat-response");
      if (chatRaw) {
        const parsed = JSON.parse(chatRaw);
        if (parsed.pearl_insights && parsed.pearl_insights.length > 0) {
          setPearlInsights(parsed.pearl_insights);
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
        if (typeof window === 'undefined') return 7;
        try {
          const s = localStorage.getItem("jarvis-streak-days");
          return s ? parseInt(s, 10) : 7;
        } catch {
          return 7;
        }
      })(),
      patternsLearned: (() => {
        if (typeof window === 'undefined') return 0;
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
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
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

      {/* What Jarvis prepared on its own: pending suggestions to accept or dismiss */}
      <WhileYouWereAway />

      {/* Pending plan: reviewed in chat, or (a suggestion's plan) acted on here */}
      <PendingDraftBanner />

      {/* PEARL Insights */}
      {pearlInsights.length > 0 && (
        <Card className="border-l-[3px] border-sage px-4 py-4 sm:px-5">
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

      {/* Schedule Timeline — or why there is none */}
      {taskList.kind === "loading" && (
        <div className="h-40 rounded-card bg-surface-muted animate-pulse" />
      )}
      {taskList.kind === "error" && (
        <Card className="px-4 py-8 sm:px-5">
          <ErrorState message={taskList.message} onRetry={() => refreshTasks()} />
        </Card>
      )}
      {taskList.kind === "empty" && (
        <Card className="px-4 py-8 sm:px-5">
          <EmptyState
            icon="💭"
            headline="Nothing planned yet — tell Jarvis what's on your mind."
            ctaLabel="Go to Chat"
            onCta={() => router.push("/chat")}
          />
        </Card>
      )}
      {taskList.kind === "ready" && <ScheduleTimeline tasks={taskList.items} />}

      {/* Quick Brain Dump */}
      <Card className="px-4 py-4 sm:px-5">
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
            className="min-w-0 flex-1 rounded-button border border-border bg-transparent px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-muted focus:border-terra"
          />
          <Button
            variant="primary"
            size="sm"
            className="shrink-0 px-4"
            onClick={handleBrainDump}
            disabled={!brainDump.trim()}
            aria-label="Send brain dump"
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
