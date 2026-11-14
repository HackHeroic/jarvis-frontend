import { CloudOff, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { LIST_ERROR_MESSAGE } from "@/lib/learning";

interface ErrorStateProps {
  /** What kind of failure (default: an outage, "Can't reach Jarvis right now"). */
  headline?: string;
  /** Detail under the headline, e.g. the backend's user-facing message. Hidden when it repeats the headline. */
  message?: string;
  onRetry?: () => void;
  /** A single row instead of a centred block, for secondary lists. */
  compact?: boolean;
  className?: string;
}

/** A read could not be shown — an outage (or an answer this page can't read), never "nothing here". The empty case is `EmptyState`. */
export function ErrorState({
  headline = LIST_ERROR_MESSAGE,
  message,
  onRetry,
  compact = false,
  className,
}: ErrorStateProps) {
  const detail = message && message !== headline && message !== LIST_ERROR_MESSAGE ? message : undefined;

  if (compact) {
    return (
      <div role="alert" className={clsx("flex items-center gap-2 text-sm text-secondary", className)}>
        <CloudOff size={16} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1">
          {headline}
          {detail && <span className="text-muted"> — {detail}</span>}
        </span>
        {onRetry && (
          <Button variant="ghost" size="sm" className="shrink-0" onClick={onRetry}>
            <RefreshCw size={12} className="mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={clsx("mx-auto flex max-w-[400px] flex-col items-center text-center", className)}
    >
      <CloudOff size={40} className="text-gold" />
      <h3 className="mt-4 text-lg font-semibold text-primary">{headline}</h3>
      {detail && <p className="mt-2 text-sm text-secondary">{detail}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          <RefreshCw size={14} className="mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
