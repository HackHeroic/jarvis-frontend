"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { PhaseEvent } from "@/lib/types";

interface ThinkingProcessProps {
  reasoning: string;
  isStreaming: boolean;
  durationSec: number;
  phaseHistory?: PhaseEvent[];
}

export function ThinkingProcess({
  reasoning,
  isStreaming,
  durationSec,
  phaseHistory,
}: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(false);

  if (!reasoning) return null;

  // Calculate duration from phaseHistory if available
  let displayDuration = durationSec;
  if (phaseHistory && phaseHistory.length >= 2) {
    const reasoningPhase = phaseHistory.find((p) => p.phase === "reasoning");
    const respondingPhase = phaseHistory.find((p) => p.phase === "responding");
    const completePhase = phaseHistory.find((p) => p.phase === "complete");
    const startTs = reasoningPhase?.timestamp ?? phaseHistory[0].timestamp;
    const endTs = completePhase?.timestamp ?? respondingPhase?.timestamp ?? phaseHistory[phaseHistory.length - 1].timestamp;
    const calculated = Math.round((endTs - startTs) / 1000);
    if (calculated > 0) displayDuration = calculated;
  }

  return (
    <div className="mt-2 mb-1">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted hover:text-secondary hover:bg-surface-subtle transition-colors"
      >
        <span className="flex items-center gap-1">
          {isStreaming ? (
            <span className="inline-flex items-center gap-1">
              <span role="img" aria-label="thinking">
                🧠
              </span>
              Thinking
              <span className="inline-flex gap-px ml-0.5">
                <span className="animate-bounce [animation-delay:0ms] w-1 h-1 rounded-full bg-terra inline-block" />
                <span className="animate-bounce [animation-delay:150ms] w-1 h-1 rounded-full bg-terra inline-block" />
                <span className="animate-bounce [animation-delay:300ms] w-1 h-1 rounded-full bg-terra inline-block" />
              </span>
            </span>
          ) : (
            <span>
              <span role="img" aria-label="thought">
                🧠
              </span>{" "}
              Thought for {displayDuration}s
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={clsx(
            "transition-transform duration-200 flex-shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="mt-1.5 ml-1 rounded-lg border border-border bg-surface-subtle/50 p-3 max-h-60 overflow-y-auto">
          <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed break-words">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
