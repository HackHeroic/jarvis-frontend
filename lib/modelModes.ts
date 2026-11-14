/**
 * The model picker's choices, worded as the backend acts on them. No React — unit-tested.
 *
 * The chat stream reads `model_mode` two ways (Jarvis-Engine
 * app/api/v1/endpoints/chat.py): 'cloud' (also 'gemini', and the older '4b' the
 * picker still sends) puts the whole turn on the cloud providers; any other value
 * is auto — the local model first, the cloud when it cannot answer, and the cloud
 * alone while no local model is loaded. There is no "local only" mode.
 */

import type { ModelStatus } from "./api";
import type { ModelMode } from "./types";

export type { ModelMode };

export interface ModelModeOption {
  value: ModelMode;
  label: string;
  tooltip: string;
}

/** A model id like "openai/google/gemma-4-26b-a4b-it" as a short display name ("gemma-4-26b-a4b"). */
export function shortModelName(fullId: string): string {
  const name = fullId.split("/").pop() ?? "";
  return name.replace(/-instruct$/, "").replace(/-it$/, "");
}

/** A stored or requested mode as the backend reads it: cloud only, or auto. */
export function toModelMode(value: unknown): ModelMode {
  return value === "4b" || value === "cloud" || value === "gemini" ? "4b" : "auto";
}

/**
 * The picker's options for the loaded models (`GET /api/v1/models/status`; null
 * before it answers): always Auto and Cloud, each saying what it does.
 */
export function modelModeOptions(status: ModelStatus | null): ModelModeOption[] {
  let autoTooltip = "The local model first, cloud if it can't answer";
  if (status && !status.local_available) {
    autoTooltip = "Cloud models (no local model is loaded)";
  } else if (status?.primary_model) {
    autoTooltip = `${shortModelName(status.primary_model)} first, cloud if it can't answer`;
  }
  return [
    { value: "auto", label: "Auto", tooltip: autoTooltip },
    { value: "4b", label: "Cloud", tooltip: "Cloud models only, for this turn" },
  ];
}
