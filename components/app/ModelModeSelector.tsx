"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Settings } from "lucide-react";
import { getModelStatus, type ModelStatus } from "@/lib/api";

/**
 * Model mode selector — shows dynamic model names from backend.
 *
 * Wire values ("auto" | "4b" | "27b") are kept for backend compatibility:
 *   "auto" = Jarvis picks (local primary + cloud fallback)
 *   "27b"  = Force local primary (whatever is loaded in LM Studio)
 *   "4b"   = Force cloud (Gemini)
 *
 * Display labels come from GET /api/v1/models/status and show actual model names.
 */

export type ModelMode = "auto" | "4b" | "27b";

interface ModelModeSelectorProps {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
  disabled?: boolean;
  devMode?: boolean;
  onToggleDevMode?: () => void;
}

/** Extract a short display name from a full model ID like "openai/google/gemma-4-26b-a4b" */
function shortModelName(fullId: string): string {
  // Strip prefixes: "openai/google/gemma-4-26b-a4b" → "gemma-4-26b-a4b"
  const parts = fullId.split("/");
  const name = parts[parts.length - 1];
  // Clean up common suffixes for display
  return name
    .replace(/-instruct$/, "")
    .replace(/-it$/, "");
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

  // Build mode list dynamically from backend model status
  const modes: { value: ModelMode; label: string; tooltip: string }[] = [];

  if (status) {
    const primaryName = shortModelName(status.primary_model || "");
    const fastName = shortModelName(status.fast_model || "");
    const cloudName = shortModelName(status.cloud_model || "gemini-2.5-flash");

    modes.push({
      value: "auto",
      label: "Auto",
      tooltip: status.local_available
        ? `Local ${primaryName} + ${cloudName} fallback`
        : `Cloud only: ${cloudName}`,
    });

    if (status.local_available && primaryName) {
      // Only show local model option if LM Studio has a model loaded
      modes.push({
        value: "27b",
        label: primaryName,
        tooltip: `Force local model: ${status.primary_model}`,
      });
    }

    // Always show cloud option
    modes.push({
      value: "4b",
      label: cloudName,
      tooltip: `Force cloud: ${status.cloud_model}`,
    });
  } else {
    // Fallback before status loads
    modes.push(
      { value: "auto", label: "Auto", tooltip: "Auto-routing" },
      { value: "27b", label: "Local", tooltip: "Local model" },
      { value: "4b", label: "Cloud", tooltip: "Cloud model" },
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center bg-surface-muted rounded-lg p-0.5">
        {modes.map((mode) => (
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
      {onToggleDevMode && (
        <button
          type="button"
          title={devMode ? "Developer mode ON" : "Developer mode OFF"}
          onClick={onToggleDevMode}
          className={clsx(
            "p-1.5 rounded-md transition-all",
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
