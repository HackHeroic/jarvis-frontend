'use client';

interface ClarificationChipsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function ClarificationChips({ options, onSelect, disabled }: ClarificationChipsProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs text-muted">Quick replies:</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs rounded-pill border border-terra/30 text-terra
              hover:bg-terra/10 hover:border-terra/60
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
