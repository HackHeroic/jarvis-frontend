"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Settings } from "lucide-react";
import { getModelStatus, type ModelStatus } from "@/lib/api";
import { modelModeOptions, type ModelMode } from "@/lib/modelModes";

/**
 * Model mode selector: Auto or Cloud, worded as the backend acts on them
 * (lib/modelModes.ts). Auto names the loaded local model from
 * GET /api/v1/models/status.
 */

export type { ModelMode };

interface ModelModeSelectorProps {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
  disabled?: boolean;
  devMode?: boolean;
  onToggleDevMode?: () => void;
}

export function ModelModeSelector({
  value,
  onChange,
  disabled,
  devMode,
  onToggleDevMode,
}: ModelModeSelectorProps) {
  const [status, setStatus] = useState<ModelStatus | null>(null);

  useEffect(() => {
    getModelStatus().then(setStatus).catch(() => {});
  }, []);

  const modes = modelModeOptions(status);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex min-w-0 items-center rounded-lg bg-surface-muted p-0.5">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            title={mode.tooltip}
            disabled={disabled}
            onClick={() => onChange(mode.value)}
            className={clsx(
              "min-w-0 truncate rounded-md px-2 py-1 text-xs font-medium transition-all max-md:min-h-10 sm:px-3",
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
      {onToggleDevMode && (
        <button
          type="button"
          title={devMode ? "Developer mode ON" : "Developer mode OFF"}
          onClick={onToggleDevMode}
          className={clsx(
            "flex shrink-0 items-center justify-center rounded-md p-1.5 transition-all max-md:min-h-10 max-md:min-w-10",
            devMode
              ? "text-gold bg-gold/10"
              : "text-muted/40 hover:text-muted"
          )}
        >
          <Settings size={14} />
          {devMode && <span className="ml-1 text-[9px] font-medium">DEV</span>}
        </button>
      )}
    </div>
  );
}
