/**
 * What a task's workspace shows and where: each asset in its section in the order
 * sent, a quiz as data only when every part of it reads (else its markdown), an
 * excerpt's document, and a backend or cached workspace without the newer fields
 * read as "not there", never a crash.
 */
import { describe, expect, it } from "vitest";
import {
  excerptSource,
  groupAssets,
  isWebUrl,
  noticesOf,
  quizOf,
  revealedLabel,
} from "@/lib/workspace";
import type { StudyAsset } from "@/lib/types";

const asset = (asset_type: string, over: Partial<StudyAsset> = {}): StudyAsset => ({
  asset_type,
  title: `${asset_type} title`,
  content_or_url: asset_type.endsWith("_link") ? `https://example.com/${asset_type}` : `# ${asset_type}`,
  rationale: "Why it is here",
  ...over,
});

const QUIZ = {
  title: "Normalisation check",
  questions: [
    { question: "What is 2NF?", answer: "1NF with no partial dependency on a key.", hint: "Think about composite keys." },
    { question: "What is 3NF?", answer: "2NF with no transitive dependency.", hint: "" },
    { question: "When is BCNF stricter than 3NF?", answer: "When a non-key attribute determines part of a key.", hint: "" },
  ],
};

describe("groupAssets", () => {
  it("puts excerpts, practice and links in their sections, each in the order sent", () => {
    const sent = [
      asset("article_link", { title: "a1" }),
      asset("generated_quiz", { title: "q1" }),
      asset("pdf_chunk", { title: "e1" }),
      asset("youtube_link", { title: "y1" }),
      asset("generated_content", { title: "outline" }),
      asset("pdf_chunk", { title: "e2" }),
      asset("leetcode_link", { title: "l1" }),
      asset("codeforces_link", { title: "c1" }),
      asset("blog_link", { title: "b1" }),
    ];
    const groups = groupAssets(sent);
    expect(groups.fromDocuments.map((a) => a.title)).toEqual(["e1", "e2"]);
    expect(groups.practice.map((a) => a.title)).toEqual(["q1", "outline"]);
    expect(groups.links.map((a) => a.title)).toEqual(["a1", "y1", "l1", "c1", "b1"]);
  });

  it("keeps an asset's metadata", () => {
    const excerpt = asset("pdf_chunk", { metadata: { source_id: "ingestion_1", file_name: "notes.pdf" } });
    expect(groupAssets([excerpt]).fromDocuments[0].metadata).toEqual({
      source_id: "ingestion_1",
      file_name: "notes.pdf",
    });
  });

  it("drops a link that is not an http(s) address: it never reaches an href", () => {
    const groups = groupAssets([
      asset("article_link", { content_or_url: "javascript:alert(1)" }),
      asset("youtube_link", { content_or_url: "not a url" }),
      asset("blog_link", { content_or_url: "http://example.com/ok" }),
    ]);
    expect(groups.links.map((a) => a.content_or_url)).toEqual(["http://example.com/ok"]);
  });

  it("an unknown type is a link when it is a web address, otherwise practice: nothing is hidden", () => {
    const groups = groupAssets([
      asset("podcast_link", { content_or_url: "https://example.com/pod" }),
      asset("flashcards", { content_or_url: "Front | Back" }),
    ]);
    expect(groups.links.map((a) => a.asset_type)).toEqual(["podcast_link"]);
    expect(groups.practice.map((a) => a.asset_type)).toEqual(["flashcards"]);
  });

  it("skips rows it cannot show and reads no assets as three empty sections", () => {
    const groups = groupAssets([null, 7, { asset_type: "pdf_chunk" }, { asset_type: "pdf_chunk", content_or_url: "  " }]);
    expect(groups).toEqual({ fromDocuments: [], practice: [], links: [] });
    expect(groupAssets(undefined)).toEqual({ fromDocuments: [], practice: [], links: [] });
  });

  it("a missing title or rationale reads as empty text, and a non-object metadata is left out", () => {
    const [row] = groupAssets([{ asset_type: "pdf_chunk", content_or_url: "text", metadata: ["x"] }]).fromDocuments;
    expect(row).toEqual({ asset_type: "pdf_chunk", title: "", content_or_url: "text", rationale: "" });
  });
});

