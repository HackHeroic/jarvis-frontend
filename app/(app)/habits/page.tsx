"use client";

import { useEffect, useState, useCallback } from "react";
import { getDueHabits, completeHabit } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/EmptyState";
import { SM2QualityRating } from "@/components/app/SM2QualityRating";
import {
  Target,
  CheckCircle2,
  Loader2,
  Clock,
  RotateCcw,
} from "lucide-react";


// ---------------------------------------------------------------------------
// Types (from backend, flexible shape)
// ---------------------------------------------------------------------------

interface HabitRecord {
  id: string;
  name: string;
  last_reviewed?: string;
  next_review?: string;
  interval_days?: number;
  easiness_factor?: number;
  repetitions?: number;
  days_since?: number;
}

function parseHabit(raw: Record<string, unknown>): HabitRecord {
  return {
    id: (raw.id as string) || (raw.habit_id as string) || "",
    name: (raw.name as string) || (raw.habit_name as string) || (raw.title as string) || "Unnamed Habit",
    last_reviewed: (raw.last_reviewed as string) || (raw.last_done as string) || undefined,
    next_review: (raw.next_review as string) || undefined,
    interval_days: (raw.interval_days as number) || (raw.interval as number) || undefined,
    easiness_factor: (raw.easiness_factor as number) || (raw.ef as number) || undefined,
    repetitions: (raw.repetitions as number) || undefined,
    days_since: (raw.days_since as number) || undefined,
  };
}

function formatRelativeDate(iso?: string): string {
  if (!iso) return "Never";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Habit Card
// ---------------------------------------------------------------------------

function HabitCard({
  habit,
  onComplete,
}: {
  habit: HabitRecord;
  onComplete: (id: string, quality: number) => Promise<void>;
}) {
  const [showRating, setShowRating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRate(quality: number) {
    setCompleting(true);
    try {
      await onComplete(habit.id, quality);
      setDone(true);
    } catch {
      // Error handled at page level
    } finally {
      setCompleting(false);
    }
  }

  if (done) {
    return (
      <Card className="flex items-center gap-3 px-5 py-4 opacity-60">
        <CheckCircle2 size={20} className="text-sage" />
        <span className="text-sm font-medium text-primary line-through">{habit.name}</span>
        <span className="ml-auto text-xs text-sage font-medium">Completed</span>
      </Card>
    );
  }

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terra/10">
          <Target size={18} className="text-terra" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">{habit.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Last: {formatRelativeDate(habit.last_reviewed)}
            </span>
            {habit.days_since !== undefined && (
              <span>{habit.days_since} day{habit.days_since !== 1 ? "s" : ""} since</span>
            )}
            {habit.interval_days !== undefined && (
              <span className="flex items-center gap-1">
                <RotateCcw size={12} />
                Next in {habit.interval_days} day{habit.interval_days !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {!showRating && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRating(true)}
            disabled={completing}
          >
            {completing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Review"
            )}
          </Button>
        )}
      </div>

      {/* SM2 Rating */}
      {showRating && !completing && (
        <SM2QualityRating onRate={handleRate} taskTitle={habit.name} />
      )}
      {completing && (
        <div className="mt-3 flex items-center justify-center gap-2 py-3">
          <Loader2 size={16} className="animate-spin text-terra" />
          <span className="text-xs text-muted">Saving...</span>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Habits Page
// ---------------------------------------------------------------------------

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const raw = await getDueHabits();
      setHabits(raw.map(parseHabit));
      setError(null);
    } catch {
      // Backend unavailable — show empty state, not error
      setHabits([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  async function handleComplete(id: string, quality: number) {
    await completeHabit(id, quality);
    // Refresh list after short delay for animation
    setTimeout(() => fetchHabits(), 600);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary">Habits</h1>
        <p className="mt-1 text-sm text-secondary">
          Review habits due today. Jarvis detects patterns in your behavior and surfaces them here.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-red-500">
            <span>Failed to load habits: {error}</span>
            <Button variant="ghost" size="sm" onClick={fetchHabits}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && habits.length === 0 && (
        <Card className="px-6 py-12">
          <EmptyState
            icon="🎯"
            headline="No habits due for review"
            subtitle="They'll appear here when Jarvis detects patterns in your behavior."
          />
        </Card>
      )}

      {/* Habit cards */}
      {!loading && habits.length > 0 && (
        <div className="space-y-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
