'use client';

import { RefreshCw } from 'lucide-react';

interface ReplanBannerProps {
  onReplan?: () => void;
  isReplanning?: boolean;
}

export function ReplanBanner({ onReplan, isReplanning }: ReplanBannerProps) {
  return (
    <div className="mt-3 flex items-center justify-between p-3 rounded-card border border-dusk/30 bg-dusk/5">
      <p className="text-xs text-secondary">
        Schedule may be outdated.
      </p>
      <button
        type="button"
        onClick={onReplan}
        disabled={isReplanning}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button
          bg-dusk/15 text-dusk border border-dusk/30
          hover:bg-dusk/25 disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors"
      >
        <RefreshCw size={12} className={isReplanning ? 'animate-spin' : ''} />
        {isReplanning ? 'Replanning...' : 'Replan'}
      </button>
    </div>
  );
}
