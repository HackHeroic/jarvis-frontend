/**
 * What a chat turn remembered, as the lines under its reply: "Remembered: …" for a
 * memory the turn created, "Updated: …" for one that replaced an older memory, each
 * once, with an Undo that forgets it. A memory the turn only reinforced is not listed
 * (it was already known). Pure helpers: no fetch, no React.
 *
 * The input is a message's learning moments (lib/learning.ts), which may come back
 * from localStorage in any shape, or the raw `memory_extracted` frames: both are read
 * defensively.
 */

import type { JarvisMessage } from './types';

export type RememberedVerb = 'Remembered' | 'Updated';

/** One line under a reply. */
export interface RememberedLine {
  /** The memory to forget on Undo; null when unknown (no Undo is offered). */
  memoryId: string | null;
  /** The memory in words; '' once forgotten (its words are not kept). */
  text: string;
  verb: RememberedVerb;
  /** The user forgot it from this line: it reads "Forgotten". */
  forgotten: boolean;
}

const VERB_BY_ACTION: Record<string, RememberedVerb> = {
  created: 'Remembered',
  superseded: 'Updated',
};

function nonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** The memory id on a moment (`id`) or a frame (`memory_id`), as a non-blank string. */
function memoryIdOf(row: Record<string, unknown>): string | null {
  const id = row.memory_id ?? row.id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  return nonBlank(id);
}

/**
 * The lines to show under a reply, in the order the memories arrived: created
 * memories read "Remembered", superseded ones "Updated"; reinforced ones (and any
 * other action) are left out, as are patterns. A memory listed twice (by its id, or
 * by its words when it has no id) shows once. A forgotten line keeps its place with
 * no words. Rows that cannot be read are skipped.
 */
export function rememberedLines(moments: unknown): RememberedLine[] {
  if (!Array.isArray(moments)) return [];
  const lines: RememberedLine[] = [];
  const byKey = new Map<string, RememberedLine>();
  for (const raw of moments) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    if (row.kind !== undefined && row.kind !== 'memory') continue;
    const verb = VERB_BY_ACTION[typeof row.action === 'string' ? row.action : ''];
    if (!verb) continue;
    const forgotten = row.forgotten === true;
    const text = forgotten ? '' : nonBlank(row.content);
    if (!forgotten && !text) continue;
    const memoryId = memoryIdOf(row);
    const key = memoryId ? `id:${memoryId}` : `text:${verb}:${(text ?? '').toLowerCase()}`;
    const seen = byKey.get(key);
    if (seen) {
      if (forgotten && !seen.forgotten) {
        seen.forgotten = true;
        seen.text = '';
      }
      continue;
    }
    const line: RememberedLine = { memoryId, text: text ?? '', verb, forgotten };
    byKey.set(key, line);
    lines.push(line);
  }
  return lines;
}

/** One "I noticed: …" line: a pattern the turn learned from what happened. */
export interface NoticedLine {
  key: string;
  text: string;
}

/** The patterns a turn learned, each with words, in arrival order. */
export function noticedLines(moments: unknown): NoticedLine[] {
  if (!Array.isArray(moments)) return [];
  const out: NoticedLine[] = [];
  moments.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const row = raw as Record<string, unknown>;
    if (row.kind !== 'pattern') return;
    const text = nonBlank(row.content);
    if (text) out.push({ key: `${memoryIdOf(row) ?? 'pattern'}-${i}`, text });
  });
  return out;
}

/**
 * The chat after the user forgot `memoryId` from a remembered line: every learning
 * moment for it is marked forgotten and loses its words, and it leaves every reply's
 * panel memories, so the forgotten words are not kept in the stored chat either.
 * Returns the same array when no message mentions it.
 */
export function markForgotten(messages: JarvisMessage[], memoryId: string): JarvisMessage[] {
  const id = memoryId.trim();
  if (!id) return messages;
  let changed = false;
  const next = messages.map((message) => {
    let updated = message;
    const moments = message.learningMoments;
    if (Array.isArray(moments) && moments.some((m) => m && m.kind === 'memory' && m.id === id)) {
      updated = {
        ...updated,
        learningMoments: moments.map((m) =>
          m && m.kind === 'memory' && m.id === id ? { ...m, content: '', forgotten: true } : m,
        ),
      };
    }
    const panel = message.response?.memories;
    if (Array.isArray(panel) && panel.some((m) => m && m.memory_id === id)) {
      updated = {
        ...updated,
        response: { ...updated.response!, memories: panel.filter((m) => !m || m.memory_id !== id) },
      };
    }
    if (updated !== message) changed = true;
    return updated;
  });
  return changed ? next : messages;
}
