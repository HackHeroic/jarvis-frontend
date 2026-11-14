"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getYou } from "@/lib/api";
import { toListState } from "@/lib/learning";
import {
  focusMinutesToday,
  rangeHeading,
  rangeStats,
  tasksInRange,
  type DashboardRange,
} from "@/lib/dashboard";
import type { PearlInsight } from "@/lib/types";

/** Re-read the clock this often, so "today" stays today past midnight. */
const CLOCK_MS = 60_000;
/** The lower half waits this long, at most, for the suggestions before showing anyway. */
const REVEAL_TIMEOUT_MS = 4_000;

const DONE_LABELS: Record<DashboardRange, string> = {
  today: "Done today",
  week: "Done this week",
  month: "Done this month",
};

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
  const [range, setRange] = useState<DashboardRange>("today");
  const [now, setNow] = useState(() => new Date());
  // From GET /you, null until known (never a wrong number): how many patterns the
  // You page shows, and the streak — the backend's count, shown as it is.
  const [patterns, setPatterns] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState<number | null>(null);
  // Everything below the tiles appears at once, after the suggestions' first read
  // (or a short wait), so cards arriving late never push the schedule down.
  const [suggestionsSettled, setSuggestionsSettled] = useState(false);
  const onSuggestionsSettled = useCallback(() => setSuggestionsSettled(true), []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), CLOCK_MS);
    const reveal = setTimeout(() => setSuggestionsSettled(true), REVEAL_TIMEOUT_MS);
    return () => {
      clearInterval(clock);
      clearTimeout(reveal);
    };
  }, []);

  // ---- Patterns (the same list the You page shows) and the streak ----
  useEffect(() => {
    const controller = new AbortController();
    getYou({ signal: controller.signal })
      .then((you) => {
        if (controller.signal.aborted) return;
        setPatterns(you.patterns.length);
        // A backend that does not send it yet leaves the tile at "—".
        setStreakDays(you.streak_days ?? null);
      })
      .catch(() => {
        // Unknown stays "—": an outage is never "0 patterns" or a broken streak.
      });
    return () => controller.abort();
  }, []);

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

  // ---- The selected range, and the tiles ----
  const view = useMemo(() => tasksInRange(tasks, range, now), [tasks, range, now]);
  const stats = useMemo(() => rangeStats(view), [view]);
  const focusMinutes = useMemo(() => focusMinutesToday(tasks, now), [tasks, now]);
  // Once shown, it stays shown: a later Retry of the tasks never hides the rest again.
  const [ready, setReady] = useState(false);
  const firstReadsDone = suggestionsSettled && taskList.kind !== "loading";
  useEffect(() => {
    if (firstReadsDone) setReady(true);
  }, [firstReadsDone]);

  // ---- Brain dump submit ----
  function handleBrainDump() {
    if (!brainDump.trim()) return;
    const encoded = encodeURIComponent(brainDump.trim());
    router.push(`/chat?prompt=${encoded}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      {/* Greeting — its facts and the tiles describe the selected range */}
      <DailyGreeting
        now={now}
        range={range}
        onRangeChange={setRange}
        rangeLabel={rangeHeading(range, now)}
        taskCount={stats.total}
        estimatedMinutes={stats.minutes}
        unscheduledCount={stats.unscheduled}
      />

      {/* Stats */}
      <StatsStrip
        tasksCompleted={stats.done}
        tasksTotal={stats.total}
        doneLabel={DONE_LABELS[range]}
        focusMinutes={focusMinutes}
        streakDays={streakDays}
        patternsLearned={patterns}
      />

      {/* One placeholder until the suggestions and tasks have answered */}
      {!ready && (
        <div className="space-y-4 sm:space-y-5" aria-busy="true" aria-label="Loading">
          <div className="h-36 rounded-card bg-surface-muted animate-pulse" />
          <div className="h-40 rounded-card bg-surface-muted animate-pulse" />
        </div>
      )}

      {/* Mounted from the start (the suggestions load inside), shown all at once */}
      <div hidden={!ready} className="space-y-4 sm:space-y-5">
        {/* What Jarvis prepared on its own: pending suggestions to accept or dismiss */}
        <WhileYouWereAway onSettled={onSuggestionsSettled} />

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

        {/* Schedule for the selected range — or why there is none */}
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
        {taskList.kind === "ready" && <ScheduleTimeline view={view} range={range} now={now} />}

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
    </div>
  );
}
