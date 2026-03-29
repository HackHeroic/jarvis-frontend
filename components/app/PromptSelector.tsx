"use client";

import { useState } from "react";
import { DEMO_PROMPTS } from "@/lib/demoData";

interface PromptSelectorProps {
  onSelect: (prompt: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  "var(--accent)": "border-terra/30 hover:border-terra/60 text-terra",
  "var(--color-terra)": "border-terra/30 hover:border-terra/60 text-terra",
  "var(--chart-2)": "border-dusk/30 hover:border-dusk/60 text-dusk",
  "var(--chart-3)": "border-sage/30 hover:border-sage/60 text-sage",
  "var(--chart-4)": "border-gold/30 hover:border-gold/60 text-gold",
};

export function PromptSelector({ onSelect }: PromptSelectorProps) {
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());

  const remaining = DEMO_PROMPTS.filter((p) => !usedIds.has(p.id));

  if (remaining.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6 px-4">
      {remaining.map((prompt) => {
        const colorClass =
          COLOR_MAP[prompt.color] ??
          "border-terra/30 hover:border-terra/60 text-terra";

        return (
          <button
            key={prompt.id}
            type="button"
            onClick={() => {
              setUsedIds((prev) => new Set(prev).add(prompt.id));
              onSelect(prompt.prompt);
            }}
            className={`border rounded-xl px-4 py-3 max-w-[200px] text-left transition-colors bg-surface-card hover:bg-surface-subtle ${colorClass}`}
          >
            <div className="text-xs font-semibold">{prompt.label}</div>
            <div className="text-[10px] text-secondary mt-0.5 line-clamp-2">
              {prompt.prompt}
            </div>
          </button>
        );
      })}
    </div>
  );
}
