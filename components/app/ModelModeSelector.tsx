"use client";

import clsx from "clsx";

export type ModelMode = "auto" | "4b" | "27b";

interface ModelModeSelectorProps {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
  disabled?: boolean;
}

const MODES: { value: ModelMode; label: string; tooltip: string }[] = [
  {
    value: "auto",
    label: "Auto",
    tooltip: "Jarvis picks the best model based on task complexity",
  },
  {
    value: "4b",
    label: "4B SLM",
    tooltip: "Force Qwen 4B — fast responses for simple tasks",
  },
  {
    value: "27b",
    label: "27B",
    tooltip: "Force Qwen 27B — deeper reasoning for complex planning",
  },
];

export function ModelModeSelector({
  value,
  onChange,
  disabled,
}: ModelModeSelectorProps) {
  return (
    <div className="flex items-center bg-surface-muted rounded-lg p-0.5">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          title={mode.tooltip}
          disabled={disabled}
          onClick={() => onChange(mode.value)}
          className={clsx(
            "px-3 py-1 text-xs font-medium rounded-md transition-all",
            value === mode.value
              ? "bg-surface-card text-primary shadow-sm"
              : "text-muted hover:text-secondary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
