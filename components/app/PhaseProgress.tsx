'use client';

import { getPhaseDisplayName } from '@/lib/constants';
import { PhaseEventData } from '@/lib/types';
import { Check } from 'lucide-react';

interface PhaseProgressProps {
  phases: PhaseEventData[];
  currentPhase?: string;
  isStreaming: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function PhaseProgress({ phases, currentPhase, isStreaming }: PhaseProgressProps) {
  if (phases.length === 0 && !isStreaming) return null;

  const completedPhases = phases.filter(
    (_, i) => i < phases.length - 1 || currentPhase === 'complete'
  );

  const activePhase =
    phases.length > 0 && currentPhase !== 'complete'
      ? phases[phases.length - 1]
      : null;

  return (
    <div className="mb-2 space-y-0.5">
      {completedPhases.map((pe, i) => {
        const nextTs = i < phases.length - 1 ? phases[i + 1].timestamp : Date.now();
        const durationMs =
          (pe.data?.duration_ms as number) ??
          (pe.timestamp && nextTs ? nextTs - pe.timestamp : null);

        return (
          <div
            key={`${pe.phase}-${i}`}
            className="flex items-center gap-1.5 text-[10px]"
          >
            <Check size={10} className="text-sage flex-shrink-0" />
            <span className="text-muted">{getPhaseDisplayName(pe.phase)}</span>
            {durationMs != null && (
              <span className="text-muted/60">{formatDuration(durationMs)}</span>
            )}
          </div>
        );
      })}

      {activePhase && isStreaming && currentPhase !== 'complete' && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terra opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-terra" />
          </span>
          <span className="text-terra">
            {getPhaseDisplayName(activePhase.phase)}
          </span>
        </div>
      )}
    </div>
  );
}
