/**
 * What a task's workspace shows, and in which section. Pure helpers: no fetch, no React.
 *
 * Every field the backend added later (`metadata`, a structured quiz) may be missing
 * from an older backend or a cached workspace; these read that as "not there", never
 * as a crash.
 */

import type { Quiz, QuizQuestion, StudyAsset } from './types';

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
