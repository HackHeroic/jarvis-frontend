'use client';

import { TaskPreview } from './TaskPreview';
import { SchedulePreview } from './SchedulePreview';

import type { ChatResponse, TaskChunk } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DraftReviewProps {
  response: ChatResponse;
  onConfirmTasks: (tasks: TaskChunk[]) => void;
  onAcceptDraft: () => void;
  onRejectDraft: () => void;
  onChatModify: () => void;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DraftReview({
  response,
  onConfirmTasks,
  onAcceptDraft,
  onRejectDraft,
  onChatModify,
  isLoading,
}: DraftReviewProps) {
  // Stage 1: Task confirmation — user reviews decomposed tasks before scheduling
  if (response.awaiting_task_confirmation && response.execution_graph) {
    const { execution_graph } = response;
    return (
      <TaskPreview
        tasks={execution_graph.decomposition}
        goalTitle={execution_graph.goal_metadata?.objective}
        cognitiveLoad={execution_graph.cognitive_load_estimate}
        onConfirm={onConfirmTasks}
        onChatModify={onChatModify}
        isLoading={isLoading}
      />
    );
  }

  // Stage 2: Schedule preview — user reviews OR-Tools generated schedule
  if (response.schedule_status === 'draft' && response.schedule) {
    const draftId = response.draft_id || response.schedule.draft_id || 'draft';
    return (
      <SchedulePreview
        schedule={response.schedule}
        draftId={draftId}
        onAccept={onAcceptDraft}
        onReject={onRejectDraft}
        isLoading={isLoading}
      />
    );
  }

  // No draft state to render
  return null;
}
