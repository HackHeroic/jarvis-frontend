'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

import { PhaseProgress } from './PhaseProgress';
import { IntentBadge } from './IntentBadge';
import { MetricsBar } from './MetricsBar';
import { ClarificationChips } from './ClarificationChips';
import { ThinkingProcess } from './ThinkingProcess';
import { InlineHabitStaging } from './InlineHabitStaging';
import { InfeasibleGuidance } from './InfeasibleGuidance';
import { ReplanBanner } from './ReplanBanner';
import { ActionProposalCards } from './ActionProposalCards';
import { PendingCalendarApproval } from './PendingCalendarApproval';
import { DraftReview } from './DraftReview';

import type {
  JarvisMessage,
  ChatResponse,
  ExecutionGraph,
  TaskChunk,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JarvisResponseProps {
  message: JarvisMessage;
  onClarificationSelect?: (option: string) => void;
  onReplan?: () => void;
  isReplanning?: boolean;
  onCalendarApproved?: (id: string) => void;
  onCalendarRejected?: (id: string) => void;
  onConfirmTasks?: (tasks: TaskChunk[]) => void;
  onAcceptDraft?: () => void;
  onRejectDraft?: (reason?: string) => void;
  onChatModify?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripThinkTags(text: string): string {
  return text.replace(/<\/?think>/gi, '').trim();
}

function difficultyColor(w: number): string {
  if (w <= 0.4) return 'bg-sage';
  if (w <= 0.7) return 'bg-gold';
  return 'bg-terra';
}

// ---------------------------------------------------------------------------
// Task Decomposition Preview
// ---------------------------------------------------------------------------

function TaskDecompositionPreview({ graph }: { graph: ExecutionGraph }) {
  const [expanded, setExpanded] = useState(true);
  const { goal_metadata, decomposition, cognitive_load_estimate } = graph;

  if (!decomposition || decomposition.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors w-full text-left"
      >
        <ChevronDown
          size={12}
          className={clsx('transition-transform', !expanded && '-rotate-90')}
        />
        Task breakdown ({decomposition.length} tasks)
        {goal_metadata?.objective && (
          <span className="text-muted font-normal ml-1 truncate">
            -- {goal_metadata.objective}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {decomposition.map((task: TaskChunk) => (
            <div
              key={task.task_id}
              className="p-2.5 rounded-card border border-border bg-surface-card text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-medium text-primary">{task.title}</span>
                <span className="shrink-0 px-1.5 py-0.5 rounded-pill bg-dusk/10 text-dusk text-[10px] font-mono">
                  {task.duration_minutes}m
                </span>
              </div>

              {/* Difficulty bar */}
              <div className="h-1 w-full bg-surface-subtle rounded-full mb-2">
                <div
                  className={`h-1 rounded-full ${difficultyColor(task.difficulty_weight)}`}
                  style={{ width: `${Math.round(task.difficulty_weight * 100)}%` }}
                />
              </div>

              {/* Completion criteria */}
              {task.completion_criteria && (
                <p className="text-sage text-[11px] mb-1">
                  <span className="opacity-60">&#x2713; </span>
                  {task.completion_criteria}
                </p>
              )}

              {/* WOOP implementation intention */}
              {task.implementation_intention && (
                <p className="text-gold/80 text-[11px]">
                  <span className="opacity-60">&#x21B3; </span>
                  If: {task.implementation_intention.obstacle_trigger} --{' '}
                  Then: {task.implementation_intention.behavioral_response}
                </p>
              )}
            </div>
          ))}

          {/* Cognitive load bars */}
          {cognitive_load_estimate && (
            <div className="mt-2 p-2 rounded-card border border-border bg-surface-subtle">
              <p className="text-[10px] font-medium text-muted mb-1.5">Cognitive Load</p>
              <div className="space-y-1">
                {Object.entries(cognitive_load_estimate).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted w-20 truncate">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 h-1 bg-surface-muted rounded-full">
                      <div
                        className="h-1 rounded-full bg-dusk/60"
                        style={{ width: `${Math.min(value * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-muted font-mono w-8 text-right">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft Schedule Section
// ---------------------------------------------------------------------------

function DraftScheduleSection({ schedule }: { schedule: ChatResponse['schedule'] }) {
  if (!schedule?.schedule) return null;
  const entries = Object.entries(schedule.schedule);
  if (entries.length === 0) return null;

  const horizonStart = schedule.horizon_start ?? new Date().toISOString();

  function fmtTime(min: number): string {
    try {
      const base = new Date(horizonStart);
      if (isNaN(base.getTime())) return `+${min}m`;
      const target = new Date(base.getTime() + min * 60000);
      return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return `+${min}m`;
    }
  }

  return (
    <div className="mt-3 p-3 rounded-card border border-gold/30 bg-gold/5">
      <p className="text-xs font-medium text-secondary mb-2">
        Draft Schedule ({entries.length} tasks)
        {schedule.schedule_status && (
          <span className="ml-2 text-[10px] text-muted font-mono">
            [{schedule.schedule_status}]
          </span>
        )}
      </p>
      <div className="space-y-1">
        {entries.map(([taskId, slot]) => (
          <div key={taskId} className="flex items-center gap-2 text-[11px]">
            <span className="text-muted font-mono w-24 shrink-0">
              {fmtTime(slot.start_min)} - {fmtTime(slot.end_min)}
            </span>
            <span className="text-primary truncate">
              {slot.title || taskId}
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

export function JarvisResponse({
  message,
  onClarificationSelect,
  onReplan,
  isReplanning,
  onCalendarApproved,
  onCalendarRejected,
  onConfirmTasks,
  onAcceptDraft,
  onRejectDraft,
  onChatModify,
}: JarvisResponseProps) {
  const {
    content,
    reasoning,
    reasoningDurationMs,
    phaseHistory,
    response,
    isStreaming,
  } = message;

  const cleanContent = stripThinkTags(content);
  const cleanReasoning = reasoning ? stripThinkTags(reasoning) : '';

  const intent = response?.intent;
  const executionGraph = response?.execution_graph;
  const schedule = response?.schedule;
  const clarificationOptions = response?.clarification_options;
  const actionProposals = response?.action_proposals;
  const suggestedAction = response?.suggested_action;
  const scheduleStatus = response?.schedule_status;
  const generationMetrics = response?.generation_metrics;
  const thinkingProcess = response?.thinking_process;

  // Detect habits from behavioral constraint intent
  const isHabitResponse = intent === 'BEHAVIORAL_CONSTRAINT';

  // Detect infeasible schedule
  const isInfeasible =
    schedule?.schedule_status?.toUpperCase().includes('INFEASIBLE') ||
    (typeof scheduleStatus === 'string' && scheduleStatus.toUpperCase().includes('INFEASIBLE'));

  // Detect pending calendar entries from ingestion result
  const pendingCalendarId = response?.ingestion_result?.pending_calendar_id as string | undefined;
  const calendarEntries = pendingCalendarId
    ? [{ id: pendingCalendarId, title: 'Extracted timetable' }]
    : [];

  return (
    <div className="space-y-1">
      {/* 1. Phase Progress */}
      {phaseHistory && phaseHistory.length > 0 && (
        <PhaseProgress
          phases={phaseHistory}
          currentPhase={isStreaming ? phaseHistory[phaseHistory.length - 1]?.phase : 'complete'}
          isStreaming={!!isStreaming}
        />
      )}

      {/* 2. Intent Badge */}
      {intent && !isStreaming && <IntentBadge intent={intent} />}

      {/* 3. Thinking Process */}
      {(cleanReasoning || thinkingProcess) && (
        <ThinkingProcess
          reasoning={cleanReasoning || thinkingProcess || ''}
          isStreaming={!!isStreaming}
          durationMs={reasoningDurationMs}
          phaseHistory={phaseHistory}
        />
      )}

      {/* 4. Main Message */}
      {(cleanContent || isStreaming) && (
        <div className={cleanReasoning || thinkingProcess ? 'pt-2 mt-2 border-t border-border' : 'mt-1'}>
          <div
            className="prose prose-sm max-w-none
              prose-headings:text-primary prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
              prose-p:text-primary prose-p:leading-relaxed prose-p:my-1
              prose-strong:text-primary
              prose-code:text-terra prose-code:bg-surface-subtle prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-surface-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:my-2
              prose-li:text-primary prose-li:my-0
              prose-ul:my-1 prose-ol:my-1
              prose-a:text-dusk prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-terra prose-blockquote:text-secondary"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {cleanContent}
            </ReactMarkdown>
          </div>
          {isStreaming && (
            <span className="animate-pulse text-terra text-sm">&#x258C;</span>
          )}
        </div>
      )}

      {/* 5. Inline Habit Staging */}
      {!isStreaming && isHabitResponse && cleanContent && (
        <InlineHabitStaging
          habit={cleanContent.slice(0, 120)}
        />
      )}

      {/* 6. Task Decomposition Preview — skip when DraftReview will render (avoids duplicate) */}
      {!isStreaming && executionGraph && !response?.awaiting_task_confirmation && response?.schedule_status !== 'draft' && (
        <TaskDecompositionPreview graph={executionGraph} />
      )}

      {/* 7. Draft Schedule */}
      {!isStreaming && schedule && scheduleStatus === 'draft' && (
        <DraftScheduleSection schedule={schedule} />
      )}

      {/* 7b. Interactive Draft Review (two-stage) */}
      {!isStreaming && response && (
        response.awaiting_task_confirmation || response.schedule_status === 'draft'
      ) && (
        <DraftReview
          response={response}
          onConfirmTasks={onConfirmTasks || (() => {})}
          onAcceptDraft={onAcceptDraft || (() => {})}
          onRejectDraft={onRejectDraft || (() => {})}
          onChatModify={onChatModify || (() => {})}
        />
      )}

      {/* 8. Clarification Chips */}
      {!isStreaming && clarificationOptions && clarificationOptions.length > 0 && (
        <ClarificationChips
          options={clarificationOptions}
          onSelect={onClarificationSelect || (() => {})}
          disabled={!!isStreaming}
        />
      )}

      {/* 9. Action Proposal Cards */}
      {!isStreaming && actionProposals && actionProposals.length > 0 && (
        <ActionProposalCards proposals={actionProposals} />
      )}

      {/* 10. Replan Banner */}
      {!isStreaming && suggestedAction === 'replan' && (
        <ReplanBanner onReplan={onReplan} isReplanning={isReplanning} />
      )}

      {/* 11. Infeasible Guidance */}
      {!isStreaming && isInfeasible && (
        <InfeasibleGuidance
          conflictSummary={schedule?.conflict_summary}
        />
      )}

      {/* 12. Pending Calendar Approval */}
      {!isStreaming && calendarEntries.length > 0 && (
        <PendingCalendarApproval
          entries={calendarEntries}
          onApproved={onCalendarApproved}
          onRejected={onCalendarRejected}
        />
      )}

      {/* 13. Metrics Bar */}
      {!isStreaming && generationMetrics && (
        <MetricsBar metrics={generationMetrics} />
      )}
    </div>
  );
}
