'use client';

import { ActionItemProposal } from '@/lib/types';

interface ActionProposalCardsProps {
  proposals: ActionItemProposal[];
  onActionClick?: (proposalId: string, action: string) => void;
}

export function ActionProposalCards({ proposals, onActionClick }: ActionProposalCardsProps) {
  if (!proposals || proposals.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-secondary">Action Proposals</p>
      {proposals.map((proposal) => (
        <div
          key={proposal.id}
          className="p-3 rounded-card border border-border bg-surface-card"
        >
          <p className="text-sm font-medium text-primary">{proposal.title}</p>
          <p className="text-xs text-secondary mt-1">{proposal.summary}</p>
          {proposal.deadline_date && (
            <p className="text-[10px] text-terra mt-1">
              Deadline: {proposal.deadline_date}
            </p>
          )}
          {proposal.suggested_actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {proposal.suggested_actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onActionClick?.(proposal.id, action)}
                  className="px-2.5 py-1 text-[10px] rounded-button border border-dusk/30 text-dusk
                    hover:bg-dusk/10 transition-colors font-medium"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
