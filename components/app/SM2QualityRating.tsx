'use client';

import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUALITY_LABELS = ['Blackout', 'Wrong', 'Hard', 'Struggled', 'Good', 'Perfect'];

const QUALITY_COLORS = [
  'bg-red-500/80 hover:bg-red-500',
  'bg-red-400/70 hover:bg-red-400',
  'bg-gold/70 hover:bg-gold',
  'bg-gold/50 hover:bg-gold/80',
  'bg-sage/70 hover:bg-sage',
  'bg-sage hover:bg-sage/90',
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SM2QualityRatingProps {
  onRate: (quality: number) => void;
  taskTitle?: string;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SM2QualityRating({ onRate, taskTitle }: SM2QualityRatingProps) {
  return (
    <div className="mt-3 p-3 rounded-xl border border-border bg-surface-card">
      <p className="text-xs font-medium text-secondary mb-2.5">
        {taskTitle
          ? `How well did you complete "${taskTitle}"?`
          : 'How well did you understand this?'}
      </p>
      <div className="flex items-center gap-1.5">
        {QUALITY_LABELS.map((label, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onRate(index)}
            title={label}
            className={clsx(
              'flex-1 py-2 rounded-lg text-[11px] font-medium text-white transition-all active:scale-95',
              QUALITY_COLORS[index],
            )}
          >
            <span className="block text-sm font-bold leading-none mb-0.5">{index}</span>
            <span className="block text-[9px] opacity-80 leading-none">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
