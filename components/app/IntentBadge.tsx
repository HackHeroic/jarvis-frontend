'use client';

import { getIntentColor } from '@/lib/constants';

interface IntentBadgeProps {
  intent: string;
}

const COLOR_CLASSES: Record<string, string> = {
  terra: 'bg-terra/10 text-terra border-terra/20',
  sage: 'bg-sage/10 text-sage border-sage/20',
  dusk: 'bg-dusk/10 text-dusk border-dusk/20',
  gold: 'bg-gold/10 text-gold border-gold/20',
  ink: 'bg-ink/10 text-secondary border-ink/20',
};

function formatIntent(intent: string): string {
  return intent
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function IntentBadge({ intent }: IntentBadgeProps) {
  const colorKey = getIntentColor(intent);
  const classes = COLOR_CLASSES[colorKey] || COLOR_CLASSES.ink;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-mono font-semibold tracking-wide border ${classes}`}
    >
      {formatIntent(intent)}
    </span>
  );
}
