'use client';

import { useState, useCallback } from 'react';
import { X, Pencil, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';

import type { TaskChunk } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskPreviewProps {
  tasks: TaskChunk[];
  goalTitle?: string;
  cognitiveLoad?: { intrinsic_load: number; germane_load: number };
  onConfirm: (editedTasks: TaskChunk[]) => void;
  onChatModify: () => void;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function difficultyGradient(w: number): string {
  // sage (easy) -> gold (medium) -> terra (hard)
  if (w <= 0.35) return 'bg-sage';
  if (w <= 0.65) return 'bg-gold';
  return 'bg-terra';
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Editable Task Card
// ---------------------------------------------------------------------------

function EditableTaskCard({
  task,
  onUpdate,
  onRemove,
}: {
  task: TaskChunk;
  onUpdate: (updated: TaskChunk) => void;
  onRemove: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [durationDraft, setDurationDraft] = useState(String(task.duration_minutes));

  const commitTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate({ ...task, title: trimmed });
    } else {
      setTitleDraft(task.title);
    }
    setEditingTitle(false);
  }, [titleDraft, task, onUpdate]);

  const commitDuration = useCallback(() => {
    const parsed = parseInt(durationDraft, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed !== task.duration_minutes) {
      onUpdate({ ...task, duration_minutes: parsed });
    } else {
      setDurationDraft(String(task.duration_minutes));
    }
    setEditingDuration(false);
  }, [durationDraft, task, onUpdate]);

  return (
    <div className="group relative p-3 rounded-xl border border-border bg-surface-card transition-all hover:border-terra/30 hover:shadow-sm">
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
        aria-label={`Remove ${task.title}`}
      >
        <X size={14} />
      </button>

      {/* Title row */}
      <div className="flex items-start gap-2 mb-2 pr-6">
        {editingTitle ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(task.title);
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className="flex-1 bg-surface-subtle border border-terra/40 rounded-md px-2 py-1 text-sm text-primary focus:outline-none focus:border-terra"
            />
            <button
              type="button"
              onClick={commitTitle}
              className="p-0.5 text-sage hover:text-primary"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary text-left hover:text-terra transition-colors group/title"
          >
            <span>{task.title}</span>
            <Pencil size={11} className="opacity-0 group-hover/title:opacity-50 transition-opacity shrink-0" />
          </button>
        )}
      </div>

      {/* Duration + difficulty row */}
      <div className="flex items-center gap-3 mb-2">
        {/* Duration badge */}
        {editingDuration ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={durationDraft}
              onChange={(e) => setDurationDraft(e.target.value)}
              onBlur={commitDuration}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDuration();
                if (e.key === 'Escape') {
                  setDurationDraft(String(task.duration_minutes));
                  setEditingDuration(false);
                }
              }}
              min={1}
              max={120}
              autoFocus
              className="w-14 bg-surface-subtle border border-terra/40 rounded-md px-2 py-0.5 text-xs font-mono text-primary focus:outline-none focus:border-terra"
            />
            <span className="text-[10px] text-muted">min</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDuration(true)}
            className="shrink-0 px-2 py-0.5 rounded-full bg-dusk/10 text-dusk text-[11px] font-mono hover:bg-dusk/20 transition-colors"
            title="Click to edit duration"
          >
            {formatDuration(task.duration_minutes)}
          </button>
        )}

        {/* Difficulty bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] text-muted shrink-0">Difficulty</span>
          <div className="flex-1 h-1.5 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all', difficultyGradient(task.difficulty_weight))}
              style={{ width: `${Math.max(Math.round(task.difficulty_weight * 100), 4)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted font-mono w-7 text-right">
            {Math.round(task.difficulty_weight * 100)}%
          </span>
        </div>
      </div>

      {/* Completion criteria */}
      {task.completion_criteria && (
        <p className="text-[11px] text-sage mb-1 leading-relaxed">
          <span className="opacity-50 mr-1">&#x2713;</span>
          {task.completion_criteria}
        </p>
      )}

      {/* WOOP implementation intention */}
      {task.implementation_intention && (
        <p className="text-[11px] text-gold/80 leading-relaxed">
          <span className="opacity-50 mr-1">&#x21B3;</span>
          If: <span className="text-gold">{task.implementation_intention.obstacle_trigger}</span>
          {' '}&#x2192;{' '}
          Then: <span className="text-gold">{task.implementation_intention.behavioral_response}</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cognitive Load Section
// ---------------------------------------------------------------------------

function CognitiveLoadSection({ load }: { load: { intrinsic_load: number; germane_load: number } }) {
  const items = [
    { label: 'Intrinsic load', value: load.intrinsic_load, color: 'bg-dusk/60' },
    { label: 'Germane load', value: load.germane_load, color: 'bg-sage/80' },
  ];

  return (
    <div className="mt-3 p-2.5 rounded-xl border border-border bg-surface-subtle">
      <p className="text-[10px] font-medium text-muted mb-2 uppercase tracking-wide">Cognitive Load</p>
      <div className="space-y-1.5">
        {items.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2 text-[11px]">
            <span className="text-muted w-24 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', color)}
                style={{ width: `${Math.min(value * 100, 100)}%` }}
              />
            </div>
            <span className="text-muted font-mono w-8 text-right">
              {Math.round(value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TaskPreview({
  tasks,
  goalTitle,
  cognitiveLoad,
  onConfirm,
  onChatModify,
  isLoading,
}: TaskPreviewProps) {
  const [localTasks, setLocalTasks] = useState<TaskChunk[]>(tasks);

  const handleUpdate = useCallback((index: number, updated: TaskChunk) => {
    setLocalTasks((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }, []);

  const handleRemove = useCallback((index: number) => {
    setLocalTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalMinutes = localTasks.reduce((s, t) => s + t.duration_minutes, 0);

  return (
    <div className="mt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">
          {goalTitle ? `Your tasks for ${goalTitle}` : 'Your tasks'}
        </h3>
        <span className="text-[11px] text-muted font-mono">
          {localTasks.length} tasks &middot; {formatDuration(totalMinutes)}
        </span>
      </div>

      {/* Task cards */}
      <div className="space-y-2">
        {localTasks.map((task, index) => (
          <EditableTaskCard
            key={task.task_id}
            task={task}
            onUpdate={(updated) => handleUpdate(index, updated)}
            onRemove={() => handleRemove(index)}
          />
        ))}
      </div>

      {localTasks.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          All tasks removed. Chat to modify your plan.
        </p>
      )}

      {/* Cognitive load */}
      {cognitiveLoad && <CognitiveLoadSection load={cognitiveLoad} />}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onConfirm(localTasks)}
          disabled={isLoading || localTasks.length === 0}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            'bg-terra text-white hover:bg-terra/90 active:scale-[0.98]',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scheduling...
            </>
          ) : (
            <>Looks good, schedule it &#x2192;</>
          )}
        </button>
        <button
          type="button"
          onClick={onChatModify}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-secondary hover:bg-surface-muted hover:text-primary transition-all disabled:opacity-40"
        >
          Chat to modify
        </button>
      </div>
    </div>
  );
}
