"use client";

export const runtime = "edge";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Info,
  ListChecks,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { getDocument, getDocumentChunks, getDocumentFile } from "@/lib/api";
import type { IngestionDocument } from "@/lib/types";
import {
  FILE_NOT_KEPT_NOTE,
  canEmbedPdf,
  chunkCountLabel,
  documentKind,
  documentTitle,
  documentTypeLabel,
  downloadName,
  formatDocumentDate,
  isFileNotKept,
  linkedTasksLabel,
  linkedTasksOf,
  routeParam,
  shouldTryFile,
  titledTasks,
  viewableBlob,
  workspaceHref,
  type DocumentKind,
} from "@/lib/documents";
import { describeError } from "@/lib/learning";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type MetaState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "missing" }
  | { status: "ready"; doc: IngestionDocument };

type FileState =
  | { status: "loading" }
  | { status: "ready"; url: string; kind: DocumentKind }
  | { status: "not-kept" }
  | { status: "error"; error: unknown };

type TextState =
  | { status: "loading" }
  | { status: "ready"; chunks: string[] }
  | { status: "error"; error: unknown };

type Tab = "file" | "text";

/** The outage block, with the backend's words as detail when it gave any. */
function Outage({ error, onRetry, className }: { error: unknown; onRetry: () => void; className?: string }) {
  const { headline, detail } = describeError(error);
  return (
    <Card className={clsx("flex items-center justify-center px-6 py-12", className)}>
      <ErrorState headline={headline} message={detail} onRetry={onRetry} />
    </Card>
  );
}

/** A quiet toolbar link: icon and words, the icon alone on a phone. */
const actionClass =
  "inline-flex items-center justify-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-medium text-terra transition-colors hover:bg-surface-muted max-sm:h-10 max-sm:w-10 max-sm:px-0";

