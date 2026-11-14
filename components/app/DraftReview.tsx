'use client';

import { SchedulePreview } from './SchedulePreview';

import type { ChatResponse } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DraftReviewProps {
  response: ChatResponse;
  onAcceptDraft: () => void;
  onRejectDraft: (reason?: string) => void;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DraftReview({
  response,
  onAcceptDraft,
  onRejectDraft,
  isLoading,
}: DraftReviewProps) {
  // Schedule preview — user reviews the OR-Tools generated schedule
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
