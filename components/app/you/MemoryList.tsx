"use client";

import { useState, type KeyboardEvent } from "react";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { confirmMemory, deleteMemory, editMemory } from "@/lib/api";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useSingleFlight } from "@/lib/hooks/useSingleFlight";
import { isShapeError } from "@/lib/learning";
import {
  errorMessageOf,
  freshnessLabel,
  groupMemories,
  memoryEditCheck,
  provenanceLabel,
  removeWithRollback,
  statusOf,
} from "@/lib/you";
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
const SAVE_FAILED = "That didn't save. Try again.";

/** The memory being edited: its id, the words in the input, and why the last save failed. */
interface EditState {
  id: string;
  draft: string;
  error: string | null;
}

/**
 * What Jarvis remembers, under "What you told me" and "What I noticed": whose words,
 * how fresh; confirm it, correct its words, or forget it for good.
 */
export function MemoryList({ memories, setMemories, timeZone, onStale }: MemoryListProps) {
  const { showToast } = useJarvis();
  const { run, isBusy } = useSingleFlight();
  // The memory whose Forget is waiting for a second, deliberate click.
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
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

  async function forget(memory: MemoryOut) {
    const id = memory.memory_id;
    setForgetting(null);
    const index = memories.findIndex((m) => m.memory_id === id);
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

  function startEdit(memory: MemoryOut) {
    setForgetting(null);
    setEditing({ id: memory.memory_id, draft: memory.content, error: null });
  }

  async function save(memory: MemoryOut) {
    if (!editing || editing.id !== memory.memory_id) return;
    if (!memoryEditCheck(editing.draft, memory.content).canSave) return;
    const id = memory.memory_id;
    const draft = editing.draft;
    const pending = run(id, () => editMemory(id, draft));
    if (!pending) return;
    try {
      const edited = await pending;
      setMemories((all) => all.map((m) => (m.memory_id === id ? edited : m)));
      setEditing((e) => (e?.id === id ? null : e));
      showToast("Updated. Jarvis will use the new words.", "success");
    } catch (err) {
      if (isShapeError(err)) {
        // It answered 2xx in a shape this page can't read: the edit landed; re-read to show it.
        setEditing((e) => (e?.id === id ? null : e));
        onStale();
        return;
      }
      // Said here, under the input, which stays open with the words as typed.
      setEditing((e) => (e?.id === id ? { ...e, error: errorMessageOf(err, SAVE_FAILED) } : e));
    }
  }

  if (memories.length === 0) {
    return (
      <p className="text-sm text-secondary">
        Nothing remembered yet. What you tell Jarvis in chat shows up here.
      </p>
    );
  }

  const { said, noticed } = groupMemories(memories);

  const row = (memory: MemoryOut) => {
    const id = memory.memory_id;
    const busy = isBusy(id);
    const freshness = Math.round(Math.min(1, Math.max(0, memory.freshness)) * 100);
    const edit = editing?.id === id ? editing : null;
    const check = edit ? memoryEditCheck(edit.draft, memory.content) : null;

    function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditing(null);
      } else if (e.key === "Enter" && !e.shiftKey) {
        // A memory is one statement: Enter saves.
        e.preventDefault();
        void save(memory);
      }
    }

    return (
      <li key={id} className="rounded-lg bg-surface-muted px-3 py-3 sm:px-4">
        {edit ? (
          <div>
            <textarea
              value={edit.draft}
              onChange={(e) => setEditing({ ...edit, draft: e.target.value, error: null })}
              onKeyDown={onKeyDown}
              aria-label="The memory's words"
              aria-invalid={!!(check?.problem || edit.error)}
              rows={Math.min(6, Math.max(2, Math.ceil(edit.draft.length / 70)))}
              autoFocus
              disabled={busy}
              className="block w-full resize-y rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-primary focus:border-terra/60 focus:outline-none focus:ring-2 focus:ring-terra/30"
            />
            {(check?.problem || edit.error) && (
              <p role="alert" className="mt-1.5 break-words text-xs text-terra">
                {check?.problem ?? edit.error}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !check?.canSave}
                onClick={() => save(memory)}
              >
                {busy ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Check size={12} className="mr-1" />}
                Save
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="break-words text-sm text-primary">{memory.content}</p>
        )}

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

        {edit ? null : forgetting === id ? (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Forget this memory?">
            <span className="text-xs text-secondary">{FORGET_COPY}</span>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => forget(memory)}>
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
              aria-label="Edit — correct what this memory says"
              onClick={() => startEdit(memory)}
            >
              <Pencil size={12} className="mr-1" />
              Edit
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
  };

  return (
    <div className="space-y-4">
      {said.length > 0 && (
        <section aria-labelledby="memories-said">
          <h3 id="memories-said" className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            What you told me
          </h3>
          <ul className="space-y-2">{said.map(row)}</ul>
        </section>
      )}
      {noticed.length > 0 && (
        <section aria-labelledby="memories-noticed">
          <h3 id="memories-noticed" className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            What I noticed
          </h3>
          <ul className="space-y-2">{noticed.map(row)}</ul>
        </section>
      )}
    </div>
  );
}
