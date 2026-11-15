"use client";

import { useState } from "react";
import { Brain, Check, Loader2 } from "lucide-react";
import { deleteMemory } from "@/lib/api";
import { errorMessageOf, statusOf } from "@/lib/you";
import type { RememberedLine as Line } from "@/lib/remembered";

interface RememberedLineProps {
  line: Line;
  /** False while the turn is still streaming: Undo appears once the reply is done. */
  canUndo: boolean;
  /** The memory was forgotten from this line. */
  onForgotten?: (memoryId: string) => void;
}

const UNDO_FAILED = "That didn't go through. Try again.";

/**
 * "Remembered: …" or "Updated: …" under a reply, with Undo: Undo forgets the memory
 * for good (its words are erased, and Jarvis does not store it again) and the line
 * then reads "Forgotten". A line whose memory id is unknown has no Undo.
 */
export function RememberedLine({ line, canUndo, onForgotten }: RememberedLineProps) {
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (line.forgotten || gone) {
    return (
      <li className="flex items-start gap-1.5 text-xs text-muted">
        <Check size={12} className="mt-0.5 shrink-0 text-sage" />
        <span>Forgotten</span>
      </li>
    );
  }

  const memoryId = line.memoryId;

  async function undo() {
    if (!memoryId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMemory(memoryId);
    } catch (err) {
      // Already gone (404) is what Undo asked for; anything else says so here.
      if (statusOf(err) !== 404) {
        setError(errorMessageOf(err, UNDO_FAILED));
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    setGone(true);
    onForgotten?.(memoryId);
  }

  return (
    <li className="flex items-start gap-1.5 text-xs text-secondary">
      <Brain size={12} className="mt-0.5 shrink-0 text-dusk" />
      <span className="min-w-0 flex-1 break-words">
        <span className="font-medium text-primary">{line.verb}:</span> {line.text}
        {error && (
          <span role="alert" className="mt-0.5 block text-terra">
            {error}
          </span>
        )}
      </span>
      {canUndo && memoryId && (
        <button
          type="button"
          onClick={undo}
          disabled={busy}
          aria-label={`Undo: forget "${line.text}"`}
          className="-my-0.5 inline-flex shrink-0 items-center gap-1 rounded-button px-1.5 py-0.5 font-medium text-terra transition-colors hover:bg-terra/10 disabled:opacity-60 max-md:min-h-8"
        >
          {busy && <Loader2 size={11} className="animate-spin" />}
          Undo
        </button>
      )}
    </li>
  );
}
