'use client';

import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUALITY_LABELS = ['Blackout', 'Wrong', 'Hard', 'Struggled', 'Good', 'Perfect'];

const QUALITY_COLORS = [
  'bg-red-500/80 hover:bg-red-500',
  'bg-red-400/70 hover:bg-red-400',
  'bg-[color-mix(in_srgb,var(--color-gold)_70%,transparent)] hover:bg-gold',
  'bg-[color-mix(in_srgb,var(--color-gold)_50%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-gold)_80%,transparent)]',
  'bg-[color-mix(in_srgb,var(--color-sage)_70%,transparent)] hover:bg-sage',
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
              'min-w-0 flex-1 rounded-lg px-0.5 py-2 text-[11px] font-medium text-white transition-all active:scale-95',
              QUALITY_COLORS[index],
            )}
          >
            <span className="block text-sm font-bold leading-none mb-0.5">{index}</span>
            <span className="block truncate text-[9px] leading-none opacity-80">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
