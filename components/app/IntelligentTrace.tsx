"use client";

import { Check, Loader2 } from "lucide-react";
import { getPhaseDisplayName } from "@/lib/constants";
import { getSpinnerVerb } from "@/lib/spinnerVerbs";
import type { PhaseEventData, ToolUseEvent, MemoryExtractedEvent } from "@/lib/types";

interface IntelligentTraceProps {
  phases: PhaseEventData[];
  currentPhase?: string;
  isStreaming: boolean;
  devMode?: boolean;
  toolUses?: ToolUseEvent[];
  memoriesExtracted?: MemoryExtractedEvent[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getVerb(pe: PhaseEventData): string {
  return (pe.verb as string) || (pe.data?.verb as string) || getSpinnerVerb(pe.phase);
}

function renderDetail(pe: PhaseEventData): string | null {
  const d = pe.detail || pe.data;
  if (!d) return null;
  const parts: string[] = [];
  if (d.intent) parts.push(`Intent: ${d.intent}`);
  if (d.memories_count != null) parts.push(`${d.memories_count} memories`);
  if (d.conversation_turns != null) parts.push(`${d.conversation_turns} turns`);
  if (d.module) parts.push(`${d.module}`);
  if (d.rows != null) parts.push(`${d.rows} constraints`);
  if (d.slots != null) parts.push(`${d.slots} time slots`);
  if (d.task_count != null) parts.push(`${d.task_count} tasks`);
  if (d.memories_extracted != null) parts.push(`${d.memories_extracted} memories extracted`);
  if (d.patterns_detected != null) parts.push(`${d.patterns_detected} patterns`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ToolUseTree({ toolUses, module }: { toolUses: ToolUseEvent[]; module?: string }) {
  const filtered = module
    ? toolUses.filter((t) => t.module === module)
    : toolUses;
  if (filtered.length === 0) return null;

  return (
    <div className="pl-5 space-y-0.5">
      {filtered.map((tu, i) => {
        const isLast = i === filtered.length - 1;
        const prefix = isLast ? "└─" : "├─";
        const detailParts: string[] = [];
        if (tu.detail) {
          if (tu.detail.model) detailParts.push(String(tu.detail.model));
          if (tu.detail.rows != null) detailParts.push(`${tu.detail.rows} rows`);
          if (tu.detail.task_count != null) detailParts.push(`${tu.detail.task_count} tasks`);
          if (tu.detail.status) detailParts.push(String(tu.detail.status));
          if (tu.detail.slots != null) detailParts.push(`${tu.detail.slots} slots`);
          if (tu.detail.duration_ms != null) detailParts.push(formatDuration(Number(tu.detail.duration_ms)));
          if (tu.detail.error) detailParts.push(`error: ${tu.detail.error}`);
          if (tu.detail.horizon_h != null) detailParts.push(`${tu.detail.horizon_h}h horizon`);
        }
        return (
          <div key={`${tu.tool}-${i}`} className="flex items-center gap-1 text-[9px] text-muted/50">
            <span className="font-mono">{prefix}</span>
            <span>{tu.tool}</span>
            {tu.status === "done" && <span className="text-sage">✓</span>}
            {tu.status === "error" && <span className="text-terra">✗</span>}
            {tu.status === "started" && <Loader2 size={8} className="animate-spin text-dusk" />}
            {detailParts.length > 0 && (
              <span className="text-muted/40">{detailParts.join(" · ")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function IntelligentTrace({
  phases,
  currentPhase,
  isStreaming,
  devMode = false,
  toolUses = [],
  memoriesExtracted = [],
}: IntelligentTraceProps) {
  if (phases.length === 0 && !isStreaming) return null;

  const completedPhases = phases.filter(
    (_, i) => i < phases.length - 1 || currentPhase === "complete"
  );

  const activePhase =
    phases.length > 0 && currentPhase !== "complete"
      ? phases[phases.length - 1]
      : null;

  return (
    <div className="mb-2 space-y-0.5">
      {completedPhases.map((pe, i) => {
        const nextTs = i < phases.length - 1 ? phases[i + 1]!.timestamp : Date.now();
        const durationMs =
          (pe.data?.duration_ms as number) ??
          (pe.timestamp && nextTs ? nextTs - pe.timestamp : null);
        const verb = getVerb(pe);
        const detail = renderDetail(pe);
        const moduleForTools = (pe.detail?.module || pe.data?.module) as string | undefined;

        return (
          <div key={`${pe.phase}-${i}`}>
            <div className="flex items-center gap-1.5 text-[10px]">
              <Check size={10} className="text-sage flex-shrink-0" />
              <span className="text-muted">
                <span className="text-secondary/80">{verb}</span>...
              </span>
              {durationMs != null && (
                <span className="text-muted/60">{formatDuration(durationMs)}</span>
              )}
            </div>
            {detail && (
              <div className="pl-5 text-[9px] text-muted/60">→ {detail}</div>
            )}
            {pe.phase === "learning" && memoriesExtracted.length > 0 && (
              <div className="pl-5 space-y-0.5">
                {memoriesExtracted.map((mem, mi) => (
                  <div key={mi} className="text-[9px] text-muted/60">
                    → 🧠 Noted: &quot;{mem.content}&quot;
                  </div>
                ))}
              </div>
            )}
            {devMode && <ToolUseTree toolUses={toolUses} module={moduleForTools} />}
          </div>
        );
      })}

      {activePhase && isStreaming && currentPhase !== "complete" && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terra opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-terra" />
          </span>
          <span className="text-terra">
            <span className="font-medium">{getVerb(activePhase)}</span>...
          </span>
        </div>
      )}
    </div>
  );
}
