/**
 * What the Documents list, the viewer and a workspace show about a document: its
 * name, how to show its file, its linked tasks by title (never a raw id), and a
 * backend that leaves the newer fields out reads as "unknown", never a crash.
 */
import { describe, expect, it } from "vitest";
import {
  FILE_NOT_KEPT_NOTE,
  canEmbedPdf,
  UNTITLED_DOCUMENT,
  chunkCountLabel,
  chunksOf,
  documentHref,
  documentKind,
  documentTitle,
  documentTypeLabel,
  downloadName,
  findDocument,
  formatDocumentDate,
  isFileNotKept,
  linkedDocumentsOf,
  linkedTasksLabel,
  linkedTasksOf,
  normalizeDocument,
  normalizeDocuments,
  routeParam,
  shouldTryFile,
  titledTasks,
  viewableBlob,
  workspaceHref,
} from "@/lib/documents";
import type { IngestionDocument } from "@/lib/types";

const row = (over: Partial<IngestionDocument> = {}): IngestionDocument => ({
  id: "row-1",
  user_id: "demo",
  source_id: "ingestion_abc",
  file_name: "ml-quiz-notes.pdf",
  media_type: "pdf",
  document_topics: ["gradient descent"],
  chunk_count: 6,
  created_at: "2026-11-15T04:47:30.260392+00:00",
  linked_task_ids: [],
  ...over,
});

describe("documentTitle", () => {
  it("is the file's own name", () => {
    expect(documentTitle({ file_name: "notes.pdf", document_topics: ["a"] })).toBe("notes.pdf");
  });

  it("falls back to the first two topics, then to 'Untitled document'", () => {
    expect(documentTitle({ file_name: null, document_topics: ["SVMs", "kernels", "margins"] })).toBe(
      "SVMs · kernels",
    );
    expect(documentTitle({ file_name: "  ", document_topics: [] })).toBe(UNTITLED_DOCUMENT);
    expect(documentTitle({ file_name: null, document_topics: null })).toBe(UNTITLED_DOCUMENT);
    expect(documentTitle({})).toBe(UNTITLED_DOCUMENT);
  });
});

describe("documentKind", () => {
  it("reads the served content type first", () => {
    expect(documentKind("png", "application/pdf")).toBe("pdf");
    expect(documentKind(null, "image/jpeg")).toBe("image");
    expect(documentKind(null, "application/pdf; charset=binary")).toBe("pdf");
  });

  it("falls back to the stored media type when the served type says nothing", () => {
    expect(documentKind("pdf", "application/octet-stream")).toBe("pdf");
    expect(documentKind("pdf", "")).toBe("pdf");
    expect(documentKind("png")).toBe("image");
    expect(documentKind("jpeg")).toBe("image");
    expect(documentKind("image")).toBe("image");
    expect(documentKind("PDF")).toBe("pdf");
  });

  it("is 'other' when neither names a PDF or an image", () => {
    expect(documentKind(null, null)).toBe("other");
    expect(documentKind("docx", "application/octet-stream")).toBe("other");
  });
});

describe("documentTypeLabel", () => {
  it("names the type in the badge", () => {
    expect(documentTypeLabel("pdf")).toBe("PDF");
    expect(documentTypeLabel("image/png")).toBe("PNG");
    expect(documentTypeLabel("jpg")).toBe("JPEG");
    expect(documentTypeLabel("image")).toBe("IMAGE");
  });

  it("is null when the type is unknown", () => {
    expect(documentTypeLabel(null)).toBeNull();
    expect(documentTypeLabel("")).toBeNull();
  });
});

describe("viewableBlob", () => {
  it("keeps a blob whose type the browser can show", () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    expect(viewableBlob(blob, "png")).toBe(blob);
  });

  it("gives an untyped blob the type the upload recorded, so a PDF opens instead of downloading", () => {
    const blob = new Blob(["%PDF"], { type: "application/octet-stream" });
    expect(viewableBlob(blob, "pdf").type).toBe("application/pdf");
    expect(viewableBlob(new Blob(["x"]), "jpeg").type).toBe("image/jpeg");
  });

  it("leaves it alone when the upload's type names no single format", () => {
    const blob = new Blob(["x"]);
    expect(viewableBlob(blob, "image")).toBe(blob);
    expect(viewableBlob(blob, null)).toBe(blob);
  });
});