const backLinkClass =
  "inline-flex items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-primary max-md:-ml-2 max-md:min-h-10 max-md:px-2";

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function DocumentHeader({ doc }: { doc: IngestionDocument }) {
  const title = documentTitle(doc);
  const isImage = documentKind(doc.media_type) === "image";
  const type = documentTypeLabel(doc.media_type);
  const facts = [chunkCountLabel(doc.chunk_count), formatDocumentDate(doc.created_at)].filter(
    (f): f is string => Boolean(f),
  );
  const tasks = linkedTasksOf(doc);
  // An older backend sends only ids: those are counted, never shown as names.
  const titled = titledTasks(tasks);
  const untitled = tasks.length - titled.length;

  return (
    <header className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
          {isImage ? <ImageIcon size={18} className="text-dusk" /> : <FileText size={18} className="text-terra" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-primary [overflow-wrap:anywhere]">{title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {type && <Badge color="ink">{type}</Badge>}
            {facts.map((fact, i) => (
              <span key={fact} className="flex items-center gap-2 whitespace-nowrap">
                {(i > 0 || type) && <span aria-hidden="true">&middot;</span>}
                {fact}
              </span>
            ))}
          </div>
        </div>
      </div>

      {doc.document_topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Topics">
          {doc.document_topics.map((topic) => (
            <Badge key={topic} color="sage" className="max-w-full truncate">
              {topic}
            </Badge>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs text-muted">
            {titled.length > 0 ? "Linked to" : linkedTasksLabel(tasks.length)}
          </span>
          {titled.map((task) => (
            <Link
              key={task.task_id}
              href={workspaceHref(task.task_id)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-border bg-surface-card px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-border-strong hover:bg-surface-subtle max-md:min-h-9"
            >
              <ListChecks size={12} className="shrink-0 text-dusk" />
              <span className="truncate">{task.title}</span>
            </Link>
          ))}
          {titled.length > 0 && untitled > 0 && (
            <span className="text-xs text-muted">
              and {untitled} more
            </span>
          )}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// The original file
// ---------------------------------------------------------------------------

/** A tall area the file fills: most of the viewport on a phone, the rest of the column on desktop. */
const frameClass =
  "flex min-h-[max(360px,60dvh)] flex-1 flex-col overflow-hidden rounded-card border border-border md:min-h-[480px]";

function FileBody({
  file,
  title,
  pdfInline,
  onRetry,
  onShowText,
}: {
  file: FileState;
  title: string;
  pdfInline: boolean;
  onRetry: () => void;
  onShowText: () => void;
}) {
  if (file.status === "loading") {
    return (
      <div className={clsx(frameClass, "items-center justify-center gap-3 bg-surface-subtle")} role="status">
        <Loader2 size={24} className="animate-spin text-terra" />
        <p className="text-sm text-secondary">Opening the file…</p>
      </div>
    );
  }
  if (file.status === "error") return <Outage error={file.error} onRetry={onRetry} className="flex-1" />;
  if (file.status !== "ready") return null;

  if (file.kind === "image") {
    // The image is fitted inside the frame, whatever its shape.
    return (
      <div className={clsx(frameClass, "relative bg-surface-subtle")}>
        {/* A blob URL: next/image cannot optimise it, and it needs no optimising. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.url} alt={title} className="absolute inset-0 h-full w-full object-contain p-2 sm:p-4" />
      </div>
    );
  }

  if (file.kind === "pdf" && !pdfInline) {
    // No built-in PDF viewer here (Chrome on Android): an iframe would only download it.
    return (
      <div className={clsx(frameClass, "items-center justify-center gap-4 bg-surface-subtle px-6 text-center")}>
        <FileText size={36} className="text-terra" />
        <p className="max-w-xs text-sm text-secondary">This browser can&apos;t show a PDF inside the page.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={file.url}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-button bg-terra px-4 py-2 text-sm font-medium text-white transition-all hover:bg-terra/90"
          >
            <ExternalLink size={14} />
            Open PDF
          </a>
          <Button variant="secondary" onClick={onShowText} className="max-md:min-h-10">
            Read the extracted text
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(frameClass, "bg-surface-card")}>
      {/* #navpanes=0: Chrome's viewer opens without its thumbnail sidebar, so the page fits the width. */}
      <iframe src={`${file.url}#navpanes=0`} title={title} className="block h-full w-full flex-1 border-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The extracted text
// ---------------------------------------------------------------------------

function TextBody({ text, onRetry }: { text: TextState; onRetry: () => void }) {
  if (text.status === "loading") {
    return (
      <div className="space-y-2" role="status" aria-label="Loading the extracted text">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface-muted" />
        ))}
      </div>
    );
  }
  if (text.status === "error") return <Outage error={text.error} onRetry={onRetry} />;
  if (text.chunks.length === 0) {
    return (
      <Card className="px-5 py-8 text-center">
        <p className="text-sm text-muted">Jarvis didn&apos;t keep any text from this document.</p>
      </Card>
    );
  }
  return (
    <ol className="space-y-2">
      {text.chunks.map((chunk, i) => (
        <li key={i}>
          <Card className="px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Chunk {i + 1} of {text.chunks.length}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-primary [overflow-wrap:anywhere]">
              {chunk}
            </p>
          </Card>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Viewer page
// ---------------------------------------------------------------------------

export default function DocumentViewerPage() {
  const params = useParams();
  const sourceId = routeParam(params.sourceId);

  const [meta, setMeta] = useState<MetaState>({ status: "loading" });
  const [metaAttempt, setMetaAttempt] = useState(0);
  const [file, setFile] = useState<FileState>({ status: "loading" });
  const [fileAttempt, setFileAttempt] = useState(0);
  const [text, setText] = useState<TextState>({ status: "loading" });
  const [textAttempt, setTextAttempt] = useState(0);
  const textLoaded = useRef<string | null>(null);
  const [tab, setTab] = useState<Tab>("file");
  const [pdfInline, setPdfInline] = useState(true);

  useEffect(() => {
    setPdfInline(canEmbedPdf(navigator));
  }, []);

  // ---- The document's details ----
  useEffect(() => {
    const controller = new AbortController();
    setMeta({ status: "loading" });
    getDocument(sourceId, { signal: controller.signal })
      .then((doc) => {
        if (!controller.signal.aborted) setMeta(doc ? { status: "ready", doc } : { status: "missing" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMeta({ status: "error", error });
      });
    return () => controller.abort();
  }, [sourceId, metaAttempt]);

  const doc = meta.status === "ready" ? meta.doc : null;
  const wantFile = doc !== null && shouldTryFile(doc);
  const mediaType = doc?.media_type ?? null;

  // ---- The original file, as a blob URL revoked when it is replaced or the page closes ----
  useEffect(() => {
    if (!wantFile) return;
    const controller = new AbortController();
    let url: string | null = null;
    setFile({ status: "loading" });
    getDocumentFile(sourceId, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        const viewable = viewableBlob(blob, mediaType);
        url = URL.createObjectURL(viewable);
        setFile({ status: "ready", url, kind: documentKind(mediaType, viewable.type) });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFile(isFileNotKept(error) ? { status: "not-kept" } : { status: "error", error });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [sourceId, wantFile, mediaType, fileAttempt]);

  const hasFile = wantFile && file.status !== "not-kept";
  const shown: Tab = hasFile ? tab : "text";
  const needText = doc !== null && shown === "text";

  // ---- The extracted text, fetched the first time it is shown ----
  useEffect(() => {
    if (!needText || textLoaded.current === sourceId) return;
    const controller = new AbortController();
    setText({ status: "loading" });
    getDocumentChunks(sourceId, { signal: controller.signal })
      .then(({ chunks }) => {
        if (controller.signal.aborted) return;
        textLoaded.current = sourceId;
        setText({ status: "ready", chunks });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setText({ status: "error", error });
      });
    return () => controller.abort();
  }, [needText, sourceId, textAttempt]);

  // ---- Before the details are in ----
  if (meta.status !== "ready") {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
        <Link href="/documents" className={backLinkClass}>
          <ArrowLeft size={14} />
          Documents
        </Link>
        {meta.status === "loading" && (
          <div className="space-y-4" role="status" aria-label="Loading the document">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-muted" />
              <div className="h-6 w-56 max-w-full animate-pulse rounded-lg bg-surface-muted" />
            </div>
            <div className="h-[60dvh] animate-pulse rounded-card bg-surface-muted" />
          </div>
        )}
        {meta.status === "error" && (
          <Outage error={meta.error} onRetry={() => setMetaAttempt((n) => n + 1)} />
        )}
        {meta.status === "missing" && (
          <Card className="px-6 py-12">
            <EmptyState
              icon="📄"
              headline="This document isn't here"
              subtitle="It may have been deleted, or the link is out of date."
            />
            <div className="mt-6 flex justify-center">
              <Link
                href="/documents"
                className="inline-flex items-center justify-center rounded-button bg-surface-muted px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-surface-muted/80 max-md:min-h-10"
              >
                Back to Documents
              </Link>
            </div>
          </Card>
        )}
      </div>
    );
  }

  const title = documentTitle(meta.doc);

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8">
      <div className="space-y-2">
        <Link href="/documents" className={backLinkClass}>
          <ArrowLeft size={14} />
          Documents
        </Link>
        <DocumentHeader doc={meta.doc} />
      </div>

      {hasFile ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Show" className="flex gap-1 rounded-button bg-surface-muted p-0.5">
            {(
              [
                ["file", "Original"],
                ["text", "Extracted text"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={shown === value}
                onClick={() => setTab(value)}
                className={clsx(
                  "rounded-button px-3 py-1.5 text-xs font-medium transition-colors max-md:min-h-10",
                  shown === value
                    ? "bg-terra text-white"
                    : "cursor-pointer text-secondary hover:bg-surface-subtle hover:text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {shown === "file" && file.status === "ready" && (
            <div className="flex items-center gap-1">
              <a href={file.url} target="_blank" rel="noopener" title="Open in new tab" className={actionClass}>
                <ExternalLink size={14} className="shrink-0" />
                <span className="max-sm:sr-only">Open in new tab</span>
              </a>
              <a href={file.url} download={downloadName(meta.doc)} title="Download" className={actionClass}>
                <Download size={14} className="shrink-0" />
                <span className="max-sm:sr-only">Download</span>
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-start gap-2 text-xs text-muted">
          <Info size={14} className="mt-px shrink-0" />
          {FILE_NOT_KEPT_NOTE}
        </p>
      )}

      {shown === "file" ? (
        <FileBody
          file={file}
          title={title}
          pdfInline={pdfInline}
          onRetry={() => setFileAttempt((n) => n + 1)}
          onShowText={() => setTab("text")}
        />
      ) : (
        <section aria-label="Extracted text" className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">
              What Jarvis read from this
            </h2>
            <p className="mt-1 text-xs text-muted">
              The text Jarvis took from the file and uses when it plans and answers.
            </p>
          </div>
          <TextBody text={text} onRetry={() => setTextAttempt((n) => n + 1)} />
        </section>
      )}
    </div>
  );
}
