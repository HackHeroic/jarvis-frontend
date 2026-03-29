import { Button } from "@/components/ui/Button";
import clsx from "clsx";

interface EmptyStateProps {
  icon: string;
  headline: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  headline,
  subtitle,
  ctaLabel,
  onCta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "mx-auto flex max-w-[400px] flex-col items-center text-center",
        className,
      )}
    >
      <span className="text-[48px] leading-none">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-primary">{headline}</h3>
      {subtitle && (
        <p className="mt-2 text-sm text-secondary">{subtitle}</p>
      )}
      {ctaLabel && onCta && (
        <Button className="mt-6" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
