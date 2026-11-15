/**
 * What a task's workspace shows, and in which section. Pure helpers: no fetch, no React.
 *
 * Every field the backend added later (`metadata`, a structured quiz) may be missing
 * from an older backend or a cached workspace; these read that as "not there", never
 * as a crash.
 */

import { dueHintLabel } from './schedule';
import type { Quiz, QuizQuestion, StudyAsset, TaskKind } from './types';

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** Asset types that are a link to open elsewhere ("Read or watch"). */
const LINK_TYPES: ReadonlySet<string> = new Set([
  'youtube_link',
  'article_link',
  'blog_link',
  'leetcode_link',
  'codeforces_link',
]);

/** Asset types drawn from the user's own documents. */
const DOCUMENT_TYPES: ReadonlySet<string> = new Set(['pdf_chunk']);

/** The workspace's assets by section, each in the order the backend sent them. */
export interface AssetGroups {
  /** Excerpts from the user's documents. */
  fromDocuments: StudyAsset[];
  /** A quiz, an outline or a checklist: something to work through. */
  practice: StudyAsset[];
  /** Links to read or watch. */
  links: StudyAsset[];
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** True for an http(s) address: the only kind a link card may point at. */
export function isWebUrl(value: unknown): boolean {
  const text = nonEmpty(value);
  if (!text) return false;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** An asset with the fields every card reads, or null when it has nothing to show. */
function readAsset(raw: unknown): StudyAsset | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const type = nonEmpty(row.asset_type);
  const content = nonEmpty(row.content_or_url);
  if (!type || !content) return null;
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : undefined;
  return {
    asset_type: type,
    title: nonEmpty(row.title) ?? '',
    content_or_url: content,
    rationale: nonEmpty(row.rationale) ?? '',
    ...(metadata ? { metadata } : {}),
  };
}

/**
 * Split a workspace's assets into its three sections, keeping the backend's order
 * within each. Excerpts go under "From your documents"; quizzes, outlines and
 * checklists under "Practice"; links under "Read or watch". A link that is not an
 * http(s) address is dropped (never put in an `href`). An asset of a type this page
 * does not know is a link when it is a web address, otherwise something to practise
 * with, so nothing the backend sends is silently hidden. Rows without content are
 * skipped.
 */
export function groupAssets(assets: unknown): AssetGroups {
  const groups: AssetGroups = { fromDocuments: [], practice: [], links: [] };
  if (!Array.isArray(assets)) return groups;
  for (const raw of assets) {
    const asset = readAsset(raw);
    if (!asset) continue;
    const type = asset.asset_type;
    if (DOCUMENT_TYPES.has(type)) {
      groups.fromDocuments.push(asset);
    } else if (LINK_TYPES.has(type)) {
      if (isWebUrl(asset.content_or_url)) groups.links.push(asset);
    } else if (type.startsWith('generated_')) {
      groups.practice.push(asset);
    } else if (isWebUrl(asset.content_or_url)) {
      groups.links.push(asset);
    } else {
      groups.practice.push(asset);
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

function readQuestion(raw: unknown): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const question = nonEmpty(row.question);
  const answer = nonEmpty(row.answer);
  if (!question || !answer) return null;
  if (row.hint !== undefined && row.hint !== null && typeof row.hint !== 'string') return null;
  return { question, answer, hint: nonEmpty(row.hint) ?? '' };
}

/**
 * The structured quiz in a quiz asset's `metadata.quiz`, or null: when there is
 * none, or when any part of it cannot be read (no questions, a question without its
 * answer). Null means "show the quiz's markdown instead", which always holds every
 * question, so a partly readable quiz is never shown with questions missing. The
 * title falls back to the asset's own.
 */
export function quizOf(asset: Pick<StudyAsset, 'asset_type' | 'title' | 'metadata'> | null | undefined): Quiz | null {
  if (!asset || asset.asset_type !== 'generated_quiz') return null;
  const raw = asset.metadata?.quiz;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const quiz = raw as Record<string, unknown>;
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) return null;
  const questions: QuizQuestion[] = [];
  for (const item of quiz.questions) {
    const question = readQuestion(item);
    if (!question) return null;
    questions.push(question);
  }
  return { title: nonEmpty(quiz.title) ?? nonEmpty(asset.title) ?? 'Quiz', questions };
}

/** "0 of 4 revealed": how many answers are showing. */
export function revealedLabel(revealed: number, total: number): string {
  const shown = Math.min(Math.max(0, Math.floor(revealed)), Math.max(0, total));
  return `${shown} of ${total} revealed`;
}

// ---------------------------------------------------------------------------
// Excerpts
// ---------------------------------------------------------------------------

/**
 * The document an excerpt came from (`metadata.source_id`, with `file_name` when
 * sent), or null when the excerpt does not say: then it gets no "Open document" link.
 */
export function excerptSource(
  asset: Pick<StudyAsset, 'metadata'> | null | undefined,
): { sourceId: string; fileName: string | null } | null {
  const sourceId = nonEmpty(asset?.metadata?.source_id);
  if (!sourceId) return null;
  return { sourceId, fileName: nonEmpty(asset?.metadata?.file_name) };
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

/**
 * What the workspace could not surface, in the backend's plain words (e.g. that web
 * results are unavailable): each non-blank notice once. [] when it sends none.
 */
export function noticesOf(workspace: { notices?: unknown } | null | undefined): string[] {
  const rows = workspace?.notices;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const text = nonEmpty(row);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The task's own details: criteria, subtitle, kind, length, due
// ---------------------------------------------------------------------------

/** Spaces and common punctuation at either end of a text. */
const EDGE_PUNCTUATION = /^[\s.,;:!?'"`()[\]{}\-\u2013\u2014\u2026]+|[\s.,;:!?'"`()[\]{}\-\u2013\u2014\u2026]+$/g;

/** Lower case, inner spaces collapsed, edge punctuation dropped: how two texts are compared. */
function comparable(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(EDGE_PUNCTUATION, '');
}

/** True when `text` is the title again (or blank): nothing a reader does not already see. */
export function repeatsTitle(text: string, title: string): boolean {
  const t = comparable(text);
  return !t || t === comparable(title);
}

/**
 * True when a `primary_objective` adds nothing to the title. The backend builds it as
 * the title with the task's topic words run on after it, so the title alone, or the
 * title followed by more words, is a repeat.
 */
export function objectiveRepeatsTitle(objective: string, title: string): boolean {
  if (repeatsTitle(objective, title)) return true;
  const head = comparable(title);
  return !!head && comparable(objective).startsWith(`${head} `);
}

/**
 * Completion criteria written as one text, as separate items: split on new lines and
 * semicolons, list markers ("- ", "* ", "1. ") dropped, blanks skipped.
 */
export function splitCriteria(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  return text
    .split(/[;\n]/)
    .map((line) => line.trim().replace(/^(?:[-*\u2022]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
}

/** What the workspace's header and its "Completion criteria" card show. */
export interface WorkspaceHeader {
  /** A line under the title; null when it would only repeat the title or a criterion. */
  subtitle: string | null;
  /** The criteria to check off; [] when there is none worth showing (none is guessed). */
  criteria: string[];
}

/**
 * The criteria and subtitle for a task's workspace. The task's own
 * `completion_criteria` comes first; without it, the criteria the chat's plan
 * stored for the task (`stored`), then `primary_objective`. A criterion that is
 * only the task's title again, or an objective that is only the title (with its
 * topic words run on), is never shown, and the subtitle is left out when it is
 * already the criterion.
 */
export function workspaceHeader(
  workspace: { task_title?: unknown; primary_objective?: unknown; completion_criteria?: unknown } | null | undefined,
  stored: string[] = [],
): WorkspaceHeader {
  const title = nonEmpty(workspace?.task_title) ?? '';
  const keep = (items: string[]) => items.filter((c) => !repeatsTitle(c, title));

  const objective = nonEmpty(workspace?.primary_objective);
  const objectiveShown = objective && !objectiveRepeatsTitle(objective, title) ? objective : null;

  let criteria = keep(splitCriteria(workspace?.completion_criteria));
  if (criteria.length === 0) criteria = keep(stored.flatMap(splitCriteria));
  if (criteria.length === 0 && objectiveShown) criteria = [objectiveShown];

  const subtitle =
    objectiveShown && !criteria.some((c) => comparable(c) === comparable(objectiveShown))
      ? objectiveShown
      : null;
  return { subtitle, criteria };
}

const KIND_LABELS: Record<TaskKind, string> = {
  practice: 'Practice',
  study: 'Study',
  write: 'Writing',
  build: 'Building',
  admin: 'Admin',
};

/** "25 min", "1 h", "1 h 30 min"; null when the length is unknown or not a positive number. */
export function durationLabel(minutes: unknown): string | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null;
  const total = Math.round(minutes);
  if (total < 60) return `${Math.max(1, total)} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * The small facts shown under a workspace's title: what kind of work it is (only
 * when the backend says), how long it is planned for, and when it is due. Each is
 * null when unknown.
 */
export function taskFacts(
  workspace: { task_kind?: unknown; duration_minutes?: unknown; deadline_hint?: unknown } | null | undefined,
): { kind: string | null; duration: string | null; due: string | null } {
  const kind = typeof workspace?.task_kind === 'string' ? workspace.task_kind : '';
  const hint = nonEmpty(workspace?.deadline_hint);
  return {
    kind: Object.prototype.hasOwnProperty.call(KIND_LABELS, kind) ? KIND_LABELS[kind as TaskKind] : null,
    duration: durationLabel(workspace?.duration_minutes),
    due: hint ? dueHintLabel(hint) || null : null,
  };
}

/** The if-then plan a workspace shows (the WOOP card's obstacle and plan). */
export interface WorkspaceWoop {
  obstacle: string;
  plan: string;
  outcome: string | null;
}

/**
 * The task's if-then plan: the one the chat's plan stored for it (`stored`, an
 * `implementation_intention`) first, else the workspace's own `woop_card`. Null when
 * neither has both an obstacle and a plan.
 */
export function woopFor(
  workspace: { woop_card?: unknown } | null | undefined,
  stored?: unknown,
): WorkspaceWoop | null {
  const local = (stored ?? null) as { obstacle_trigger?: unknown; behavioral_response?: unknown } | null;
  const localObstacle = nonEmpty(local?.obstacle_trigger);
  const localPlan = nonEmpty(local?.behavioral_response);
  if (localObstacle && localPlan) return { obstacle: localObstacle, plan: localPlan, outcome: null };

  const card = workspace?.woop_card;
  if (!card || typeof card !== 'object') return null;
  const row = card as Record<string, unknown>;
  const obstacle = nonEmpty(row.obstacle);
  const plan = nonEmpty(row.plan);
  if (!obstacle || !plan) return null;
  return { obstacle, plan, outcome: nonEmpty(row.outcome) };
}
