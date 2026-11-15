/**
 * What the Documents list, the document viewer and a task's workspace show about
 * an uploaded document. Pure helpers: no fetch, no React.
 *
 * Every field the backend added later (`has_file`, `linked_tasks`, a workspace's
 * `linked_documents`) may be missing on an older backend; these read that as
 * "unknown", never as a crash.
 */

import type {
  DocumentLinkedTask,
  IngestionDocument,
  LinkedDocument,
  TaskWorkspace,
} from './types';

export const UNTITLED_DOCUMENT = 'Untitled document';

/** Shown in place of the file when the original was not kept (uploaded before files were). */
export const FILE_NOT_KEPT_NOTE =
  "The original file wasn't kept for this upload — re-upload it to open it here.";

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => nonEmpty(v) !== null) : [];
}

// ---------------------------------------------------------------------------
// Naming and describing a document
// ---------------------------------------------------------------------------

/** A document's name: the file's own name, else what it is about, else "Untitled document". */
export function documentTitle(doc: {
  file_name?: string | null;
  document_topics?: string[] | null;
}): string {
  const name = nonEmpty(doc.file_name);
  if (name) return name;
  const topics = stringsOf(doc.document_topics).slice(0, 2).join(' · ');
  return topics || UNTITLED_DOCUMENT;
}

export type DocumentKind = 'pdf' | 'image' | 'other';

const IMAGE_NAMES = new Set(['image', 'png', 'jpeg', 'jpg', 'gif', 'webp', 'heic', 'heif']);

function kindOf(type: string | null | undefined): DocumentKind | null {
  const t = (type ?? '').toLowerCase().split(';')[0].trim();
  if (!t) return null;
  if (t === 'pdf' || t === 'application/pdf') return 'pdf';
  if (t.startsWith('image/') || IMAGE_NAMES.has(t)) return 'image';
  return null;
}

/**
 * How to show the file: a PDF in the browser's own viewer, an image in an `<img>`.
 * The type the file was served with wins, then the media type stored at upload; a
 * served type that says nothing (`application/octet-stream`, empty) defers to it.
 */
export function documentKind(
  mediaType?: string | null,
  contentType?: string | null,
): DocumentKind {
  return kindOf(contentType) ?? kindOf(mediaType) ?? 'other';
}

/** The type badge's text: "PDF", "PNG", "JPEG", "IMAGE"; null when the type is unknown. */
export function documentTypeLabel(mediaType: string | null | undefined): string | null {
  const last = nonEmpty(mediaType)?.split('/').pop()?.split(';')[0].trim();
  if (!last) return null;
  const label = last.toUpperCase();
  return label === 'JPG' ? 'JPEG' : label;
}

const MIME_BY_NAME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
};

/**
 * The file with a type the browser can show. A blob served without a usable type
 * (`application/octet-stream`) would make the browser download the PDF instead of
 * opening it, so it takes the type the upload recorded.
 */
export function viewableBlob(blob: Blob, mediaType: string | null | undefined): Blob {
  if (kindOf(blob.type)) return blob;
  const mime = MIME_BY_NAME[(mediaType ?? '').toLowerCase().trim()];
  return mime ? new Blob([blob], { type: mime }) : blob;
}

/**
 * Whether a PDF can be shown inside the page. Browsers with no built-in PDF viewer
 * (Chrome on Android) report `pdfViewerEnabled: false` and would download the file
 * instead; those get an "Open PDF" button. A browser that does not say is trusted.
 */
export function canEmbedPdf(nav: { pdfViewerEnabled?: boolean } | null | undefined): boolean {
  return nav?.pdfViewerEnabled !== false;
}

/**
 * The name a downloaded copy is saved under: the file's own name, else "document"
 * with the type's extension. (A blob URL's own name is a random id.)
 */
export function downloadName(doc: { file_name?: string | null; media_type?: string | null }): string {
  const name = nonEmpty(doc.file_name);
  if (name) return name;
  const ext = nonEmpty(doc.media_type)?.split('/').pop()?.toLowerCase();
  return ext && ext !== 'image' ? `document.${ext === 'jpeg' ? 'jpg' : ext}` : 'document';
}

/** "1 chunk", "6 chunks"; null when the count is unknown. */
export function chunkCountLabel(count: unknown): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null;
  return `${count} chunk${count === 1 ? '' : 's'}`;
}

/** "Nov 15, 2026"; null when the date is missing or unreadable. */
export function formatDocumentDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Linked tasks
// ---------------------------------------------------------------------------

/** A linked task as the UI shows it: `title` is null when only its id is known. */
export interface LinkedTaskView {
  task_id: string;
  title: string | null;
}

/**
 * The tasks a document is linked to, once each. `linked_tasks` (with titles) when
 * the backend sends it; otherwise the bare `linked_task_ids`, with no title — an id
 * is never shown as if it were a name.
 */
