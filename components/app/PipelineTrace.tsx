"use client";

import { Check, Loader2 } from "lucide-react";
import type { PhaseEventData } from "@/lib/types";

interface PipelineTraceProps {
  phases: PhaseEventData[];
  currentPhase: string;
  activeModel: string | null;
  isStreaming: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  connecting: "Connecting...",
  brain_dump_extraction: "Analyzing your input...",
  intent_classified: "Intent classified",
  habits_saved: "Habits saved",
  habits_fetched: "Fetching habits...",
  habits_translated: "Translating habits...",
  plan_day_start: "Starting planner...",
  decomposing: "Decomposing into tasks...",
  decomposition_done: "Decomposition complete",
  scheduling: "Running scheduler...",
  schedule_done: "Schedule optimized",
  synthesizing: "Synthesizing response...",
  reasoning: "Reasoning...",
  responding: "Generating response...",
  complete: "Complete",
};

function formatDuration(startMs: number, endMs: number): string {
  const diff = endMs - startMs;
  if (diff < 1000) return `${diff}ms`;
  return `${(diff / 1000).toFixed(1)}s`;
}

export function PipelineTrace({
  phases,
  currentPhase,
  activeModel,
  isStreaming,
}: PipelineTraceProps) {
  if (phases.length === 0 && !isStreaming) return null;

  const completedPhases = phases.filter(
    (_, i) => i < phases.length - 1 || currentPhase === "complete"
  );

  const lastPhase =
    phases.length > 0 && currentPhase !== "complete"
      ? phases[phases.length - 1]
      : null;

  return (
    <div className="mb-2 space-y-0.5">
      {completedPhases.map((phase, i) => {
        const nextTimestamp =
          i < phases.length - 1 ? (phases[i + 1].timestamp ?? Date.now()) : Date.now();
        const duration = formatDuration(phase.timestamp ?? Date.now(), nextTimestamp);
        const label = PHASE_LABELS[phase.phase] ?? phase.phase;

        return (
          <div
            key={`${phase.phase}-${i}`}
            className="flex items-center gap-1.5 text-[10px]"
          >
            <Check size={10} className="text-sage flex-shrink-0" />
            <span className="text-muted">{label}</span>
            <span className="text-muted/60">{duration}</span>
          </div>
        );
      })}

      {lastPhase && isStreaming && currentPhase !== "complete" && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <Loader2 size={10} className="text-dusk animate-spin flex-shrink-0" />
          <span className="text-dusk">
            {PHASE_LABELS[lastPhase.phase] ?? lastPhase.phase}
          </span>
          {activeModel && (
            <span className="text-[9px] bg-surface-subtle text-muted px-1.5 py-0.5 rounded-full">
              {activeModel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
