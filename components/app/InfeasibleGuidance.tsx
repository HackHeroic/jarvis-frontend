'use client';

interface InfeasibleGuidanceProps {
  conflictSummary?: string;
  onReduceScope?: () => void;
  onExtendDeadline?: () => void;
  onIncreaseCap?: () => void;
}

export function InfeasibleGuidance({
  conflictSummary,
  onReduceScope,
  onExtendDeadline,
  onIncreaseCap,
}: InfeasibleGuidanceProps) {
  return (
    <div className="mt-3 p-4 rounded-card border border-gold/30 bg-gold/5">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg leading-none mt-0.5">&#x1F331;</span>
        <div>
          <p className="text-sm font-medium text-primary">
            Scope mismatch detected
          </p>
          <p className="text-xs text-secondary mt-1">
            This isn&apos;t a failure -- your ambition just exceeded the available time.
            Let&apos;s recalibrate together.
          </p>
          {conflictSummary && (
            <p className="text-xs text-muted mt-1 italic">{conflictSummary}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReduceScope}
          className="px-3 py-1.5 text-xs rounded-button border border-sage/30 text-sage
            hover:bg-sage/10 transition-colors font-medium"
        >
          Reduce scope
        </button>
        <button
          type="button"
          onClick={onExtendDeadline}
          className="px-3 py-1.5 text-xs rounded-button border border-dusk/30 text-dusk
            hover:bg-dusk/10 transition-colors font-medium"
        >
          Extend deadline
        </button>
        <button
          type="button"
          onClick={onIncreaseCap}
          className="px-3 py-1.5 text-xs rounded-button border border-gold/30 text-gold
            hover:bg-gold/10 transition-colors font-medium"
        >
          Increase daily cap
        </button>
      </div>
    </div>
  );
}
