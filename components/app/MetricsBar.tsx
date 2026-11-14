'use client';

import { useEffect, useState } from 'react';
import { GenerationMetrics } from '@/lib/types';

interface MetricsBarProps {
  metrics: GenerationMetrics;
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVisible(localStorage.getItem('jarvis-show-metrics') !== 'false');
    }
  }, []);

  if (!visible) return null;

  const parts: string[] = [];

  if (metrics.ttft_ms != null) {
    parts.push(
      `TTFT: ${metrics.ttft_ms < 1000 ? `${metrics.ttft_ms.toFixed(0)}ms` : `${(metrics.ttft_ms / 1000).toFixed(1)}s`}`
    );
  }

  if (metrics.tok_per_sec > 0) {
    parts.push(`${metrics.tok_per_sec.toFixed(1)} tok/s`);
  }

  // Whichever model actually answered (Claude, Gemini, local...): show its last path segment.
  if (typeof metrics.model === 'string' && metrics.model.trim()) {
    const short = metrics.model.split('/').filter(Boolean).pop() ?? metrics.model;
    parts.push(short);
  }

  if (metrics.total_time_s > 0) {
    parts.push(`Total: ${metrics.total_time_s.toFixed(1)}s`);
  }

  if (parts.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border">
      {/* Whole parts wrap onto a new line on a phone instead of breaking mid-part */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted font-mono">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            {i > 0 && <span className="text-muted/40">|</span>}
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}
