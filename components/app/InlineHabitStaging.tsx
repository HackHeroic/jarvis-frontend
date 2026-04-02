'use client';

import { useState } from 'react';

interface InlineHabitStagingProps {
  habit: string;
  onSave?: () => void;
  onIgnore?: () => void;
}

export function InlineHabitStaging({ habit, onSave, onIgnore }: InlineHabitStagingProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mt-3 p-3 rounded-card border border-gold/30 bg-gold/5">
      <p className="text-xs text-secondary mb-2">
        <span className="font-semibold text-gold">New habit detected:</span>{' '}
        {habit}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onSave?.();
            setDismissed(true);
          }}
          className="px-3 py-1 text-xs rounded-button bg-sage/15 text-sage border border-sage/30
            hover:bg-sage/25 transition-colors font-medium"
        >
          Save as Constraint
        </button>
        <button
          type="button"
          onClick={() => {
            onIgnore?.();
            setDismissed(true);
          }}
          className="px-3 py-1 text-xs rounded-button text-muted border border-border
            hover:bg-surface-subtle transition-colors"
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
