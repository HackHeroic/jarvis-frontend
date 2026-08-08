'use client';

interface InlineHabitStagingProps {
  /** Constraints the backend confirmed it persisted this turn. */
  habits: string[];
}

/**
 * Confirmation chip for behavioral constraints.
 *
 * Renders only what the backend reports as actually saved
 * (ChatResponse.saved_constraints) — the earlier version showed the response
 * prose with a "Save as Constraint" button that was never wired to anything.
 */
export function InlineHabitStaging({ habits }: InlineHabitStagingProps) {
  if (!habits.length) return null;

  return (
    <div className="mt-3 p-3 rounded-card border border-sage/30 bg-sage/5">
      <p className="text-xs text-secondary mb-1">
        <span className="font-semibold text-sage">
          Constraint{habits.length > 1 ? 's' : ''} saved
        </span>{' '}
        — future schedules will respect {habits.length > 1 ? 'these' : 'this'}:
      </p>
      <ul className="text-xs text-primary list-disc pl-4 space-y-0.5">
        {habits.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </div>
  );
}