describe("downloadName", () => {
  it("is the file's own name, else 'document' with the type's extension", () => {
    expect(downloadName({ file_name: "notes.pdf", media_type: "pdf" })).toBe("notes.pdf");
    expect(downloadName({ file_name: null, media_type: "pdf" })).toBe("document.pdf");
    expect(downloadName({ file_name: " ", media_type: "jpeg" })).toBe("document.jpg");
    expect(downloadName({ file_name: null, media_type: "image" })).toBe("document");
    expect(downloadName({})).toBe("document");
  });
});

describe("canEmbedPdf", () => {
  it("embeds unless the browser says it has no PDF viewer", () => {
    expect(canEmbedPdf({ pdfViewerEnabled: true })).toBe(true);
    expect(canEmbedPdf({})).toBe(true);
    expect(canEmbedPdf(undefined)).toBe(true);
    expect(canEmbedPdf({ pdfViewerEnabled: false })).toBe(false);
  });
});

describe("chunkCountLabel and formatDocumentDate", () => {
  it("counts chunks in words", () => {
    expect(chunkCountLabel(1)).toBe("1 chunk");
    expect(chunkCountLabel(6)).toBe("6 chunks");
    expect(chunkCountLabel(0)).toBe("0 chunks");
    expect(chunkCountLabel(undefined)).toBeNull();
    expect(chunkCountLabel(Number.NaN)).toBeNull();
  });

  it("dates read as words, and an unreadable date as nothing — never 'Invalid Date'", () => {
    expect(formatDocumentDate("2026-11-15T12:00:00Z")).toBe("Nov 15, 2026");
    expect(formatDocumentDate("not a date")).toBeNull();
    expect(formatDocumentDate("")).toBeNull();
    expect(formatDocumentDate(null)).toBeNull();
  });
});

describe("linkedTasksOf", () => {
  it("uses the titled links when the backend sends them, once per task", () => {
    expect(
      linkedTasksOf({
        linked_tasks: [
          { task_id: "t-1", title: "Revise SVMs" },
          { task_id: "t-1", title: "Revise SVMs" },
          { task_id: "t-2", title: "  " },
          { task_id: "", title: "no id" },
          null,
        ],
        linked_task_ids: ["t-1", "t-2", "t-3"],
      }),
    ).toEqual([
      { task_id: "t-1", title: "Revise SVMs" },
      { task_id: "t-2", title: null },
    ]);
  });

  it("falls back to bare ids with no title on an older backend", () => {
    expect(linkedTasksOf({ linked_task_ids: ["t-1", "t-2"] })).toEqual([
      { task_id: "t-1", title: null },
      { task_id: "t-2", title: null },
    ]);
    expect(linkedTasksOf({})).toEqual([]);
  });

  it("labels the count and chips only titled tasks, up to the limit", () => {
    expect(linkedTasksLabel(0)).toBeNull();
    expect(linkedTasksLabel(1)).toBe("Linked to 1 task");
    expect(linkedTasksLabel(3)).toBe("Linked to 3 tasks");
    const tasks = [
      { task_id: "a", title: "A" },
      { task_id: "b", title: null },
      { task_id: "c", title: "C" },
      { task_id: "d", title: "D" },
    ];
    expect(titledTasks(tasks, 2)).toEqual([
      { task_id: "a", title: "A" },
      { task_id: "c", title: "C" },
    ]);
    expect(titledTasks(tasks)).toHaveLength(3);
  });
});