describe("quizOf", () => {
  it("reads a structured quiz from metadata.quiz", () => {
    const quiz = quizOf(asset("generated_quiz", { metadata: { quiz: QUIZ } }));
    expect(quiz?.title).toBe("Normalisation check");
    expect(quiz?.questions).toHaveLength(3);
    expect(quiz?.questions[0]).toEqual(QUIZ.questions[0]);
  });

  it("is null when there is no metadata.quiz (an older backend, a cached workspace)", () => {
    expect(quizOf(asset("generated_quiz"))).toBeNull();
    expect(quizOf(asset("generated_quiz", { metadata: {} }))).toBeNull();
    expect(quizOf(null)).toBeNull();
  });

  it("is null for a malformed metadata.quiz", () => {
    const of = (quiz: unknown) => quizOf(asset("generated_quiz", { metadata: { quiz } }));
    expect(of("a string")).toBeNull();
    expect(of([QUIZ])).toBeNull();
    expect(of({ title: "No questions" })).toBeNull();
    expect(of({ title: "Empty", questions: [] })).toBeNull();
    expect(of({ title: "Not a list", questions: "1. What?" })).toBeNull();
  });

  it("is null when any question cannot be read, so no question is ever left out", () => {
    const of = (bad: unknown) =>
      quizOf(asset("generated_quiz", { metadata: { quiz: { ...QUIZ, questions: [...QUIZ.questions, bad] } } }));
    expect(of({ question: "No answer?" })).toBeNull();
    expect(of({ question: "Blank answer?", answer: "   " })).toBeNull();
    expect(of({ question: "Hint is a number", answer: "x", hint: 3 })).toBeNull();
    expect(of(null)).toBeNull();
  });

  it("a missing or null hint reads as no hint", () => {
    const quiz = quizOf(
      asset("generated_quiz", {
        metadata: { quiz: { title: "T", questions: [{ question: "Q?", answer: "A" }, { question: "R?", answer: "B", hint: null }] } },
      }),
    );
    expect(quiz?.questions.map((q) => q.hint)).toEqual(["", ""]);
  });

  it("falls back to the asset's title when the quiz has none", () => {
    const quiz = quizOf(asset("generated_quiz", { title: "Quiz: DBMS", metadata: { quiz: { questions: QUIZ.questions } } }));
    expect(quiz?.title).toBe("Quiz: DBMS");
  });

  it("is null for an asset that is not a quiz", () => {
    expect(quizOf(asset("generated_content", { metadata: { quiz: QUIZ } }))).toBeNull();
  });
});

describe("revealedLabel", () => {
  it("counts the answers showing out of all", () => {
    expect(revealedLabel(0, 4)).toBe("0 of 4 revealed");
    expect(revealedLabel(3, 4)).toBe("3 of 4 revealed");
  });

  it("never reads more than the total or below zero", () => {
    expect(revealedLabel(9, 4)).toBe("4 of 4 revealed");
    expect(revealedLabel(-1, 4)).toBe("0 of 4 revealed");
  });
});

describe("excerptSource", () => {
  it("names the document an excerpt came from", () => {
    expect(excerptSource({ metadata: { source_id: " ingestion_9 ", file_name: "DBMS-Syllabus-CS304.pdf" } })).toEqual({
      sourceId: "ingestion_9",
      fileName: "DBMS-Syllabus-CS304.pdf",
    });
  });

  it("without a source id there is no document to open", () => {
    expect(excerptSource({ metadata: { file_name: "notes.pdf" } })).toBeNull();
    expect(excerptSource({})).toBeNull();
    expect(excerptSource({ metadata: { source_id: 42 } })).toBeNull();
  });

  it("a missing file name reads as null", () => {
    expect(excerptSource({ metadata: { source_id: "s" } })).toEqual({ sourceId: "s", fileName: null });
  });
});

describe("isWebUrl", () => {
  it("accepts http and https only", () => {
    expect(isWebUrl("https://leetcode.com/problems/x")).toBe(true);
    expect(isWebUrl("http://example.com")).toBe(true);
    expect(isWebUrl("ftp://example.com")).toBe(false);
    expect(isWebUrl("data:text/html,hi")).toBe(false);
    expect(isWebUrl("")).toBe(false);
    expect(isWebUrl(undefined)).toBe(false);
  });
});

describe("noticesOf", () => {
  it("lists each non-blank notice once", () => {
    expect(noticesOf({ notices: ["Web results are unavailable right now.", " ", "Web results are unavailable right now.", 3] })).toEqual([
      "Web results are unavailable right now.",
    ]);
  });

  it("none sent reads as none", () => {
    expect(noticesOf({})).toEqual([]);
    expect(noticesOf(null)).toEqual([]);
    expect(noticesOf({ notices: "one" })).toEqual([]);
  });
});
