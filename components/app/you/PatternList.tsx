"use client";

import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { confirmMemory, dismissMemory } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { errorMessageOf, removeWithRollback, statusOf } from "@/lib/you";
import type { PatternShown } from "@/lib/types";

interface PatternListProps {
  patterns: PatternShown[];
  setPatterns: (update: (patterns: PatternShown[]) => PatternShown[]) => void;
  /** Re-read the page: the backend says the item changed elsewhere (409). */
  onStale: () => void;
}

const TRY_AGAIN = "That didn't go through. Try again.";

/** Patterns Jarvis sees in what happened, each with its evidence; confirm or say it's not right. */
export function PatternList({ patterns, setPatterns, onStale }: PatternListProps) {
  const { showToast } = useJarvis();
  const { run, isBusy } = useSingleFlight();

  async function confirm(pattern: PatternShown) {
    const id = pattern.memory_id;
    if (!id) return;
    const pending = run(id, () => confirmMemory(id));
    if (!pending) return;
    try {
      await pending;
      setPatterns((all) =>
        all.map((p) => (p.memory_id === id ? { ...p, confirmed: true } : p)),
      );
      showToast("Confirmed — Jarvis will keep this in mind.", "success");
    } catch (err) {
      if (statusOf(err) === 409) {
        showToast(errorMessageOf(err, "This pattern changed in the meantime."), "info");
        onStale();
      } else {
        showToast(errorMessageOf(err, TRY_AGAIN), "error");
      }
    }
  }

  async function dismiss(pattern: PatternShown, index: number) {
    const id = pattern.memory_id;
    if (!id) return;
    const pending = run(id, () =>
      removeWithRollback({
        item: pattern,
        index,
        key: (p) => p.pattern_key,
        setItems: setPatterns,
        request: () => dismissMemory(id),
        // Already forgotten or gone: it is out of the list either way.
        isGone: (err) => statusOf(err) === 404 || statusOf(err) === 409,
      }),
    );
    if (!pending) return;
    const failure = await pending;
    if (failure) showToast(errorMessageOf(failure, TRY_AGAIN), "error");
    else showToast("Got it — Jarvis won't use that pattern.", "success");
  }

  if (patterns.length === 0) {
    return (
      <p className="text-sm text-secondary">
        No patterns yet. Jarvis spots them as your days add up.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {patterns.map((pattern, index) => {
        const id = pattern.memory_id;
        const busy = id ? isBusy(id) : false;
        return (
          <li
            key={pattern.pattern_key}
            className="rounded-lg border-l-[3px] border-sage bg-surface-muted px-3 py-3 sm:px-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm text-primary">{pattern.description}</p>
              {pattern.confirmed && <Badge color="sage">Confirmed</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted">
              seen {pattern.occurrences} {pattern.occurrences === 1 ? "time" : "times"}
            </p>

            {pattern.evidence.length > 0 && (
              <details className="group mt-2">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-secondary hover:text-primary [&::-webkit-details-marker]:hidden">
                  <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                  Evidence ({pattern.evidence.length})
                </summary>
                <ul className="mt-1.5 space-y-1 pl-4">
                  {pattern.evidence.map((line, i) => (
                    <li key={i} className="list-disc text-xs text-secondary">
                      {line}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {!pattern.confirmed && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!id || busy}
                  onClick={() => confirm(pattern)}
                >
                  {busy ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : (
                    <Check size={12} className="mr-1" />
                  )}
                  Confirm
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={!id || busy}
                onClick={() => dismiss(pattern, index)}
              >
                <X size={12} className="mr-1" />
                Not right
              </Button>
            </div>
            {!id && (
              <p className="mt-2 text-[11px] text-muted">
                Jarvis hasn&apos;t stored this pattern yet, so there is nothing to confirm.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
