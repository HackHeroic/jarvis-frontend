"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/app/ErrorState";
import { PatternList } from "@/components/app/you/PatternList";
import { RuleList } from "@/components/app/you/RuleList";
import { MemoryList } from "@/components/app/you/MemoryList";
import { FocusChart } from "@/components/app/you/FocusChart";
import { AutonomySettings } from "@/components/app/you/AutonomySettings";
import { PrivacyReceipt } from "@/components/app/you/PrivacyReceipt";
import { getYou } from "@/lib/api";
import { LIST_ERROR_MESSAGE } from "@/lib/learning";
import { errorMessageOf } from "@/lib/you";
import type { MemoryOut, PatternShown, RuleShown, YouProfile, YouResponse } from "@/lib/types";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-secondary">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// You Page — what Jarvis knows about you
// ---------------------------------------------------------------------------

export default function YouPage() {
  // undefined until the first read answers.
  const [you, setYou] = useState<YouResponse | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort(); // a newer read replaces one still in flight
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    try {
      const fresh = await getYou({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setYou(fresh);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      // An outage is never an empty page: say so, with Retry.
      setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const setPatterns = useCallback(
    (update: (patterns: PatternShown[]) => PatternShown[]) =>
      setYou((prev) => (prev ? { ...prev, patterns: update(prev.patterns) } : prev)),
    [],
  );
  const setRules = useCallback(
    (update: (rules: RuleShown[]) => RuleShown[]) =>
      setYou((prev) => (prev ? { ...prev, rules: update(prev.rules) } : prev)),
    [],
  );
  const setMemories = useCallback(
    (update: (memories: MemoryOut[]) => MemoryOut[]) =>
      setYou((prev) => (prev ? { ...prev, memories: update(prev.memories) } : prev)),
    [],
  );
  const setProfile = useCallback(
    (profile: YouProfile) => setYou((prev) => (prev ? { ...prev, profile } : prev)),
    [],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-xl font-bold text-primary">What Jarvis knows about you</h1>
        <p className="mt-1 text-sm text-secondary">
          Everything here shapes your schedule. Confirm what&apos;s right; forget what isn&apos;t.
        </p>
      </div>

      {/* First read (or its Retry) in flight */}
      {!you && (error === null || loading) && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-card bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Outage with nothing to show */}
      {!you && error !== null && !loading && (
        <Card className="px-6 py-12">
          <ErrorState message={errorMessageOf(error, LIST_ERROR_MESSAGE)} onRetry={load} />
        </Card>
      )}

      {you && (
        <>
          {/* A re-read failed: keep what was shown, and say so */}
          {error !== null && !loading && (
            <Card className="px-4 py-3">
              <ErrorState compact message={errorMessageOf(error, LIST_ERROR_MESSAGE)} onRetry={load} />
            </Card>
          )}

          <Section
            title="Patterns"
            subtitle="What Jarvis sees in what happened, with the evidence."
          >
            <PatternList patterns={you.patterns} setPatterns={setPatterns} onStale={load} />
          </Section>

          <Section title="Focus through the day" subtitle="How likely a task is to get done, by hour.">
            <FocusChart focus={you.focus} />
          </Section>

          <Section title="Rules" subtitle="Every plan respects these.">
            <RuleList rules={you.rules} setRules={setRules} timeZone={you.profile.timezone} />
          </Section>

          <Section title="Memories" subtitle="What Jarvis remembers, and how fresh it is.">
            <MemoryList
              memories={you.memories}
              setMemories={setMemories}
              timeZone={you.profile.timezone}
              onStale={load}
            />
          </Section>

          <Section title="How Jarvis works with you">
            <AutonomySettings profile={you.profile} onSaved={setProfile} />
          </Section>

          <Section title="Privacy receipt">
            <PrivacyReceipt receipt={you.receipt} />
          </Section>
        </>
      )}
    </div>
  );
}