describe("normalizeDocument", () => {
  it("keeps a full row as it is, with the new fields", () => {
    const full = row({
      has_file: true,
      linked_tasks: [{ task_id: "t-1", title: "Revise SVMs" }],
      linked_task_ids: ["t-1"],
    });
    expect(normalizeDocument(full)).toEqual(full);
  });

  it("fills what an older backend leaves out, and does not invent has_file", () => {
    const doc = normalizeDocument({ source_id: "s-1", document_topics: null, chunk_count: null });
    expect(doc).toMatchObject({
      id: "s-1",
      source_id: "s-1",
      file_name: null,
      media_type: null,
      document_topics: [],
      chunk_count: 0,
      created_at: "",
      linked_task_ids: [],
    });
    expect(doc && "has_file" in doc).toBe(false);
    expect(doc && "linked_tasks" in doc).toBe(false);
  });

  it("drops a row with no source id, and a body with no list is no documents", () => {
    expect(normalizeDocument({ file_name: "x.pdf" })).toBeNull();
    expect(normalizeDocument(null)).toBeNull();
    expect(normalizeDocuments({ documents: [{ source_id: "a" }, { nope: 1 }, "x"] }).map((d) => d.source_id)).toEqual([
      "a",
    ]);
    expect(normalizeDocuments({})).toEqual([]);
    expect(normalizeDocuments(null)).toEqual([]);
  });

  it("a linked task with a blank title keeps its id but shows no name", () => {
    const doc = normalizeDocument(row({ linked_tasks: [{ task_id: "t-1", title: "" }] }));
    expect(linkedTasksOf(doc!)).toEqual([{ task_id: "t-1", title: null }]);
  });
});

describe("findDocument and chunksOf", () => {
  it("finds one document in the list by its source id", () => {
    const docs = [row({ source_id: "a" }), row({ source_id: "b", file_name: "b.png" })];
    expect(findDocument(docs, "b")?.file_name).toBe("b.png");
    expect(findDocument(docs, "missing")).toBeNull();
  });

  it("keeps the non-blank text chunks", () => {
    expect(chunksOf({ source_id: "a", chunks: ["one", " ", 2, "two"], count: 4 })).toEqual(["one", "two"]);
    expect(chunksOf({})).toEqual([]);
    expect(chunksOf(null)).toEqual([]);
  });
});

describe("the original file", () => {
  it("is asked for unless the backend says it was not kept", () => {
    expect(shouldTryFile({ has_file: true })).toBe(true);
    expect(shouldTryFile({})).toBe(true);
    expect(shouldTryFile({ has_file: false })).toBe(false);
  });

  it("a 404 means it was not kept; any other failure is an outage", () => {
    expect(isFileNotKept({ status: 404 })).toBe(true);
    expect(isFileNotKept({ status: 503 })).toBe(false);
    expect(isFileNotKept(new Error("network"))).toBe(false);
    expect(isFileNotKept(null)).toBe(false);
  });

  it("the not-kept note says what to do", () => {
    expect(FILE_NOT_KEPT_NOTE).toMatch(/re-upload/);
  });
});

describe("linkedDocumentsOf", () => {
  it("lists each linked document once, titled by the same rule", () => {
    expect(
      linkedDocumentsOf({
        linked_documents: [
          { source_id: "a", file_name: "notes.pdf", has_file: true },
          { source_id: "a", file_name: "notes.pdf", has_file: true },
          { source_id: "b", file_name: null, has_file: false },
          { source_id: "", file_name: "x", has_file: true },
        ],
      }),
    ).toEqual([
      { source_id: "a", file_name: "notes.pdf", has_file: true, title: "notes.pdf" },
      { source_id: "b", file_name: null, has_file: false, title: UNTITLED_DOCUMENT },
    ]);
  });

  it("is empty when the workspace sends none, or none at all", () => {
    expect(linkedDocumentsOf({ linked_documents: [] })).toEqual([]);
    expect(linkedDocumentsOf({})).toEqual([]);
    expect(linkedDocumentsOf(null)).toEqual([]);
    expect(linkedDocumentsOf({ linked_documents: "nope" as never })).toEqual([]);
  });

  it("reads a missing has_file as no file", () => {
    expect(
      linkedDocumentsOf({ linked_documents: [{ source_id: "a" } as never] })[0],
    ).toMatchObject({ has_file: false, file_name: null, title: UNTITLED_DOCUMENT });
  });
});

describe("routes", () => {
  it("encodes ids into the address and decodes them back", () => {
    expect(documentHref("ingestion_abc")).toBe("/documents/ingestion_abc");
    expect(documentHref("a b/c")).toBe("/documents/a%20b%2Fc");
    expect(workspaceHref("t 1")).toBe("/workspace/t%201");
    expect(routeParam("a%20b%2Fc")).toBe("a b/c");
    expect(routeParam(["x%20y"])).toBe("x y");
    expect(routeParam("100%")).toBe("100%");
    expect(routeParam(undefined)).toBe("");
  });
});
