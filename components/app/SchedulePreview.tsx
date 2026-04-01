'use client';

import { useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

import type { SchedulePayload, TaskSchedule } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SchedulePreviewProps {
  schedule: SchedulePayload;
  draftId: string;
  onAccept: () => void;
  onReject: (reason?: string) => void;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime12h(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function minutesToWallTime(horizonStart: string, minutes: number): Date {
  const base = new Date(horizonStart);
  return new Date(base.getTime() + minutes * 60000);
}

interface TimelineEntry {
  taskId: string;
  title: string;
  startMin: number;
  endMin: number;
  startTime: Date;
  endTime: Date;
  durationMin: number;
  tmtScore?: number;
}

// ---------------------------------------------------------------------------
// Timeline Block
// ---------------------------------------------------------------------------

function TimelineBlock({ entry }: { entry: TimelineEntry }) {
  const dur = entry.durationMin;

  return (
    <div className="flex gap-3 items-stretch">
      {/* Time column */}
      <div className="w-[72px] shrink-0 text-right pt-2">
        <span className="text-[11px] font-mono text-muted">
          {formatTime12h(entry.startTime)}
        </span>
      </div>

      {/* Connector */}
      <div className="flex flex-col items-center w-3">
        <div className="w-2.5 h-2.5 rounded-full bg-terra border-2 border-terra/30 shrink-0 mt-2.5" />
        <div className="flex-1 w-px bg-border" />
      </div>

      {/* Task block */}
      <div className="flex-1 pb-2">
        <div className="p-3 rounded-xl border border-border bg-surface-card border-l-[3px] border-l-terra hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-primary">{entry.title}</span>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-dusk/10 text-dusk text-[10px] font-mono">
              {dur}m
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted">
            <span>
              {formatTime12h(entry.startTime)} -- {formatTime12h(entry.endTime)}
            </span>
            {entry.tmtScore !== undefined && (
              <span className="px-1.5 py-0.5 rounded bg-sage/10 text-sage font-mono">
                TMT {entry.tmtScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day Grouping Helpers
// ---------------------------------------------------------------------------

type DayGroup = {
  date: Date;
  label: string;
  entries: TimelineEntry[];
};

function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDay(entries: TimelineEntry[], horizonStart: string): DayGroup[] {
  const base = new Date(horizonStart);
  const groups = new Map<string, DayGroup>();
  for (const entry of entries) {
    const taskDate = new Date(base.getTime() + entry.startMin * 60_000);
    const dateKey = taskDate.toDateString();
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { date: taskDate, label: formatDayLabel(taskDate), entries: [] });
    }
    groups.get(dateKey)!.entries.push(entry);
  }
  return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function DayHeader({ label, taskCount }: { label: string; taskCount: number }) {
  return (
    <div className="flex items-center gap-2 py-2 mt-3 first:mt-0">
      <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">{label}</span>
      <span className="text-[10px] text-muted/60">{taskCount} tasks</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Break Gap
// ---------------------------------------------------------------------------

function BreakGap({ minutes }: { minutes: number }) {
  if (minutes <= 0 || minutes > 360) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const label = hrs > 0 ? `${hrs}h ${mins}m break` : `${mins}m break`;

  return (
    <div className="flex gap-3 items-stretch">
      <div className="w-[72px]" />
      <div className="flex flex-col items-center w-3">
        <div className="flex-1 w-px border-l border-dashed border-border" />
      </div>
      <div className="flex-1 flex items-center py-1.5">
        <span className="text-[10px] text-muted/60 italic">
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SchedulePreview({
  schedule,
  draftId,
  onAccept,
  onReject,
  isLoading,
}: SchedulePreviewProps) {
  const entries = useMemo(() => {
    const horizonStart = schedule.horizon_start || new Date().toISOString();
    const raw: TimelineEntry[] = Object.entries(schedule.schedule).map(
      ([taskId, slot]: [string, TaskSchedule]) => ({
        taskId,
        title: slot.title || taskId,
        startMin: slot.start_min,
        endMin: slot.end_min,
        startTime: minutesToWallTime(horizonStart, slot.start_min),
        endTime: minutesToWallTime(horizonStart, slot.end_min),
        durationMin: slot.end_min - slot.start_min,
        tmtScore: slot.tmt_score,
      }),
    );
    // Sort by start time
    raw.sort((a, b) => a.startMin - b.startMin);
    return raw;
  }, [schedule]);

  const totalMinutes = entries.reduce((s, e) => s + e.durationMin, 0);

  return (
    <div className="mt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">
          Draft #{draftId.slice(0, 8)} -- Your schedule
        </h3>
        <span className="text-[11px] text-muted font-mono">
          {entries.length} tasks &middot; {totalMinutes}m total
        </span>
      </div>

      {/* Conflict summary banner */}
      {schedule.conflict_summary && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl border border-gold/30 bg-gold/5 text-[11px] text-gold">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{schedule.conflict_summary}</span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {(() => {
          const horizonStart = schedule.horizon_start || new Date().toISOString();
          const dayGroups = groupByDay(entries, horizonStart);
          return dayGroups.map((group) => (
            <div key={group.label}>
              <DayHeader label={group.label} taskCount={group.entries.length} />
              {group.entries.map((entry, i) => {
                const prevEnd = i > 0 ? group.entries[i - 1].endMin : entry.startMin;
                const gap = entry.startMin - prevEnd;
                return (
                  <div key={entry.taskId}>
                    {gap > 5 && <BreakGap minutes={gap} />}
                    <TimelineBlock entry={entry} />
                  </div>
                );
              })}
            </div>
          ));
        })()}

        {/* End time marker */}
        {entries.length > 0 && (
          <div className="flex gap-3 items-center">
            <div className="w-[72px] text-right">
              <span className="text-[11px] font-mono text-muted">
                {formatTime12h(entries[entries.length - 1].endTime)}
              </span>
            </div>
            <div className="flex flex-col items-center w-3">
              <div className="w-2 h-2 rounded-full bg-border" />
            </div>
            <div className="text-[10px] text-muted">Done</div>
          </div>
        )}
      </div>

      {/* Applied constraints */}
      {schedule.applied_constraints && schedule.applied_constraints.length > 0 && (
        <div className="px-4 py-2 rounded-lg bg-sage-50 dark:bg-sage-900/20 text-xs text-sage-700 dark:text-sage-300 mt-2">
          <span className="font-medium">Schedule shaped by your preferences:</span>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            {schedule.applied_constraints.map((c, i) => (
              <li key={i}>{c.name.replace(/_/g, " ").replace(/memory constraint |pearl pattern /g, "")}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAccept()}
          disabled={isLoading}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            'bg-terra text-white hover:bg-terra/90 active:scale-[0.98]',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Accept All'
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            const reason = window.prompt("What would you like changed?");
            if (reason !== null) {
              onReject(reason || undefined);
            }
          }}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400/50 transition-all disabled:opacity-40"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
