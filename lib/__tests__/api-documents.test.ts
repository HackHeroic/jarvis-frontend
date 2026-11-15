/**
 * The document reads over a stubbed fetch: the right route with the user, an
 * abort signal passed through, a missing field normalised, and a failure an
 * `ApiError` with its status — a 404 file (not kept) told apart from an outage.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  getDocument,
  getDocumentChunks,
  getDocumentFile,
  listDocuments,
} from "@/lib/api";
import { API_BASE, USER_ID } from "@/lib/constants";
import { errorMessageOf } from "@/lib/you";

interface Call {
  url: string;
  signal: AbortSignal | null | undefined;
}

let calls: Call[] = [];

function respondWith(make: () => Response) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), signal: init?.signal });
      return make();
    }),
  );
}

const json = (status: number, body: unknown) => () =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const envelope = (code: string, message: string) => ({
  error: { code, message, details: null, request_id: "req-1" },
});

const user = `user_id=${encodeURIComponent(USER_ID)}`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listDocuments", () => {
  it("normalises each row, keeping the new fields when sent", async () => {
    respondWith(
      json(200, {
        documents: [
          {
            source_id: "s-1",
            id: "r-1",
            file_name: "notes.pdf",
            media_type: "pdf",
            document_topics: ["svm"],
            chunk_count: 3,
            created_at: "2026-11-15T00:00:00Z",
            linked_task_ids: ["t-1"],
            has_file: true,
            linked_tasks: [{ task_id: "t-1", title: "Revise SVMs" }],
          },
          { source_id: "s-2", document_topics: null },
        ],
      }),
    );
    const docs = await listDocuments();
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/documents/?${user}`);
    expect(docs[0]).toMatchObject({ has_file: true, linked_tasks: [{ task_id: "t-1", title: "Revise SVMs" }] });
    expect(docs[1]).toMatchObject({ source_id: "s-2", document_topics: [], linked_task_ids: [] });
  });

  it("an outage throws, never reads as no documents", async () => {
    respondWith(json(503, envelope("persistence_unavailable", "Could not load your documents.")));
    const err = await listDocuments().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessageOf(err, "fallback")).toBe("Could not load your documents.");
  });
});

describe("getDocument", () => {
  it("is the list filtered to one source id, with the signal passed through", async () => {
    respondWith(json(200, { documents: [{ source_id: "a" }, { source_id: "b", file_name: "b.png" }] }));
    const controller = new AbortController();
    const doc = await getDocument("b", { signal: controller.signal });
    expect(doc?.file_name).toBe("b.png");
    expect(calls[0].signal).toBe(controller.signal);
  });

  it("is null when the document is not in the list", async () => {
    respondWith(json(200, { documents: [{ source_id: "a" }] }));
    expect(await getDocument("gone")).toBeNull();
  });
});

describe("getDocumentFile", () => {
  it("GETs /documents/{id}/file for the user and hands back the bytes with their type", async () => {
    respondWith(
      () => new Response(new Uint8Array([37, 80, 68, 70]), { status: 200, headers: { "Content-Type": "application/pdf" } }),
    );
    const blob = await getDocumentFile("src 1");
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/documents/src%201/file?${user}`);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(4);
    expect(await blob.text()).toBe("%PDF");
  });

  it("a 404 (file not kept) is an ApiError with status 404", async () => {
    respondWith(json(404, envelope("not_found", "The original file was not kept.")));
    const err = await getDocumentFile("s-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).code).toBe("not_found");
  });

  it("an outage is an ApiError carrying the backend's words", async () => {
    respondWith(json(503, envelope("persistence_unavailable", "Could not reach file storage.")));
    const err = await getDocumentFile("s-1").catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(503);
    expect(errorMessageOf(err, "fallback")).toBe("Could not reach file storage.");
  });

  it("passes the abort signal through", async () => {
    respondWith(() => new Response("x", { status: 200 }));
    const controller = new AbortController();
    await getDocumentFile("s-1", { signal: controller.signal });
    expect(calls[0].signal).toBe(controller.signal);
  });
});

describe("getDocumentChunks", () => {
  it("GETs /documents/{id}/chunks and keeps the non-blank chunks", async () => {
    respondWith(json(200, { source_id: "s-1", chunks: ["First part.", "", "Second part."], count: 3 }));
    const res = await getDocumentChunks("s-1");
    expect(calls[0].url).toBe(`${API_BASE}/api/v1/documents/s-1/chunks?${user}`);
    expect(res).toEqual({ source_id: "s-1", chunks: ["First part.", "Second part."], count: 2 });
  });

  it("a body with no chunks is no text, not a crash", async () => {
    respondWith(json(200, { source_id: "s-1" }));
    expect((await getDocumentChunks("s-1")).chunks).toEqual([]);
  });

  it("an outage is an ApiError", async () => {
    respondWith(json(503, envelope("persistence_unavailable", "Could not load the document's chunks.")));
    const err = await getDocumentChunks("s-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessageOf(err, "fallback")).toBe("Could not load the document's chunks.");
  });
});