export function linkedTasksOf(doc: {
  linked_tasks?: unknown;
  linked_task_ids?: unknown;
}): LinkedTaskView[] {
  const seen = new Set<string>();
  const out: LinkedTaskView[] = [];
  const add = (taskId: string, title: string | null) => {
    if (seen.has(taskId)) return;
    seen.add(taskId);
    out.push({ task_id: taskId, title });
  };
  if (Array.isArray(doc.linked_tasks)) {
    for (const task of doc.linked_tasks) {
      const id = nonEmpty((task as Partial<DocumentLinkedTask> | null)?.task_id);
      if (id) add(id, nonEmpty((task as Partial<DocumentLinkedTask>).title));
    }
    return out;
  }
  for (const id of stringsOf(doc.linked_task_ids)) add(id.trim(), null);
  return out;
}

/** "Linked to 1 task" / "Linked to 3 tasks"; null when it is linked to none. */
export function linkedTasksLabel(count: number): string | null {
  if (count <= 0) return null;
  return `Linked to ${count} task${count === 1 ? '' : 's'}`;
}

/** Up to `max` linked tasks that have a title, for chips. */
export function titledTasks(
  tasks: LinkedTaskView[],
  max: number = Infinity,
): { task_id: string; title: string }[] {
  return tasks
    .filter((t): t is { task_id: string; title: string } => t.title !== null)
    .slice(0, max);
}

// ---------------------------------------------------------------------------
// Reading the backend's answers
// ---------------------------------------------------------------------------

/**
 * One row of `GET /documents/`, with every list a list and every count a number,
 * so a missing field never breaks the page. Null for a row with no `source_id`.
 */
export function normalizeDocument(raw: unknown): IngestionDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const sourceId = nonEmpty(row.source_id);
  if (!sourceId) return null;
  const doc: IngestionDocument = {
    ...(row as unknown as IngestionDocument),
    id: nonEmpty(row.id) ?? sourceId,
    source_id: sourceId,
    file_name: nonEmpty(row.file_name),
    media_type: nonEmpty(row.media_type),
    document_topics: stringsOf(row.document_topics),
    chunk_count: typeof row.chunk_count === 'number' ? row.chunk_count : 0,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    linked_task_ids: stringsOf(row.linked_task_ids),
  };
  if (typeof row.has_file === 'boolean') doc.has_file = row.has_file;
  else delete doc.has_file;
  if (Array.isArray(row.linked_tasks)) {
    doc.linked_tasks = linkedTasksOf({ linked_tasks: row.linked_tasks }).map((t) => ({
      task_id: t.task_id,
      title: t.title ?? '',
    }));
  } else {
    delete doc.linked_tasks;
  }
  return doc;
}

/** The documents in a `GET /documents/` body; rows it cannot read are skipped. */
export function normalizeDocuments(body: unknown): IngestionDocument[] {
  const rows = (body as { documents?: unknown } | null)?.documents;
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeDocument).filter((d): d is IngestionDocument => d !== null);
}

/** One document from the list (there is no single-document route); null when absent. */
export function findDocument(
  docs: IngestionDocument[],
  sourceId: string,
): IngestionDocument | null {
  return docs.find((d) => d.source_id === sourceId) ?? null;
}

/** The extracted text in a `GET /documents/{id}/chunks` body: its non-blank chunks. */
export function chunksOf(body: unknown): string[] {
  const chunks = (body as { chunks?: unknown } | null)?.chunks;
  return Array.isArray(chunks)
    ? chunks.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    : [];
}

/**
 * Whether to ask for the original file: yes when the backend says it was kept,
 * and when an older backend does not say (a 404 then reads as not kept).
 */
export function shouldTryFile(doc: Pick<IngestionDocument, 'has_file'>): boolean {
  return doc.has_file !== false;
}

/** True when the file request failed because there is no file (404), not an outage. */
export function isFileNotKept(err: unknown): boolean {
  return (err as { status?: unknown } | null)?.status === 404;
}

/** A task workspace's linked document, ready to list. */
export interface LinkedDocumentView extends LinkedDocument {
  title: string;
}

/** The documents a workspace lists under "From your documents"; [] when it sends none. */
export function linkedDocumentsOf(
  workspace: Pick<TaskWorkspace, 'linked_documents'> | null | undefined,
): LinkedDocumentView[] {
  const rows: unknown = workspace?.linked_documents;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: LinkedDocumentView[] = [];
  for (const raw of rows) {
    const row = (raw ?? {}) as Partial<LinkedDocument>;
    const sourceId = nonEmpty(row.source_id);
    if (!sourceId || seen.has(sourceId)) continue;
    seen.add(sourceId);
    const fileName = nonEmpty(row.file_name);
    out.push({
      source_id: sourceId,
      file_name: fileName,
      has_file: row.has_file === true,
      title: documentTitle({ file_name: fileName }),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** The viewer's address for a document. */
export function documentHref(sourceId: string): string {
  return `/documents/${encodeURIComponent(sourceId)}`;
}

/** A task's workspace address. */
export function workspaceHref(taskId: string): string {
  return `/workspace/${encodeURIComponent(taskId)}`;
}

/** A route segment as the id it names: decoded once, kept as-is when it is not valid encoding. */
export function routeParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] ?? '' : value ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
