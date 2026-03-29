"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

interface ThinkingProcessProps {
  reasoning: string;
  isStreaming: boolean;
  durationSec: number;
}

export function ThinkingProcess({
  reasoning,
  isStreaming,
  durationSec,
}: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors"
      >
        <span>
          {isStreaming ? (
            <span className="inline-flex items-center gap-0.5">
              <span role="img" aria-label="thinking">
                🧠
              </span>{" "}
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
              Thought for {durationSec}s
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={clsx(
            "transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="mt-2 border-l-2 border-border pl-3 text-xs text-muted whitespace-pre-wrap leading-relaxed">
          {reasoning}
        </div>
      )}
    </div>
  );
}
