"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { listDocuments, deleteDocument, processDocument } from "@/lib/api";
import type { IngestionDocument } from "@/lib/api";
import {
  chunkCountLabel,
  documentHref,
  documentKind,
  documentTitle,
  documentTypeLabel,
  formatDocumentDate,
  linkedTasksLabel,
  linkedTasksOf,
  titledTasks,
} from "@/lib/documents";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { toListState } from "@/lib/learning";
import { errorMessageOf } from "@/lib/you";
import {
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
  X,
  AlertTriangle,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// Accepted file types
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpeg",
};

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(",");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix to get raw base64
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** One document in the list: a link to its viewer, with what it is and the tasks it feeds. */
function DocumentRow({ doc, onDelete }: { doc: IngestionDocument; onDelete: () => void }) {
  const title = documentTitle(doc);
  const type = documentTypeLabel(doc.media_type);
  const facts = [chunkCountLabel(doc.chunk_count), formatDocumentDate(doc.created_at)].filter(
    (f): f is string => Boolean(f),
  );
  const tasks = linkedTasksOf(doc);
  const linkedLabel = linkedTasksLabel(tasks.length);
  const chips = titledTasks(tasks, 2);

  return (
    <Card className="group flex items-center transition-colors hover:border-border-strong">
      <Link
        href={documentHref(doc.source_id)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-card py-3 pl-4 pr-2 focus-visible:outline-offset-[-2px]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
          {documentKind(doc.media_type) === "image" ? (
            <ImageIcon size={18} className="text-dusk" />
          ) : (
            <FileText size={18} className="text-terra" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-primary">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted">
            {type && <Badge color="ink">{type}</Badge>}
            {facts.map((fact, i) => (
              <span key={fact} className="flex items-center gap-1.5 whitespace-nowrap">
                {(i > 0 || type) && <span aria-hidden="true">&middot;</span>}
                {fact}
              </span>
            ))}
          </div>
          {linkedLabel && (
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <ListChecks size={12} className="text-dusk" />
                {linkedLabel}
              </span>
              {chips.map((task) => (
                <span
                  key={task.task_id}
                  className="max-w-full truncate rounded-pill bg-surface-muted px-2 py-0.5 font-medium text-secondary sm:max-w-[16rem]"
                >
                  {task.title}
                </span>
              ))}
            </div>
          )}
        </div>

        <ChevronRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 max-sm:hidden"
        />
      </Link>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${title}`}
        title="Delete document"
        className="mr-2 flex shrink-0 items-center justify-center rounded-button p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 max-md:h-10 max-md:w-10"
      >
        <Trash2 size={16} />
      </button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteDialog({
  fileName,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="mx-4 max-w-sm w-full px-6 py-5 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-terra" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-primary">Delete document?</h3>
            <p className="mt-1 text-xs text-secondary">
              This will permanently remove <strong>{fileName}</strong> and all its chunks.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-red-500 hover:bg-red-600"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  // undefined until the first fetch answers.
  const [documents, setDocuments] = useState<IngestionDocument[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IngestionDocument | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Fetch documents ----
  const fetchDocs = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      setLoadError(null);
    } catch (err) {
      // An outage (5xx) is never "no documents": show ErrorState with Retry.
      setLoadError(err);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const retryDocs = useCallback(() => {
    setLoadError(null);
    setDocuments(undefined);
    fetchDocs();
  }, [fetchDocs]);

  const docList = toListState({ items: documents, error: loadError });

  // ---- Upload handler ----
  async function handleUpload(file: File) {
    const mediaType = ACCEPTED_TYPES[file.type];
    if (!mediaType) {
      setError("Unsupported file type. Please upload a PDF, PNG, or JPEG.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      await processDocument(base64, mediaType, file.name);
      await fetchDocs();
    } catch (err) {
      // The backend's reason in words when it gave one (a file over the limit: 422 or 413).
      setError(errorMessageOf(err, err instanceof Error ? err.message : "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  // ---- Drag and drop ----
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  // ---- Delete handler ----
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.source_id);
      setDeleteTarget(null);
      await fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleteTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary">Documents</h1>
        <p className="mt-1 text-sm text-secondary">
          Upload PDFs or images for Jarvis to process and reference during study sessions.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={clsx(
          "relative flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed px-6 py-10 transition-all",
          dragActive
            ? "border-terra bg-terra/5"
            : "border-border hover:border-terra/50 hover:bg-surface-subtle",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <>
            <Loader2 size={32} className="animate-spin text-terra" />
            <p className="text-sm font-medium text-primary">Processing document...</p>
            <p className="text-xs text-muted">This may take a moment</p>
          </>
        ) : (
          <>
            <Upload
              size={32}
              className={clsx(
                "transition-colors",
                dragActive ? "text-terra" : "text-muted",
              )}
            />
            <p className="text-sm font-medium text-primary">
              {dragActive ? "Drop file here" : "Drag and drop a file, or click to browse"}
            </p>
            <p className="text-xs text-muted">PDF, PNG, or JPEG</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-button bg-red-500/10 px-4 py-2.5">
          <AlertTriangle size={14} className="shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Loading */}
      {docList.kind === "loading" && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-card bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Outage */}
      {docList.kind === "error" && (
        <Card className="px-6 py-12">
          <ErrorState message={docList.message} onRetry={retryDocs} />
        </Card>
      )}

      {/* Empty state */}
      {docList.kind === "empty" && (
        <Card className="px-6 py-12">
          <EmptyState
            icon="📄"
            headline="No documents yet"
            subtitle="Upload a PDF or image to get started. Jarvis will process and chunk it for reference during your study sessions."
          />
        </Card>
      )}

      {/* Document list */}
      {docList.kind === "ready" && (
        <ul className="space-y-2">
          {docList.items.map((doc) => (
            <li key={doc.source_id}>
              <DocumentRow doc={doc} onDelete={() => setDeleteTarget(doc)} />
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteDialog
          fileName={documentTitle(deleteTarget)}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
