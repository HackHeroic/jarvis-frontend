"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { listDocuments, deleteDocument, processDocument } from "@/lib/api";
import type { IngestionDocument } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/app/EmptyState";
import {
  Upload,
  Trash2,
  FileText,
  Image,
  Loader2,
  X,
  AlertTriangle,
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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
  const [documents, setDocuments] = useState<IngestionDocument[]>([]);
  const [loading, setLoading] = useState(true);
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
      setError(null);
    } catch {
      // Backend unavailable — show empty state, not error
      setDocuments([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

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
      await processDocument(base64, mediaType);
      await fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
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
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-card bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && documents.length === 0 && (
        <Card className="px-6 py-12">
          <EmptyState
            icon="📄"
            headline="No documents yet"
            subtitle="Upload a PDF or image to get started. Jarvis will process and chunk it for reference during your study sessions."
          />
        </Card>
      )}

      {/* Document list */}
      {!loading && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex items-center gap-3 px-4 py-3">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
                {doc.media_type?.includes("image") ? (
                  <Image size={18} className="text-dusk" />
                ) : (
                  <FileText size={18} className="text-terra" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {doc.file_name || `Document ${doc.source_id.slice(0, 8)}`}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {doc.media_type && (
                    <Badge color="ink">{doc.media_type.split("/").pop()?.toUpperCase()}</Badge>
                  )}
                  {doc.document_topics.slice(0, 3).map((topic, i) => (
                    <Badge key={i} color="sage">{topic}</Badge>
                  ))}
                  <span className="text-[10px] text-muted">
                    {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""} &middot; {formatDate(doc.created_at)}
                  </span>
                </div>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setDeleteTarget(doc)}
                className="shrink-0 rounded-button p-2 text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                title="Delete document"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteDialog
          fileName={deleteTarget.file_name || `Document ${deleteTarget.source_id.slice(0, 8)}`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
