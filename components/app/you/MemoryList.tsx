"use client";

import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { confirmMemory, deleteMemory } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { isShapeError } from "@/lib/learning";
import { errorMessageOf, freshnessLabel, provenanceLabel, removeWithRollback, statusOf } from "@/lib/you";
import type { MemoryOut } from "@/lib/types";

interface MemoryListProps {
  memories: MemoryOut[];
  setMemories: (update: (memories: MemoryOut[]) => MemoryOut[]) => void;
  /** The user's IANA zone, so "noted today" means today on their clock. */
  timeZone: string;
  /** Re-read the page: the backend says the memory changed elsewhere (409). */
  onStale: () => void;
}

const FORGET_COPY = "Forget — Jarvis won't store this again.";
const TRY_AGAIN = "That didn't go through. Try again.";

/** What Jarvis remembers: whose words, how fresh; confirm it, or forget it for good. */
export function MemoryList({ memories, setMemories, timeZone, onStale }: MemoryListProps) {
  const { showToast } = useJarvis();
  const { run, isBusy } = useSingleFlight();
  // The memory whose Forget is waiting for a second, deliberate click.
  const [forgetting, setForgetting] = useState<string | null>(null);
  const now = new Date();

  async function confirm(memory: MemoryOut) {
    const id = memory.memory_id;
    const pending = run(id, () => confirmMemory(id));
    if (!pending) return;
    try {
      const confirmed = await pending;
      setMemories((all) => all.map((m) => (m.memory_id === id ? confirmed : m)));
      showToast("Confirmed — Jarvis will keep this in mind.", "success");
    } catch (err) {
      if (isShapeError(err)) {
        onStale(); // it answered 2xx in a shape this page can't read: re-read to show it
      } else if (statusOf(err) === 409) {
        showToast(errorMessageOf(err, "This memory changed in the meantime."), "info");
        onStale();
      } else {
        showToast(errorMessageOf(err, TRY_AGAIN), "error");
      }
    }
  }

  async function forget(memory: MemoryOut, index: number) {
    const id = memory.memory_id;
    setForgetting(null);
    const pending = run(id, () =>
      removeWithRollback({
        item: memory,
        index,
        key: (m) => m.memory_id,
        setItems: setMemories,
        request: () => deleteMemory(id),
        isGone: (err) => statusOf(err) === 404, // already gone: nothing to roll back
      }),
    );
    if (!pending) return;
    const failure = await pending;
    if (failure) showToast(errorMessageOf(failure, TRY_AGAIN), "error");
    else showToast("Forgotten. Jarvis won't store it again.", "success");
  }

  if (memories.length === 0) {
    return (
      <p className="text-sm text-secondary">
        Nothing remembered yet. What you tell Jarvis in chat shows up here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {memories.map((memory, index) => {
        const id = memory.memory_id;
        const busy = isBusy(id);
        const freshness = Math.round(Math.min(1, Math.max(0, memory.freshness)) * 100);
        return (
          <li key={id} className="rounded-lg bg-surface-muted px-3 py-3 sm:px-4">
            <p className="break-words text-sm text-primary">{memory.content}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge color={memory.provenance === "said" ? "dusk" : "sage"}>
                {provenanceLabel(memory.provenance)}
              </Badge>
              <span className="text-[11px] text-muted">
                {freshnessLabel(memory.noted_at, now, timeZone)}
              </span>
              <span
                role="meter"
                aria-label="Freshness"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={freshness}
                title={`Freshness ${freshness}%: fades while unused, renews when you confirm it`}
                className="h-1 w-12 overflow-hidden rounded-full bg-surface-canvas"
              >
                <span className="block h-full rounded-full bg-sage" style={{ width: `${freshness}%` }} />
              </span>
            </div>

            {forgetting === id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Forget this memory?">
                <span className="text-xs text-secondary">{FORGET_COPY}</span>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => forget(memory, index)}>
                  <Trash2 size={12} className="mr-1" />
                  Forget
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setForgetting(null)}>
                  Keep
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => confirm(memory)}>
                  {busy ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : (
                    <Check size={12} className="mr-1" />
                  )}
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  aria-label={FORGET_COPY}
                  onClick={() => setForgetting(id)}
                >
                  <Trash2 size={12} className="mr-1" />
                  Forget
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
