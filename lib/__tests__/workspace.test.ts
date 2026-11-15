/**
 * What a task's workspace shows and where: each asset in its section in the order
 * sent, a quiz as data only when every part of it reads (else its markdown), an
 * excerpt's document, and a backend or cached workspace without the newer fields
 * read as "not there", never a crash.
 */
import { describe, expect, it } from "vitest";
import {
  durationLabel,
  excerptSource,
  groupAssets,
  isWebUrl,
  noticesOf,
  objectiveRepeatsTitle,
  quizOf,
  repeatsTitle,
  revealedLabel,
  splitCriteria,
  taskFacts,
  woopFor,
  workspaceHeader,
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

describe("workspaceHeader", () => {
  const TITLE = "Revise DBMS normalisation";

  it("the task's own completion criteria is the criterion, and the title is not repeated under it", () => {
    const header = workspaceHeader({
      task_title: TITLE,
      primary_objective: "Revise DBMS normalisation dbms normalisation",
      completion_criteria: "Normalise one schema to 3NF from memory",
    });
    expect(header).toEqual({ subtitle: null, criteria: ["Normalise one schema to 3NF from memory"] });
  });

  it("the task's own criteria win over what the chat's plan stored", () => {
    const header = workspaceHeader(
      { task_title: TITLE, primary_objective: TITLE, completion_criteria: "Normalise one schema to 3NF" },
      ["Read the slides"],
    );
    expect(header.criteria).toEqual(["Normalise one schema to 3NF"]);
  });

  it("criteria written as a list become separate items", () => {
    const header = workspaceHeader({
      task_title: TITLE,
      primary_objective: TITLE,
      completion_criteria: "- Define 2NF\n- Define 3NF; give one example",
    });
    expect(header.criteria).toEqual(["Define 2NF", "Define 3NF", "give one example"]);
  });

  it("without the task's own, the chat's stored criteria are used (today's fallback)", () => {
    const header = workspaceHeader({ task_title: TITLE, primary_objective: TITLE, completion_criteria: "" }, [
      "Solve 3 problems; explain one aloud",
    ]);
    expect(header.criteria).toEqual(["Solve 3 problems", "explain one aloud"]);
  });

  it("then an objective that says more than the title is the criterion, and not shown twice", () => {
    const header = workspaceHeader({ task_title: TITLE, primary_objective: "Be able to explain BCNF to a friend" });
    expect(header).toEqual({ subtitle: null, criteria: ["Be able to explain BCNF to a friend"] });
  });

  it("an objective that is only the title (with its topic words run on) is never shown: no criterion, no subtitle", () => {
    expect(workspaceHeader({ task_title: TITLE, primary_objective: TITLE })).toEqual({ subtitle: null, criteria: [] });
    expect(workspaceHeader({ task_title: TITLE, primary_objective: "revise dbms normalisation." })).toEqual({
      subtitle: null,
      criteria: [],
    });
    expect(
      workspaceHeader({ task_title: TITLE, primary_objective: "Revise DBMS normalisation normalisation 3nf bcnf" }),
    ).toEqual({ subtitle: null, criteria: [] });
  });

  it("a stored criterion or the task's criteria that is just the title is dropped", () => {
    expect(workspaceHeader({ task_title: TITLE, primary_objective: TITLE }, [TITLE]).criteria).toEqual([]);
    expect(workspaceHeader({ task_title: TITLE, primary_objective: TITLE, completion_criteria: `${TITLE}.` }).criteria).toEqual([]);
  });

  it("a criterion that only starts with the title is kept: it says more", () => {
    const header = workspaceHeader({
      task_title: TITLE,
      primary_objective: TITLE,
      completion_criteria: "Revise DBMS normalisation until you can do 3NF from memory",
    });
    expect(header.criteria).toEqual(["Revise DBMS normalisation until you can do 3NF from memory"]);
  });

  it("an objective that differs from the criterion is the subtitle", () => {
    const header = workspaceHeader({
      task_title: TITLE,
      primary_objective: "Get ready for Quiz 1",
      completion_criteria: "Normalise one schema to 3NF",
    });
    expect(header).toEqual({ subtitle: "Get ready for Quiz 1", criteria: ["Normalise one schema to 3NF"] });
  });

  it("an older backend or cached workspace without the new fields still reads", () => {
    expect(workspaceHeader({ task_title: TITLE, primary_objective: TITLE, completion_criteria: null })).toEqual({
      subtitle: null,
      criteria: [],
    });
    expect(workspaceHeader(null)).toEqual({ subtitle: null, criteria: [] });
  });
});

describe("repeatsTitle and objectiveRepeatsTitle", () => {
  it("compare without case, spacing or edge punctuation", () => {
    expect(repeatsTitle("  revise   DBMS normalisation!", "Revise DBMS normalisation")).toBe(true);
    expect(repeatsTitle("", "Anything")).toBe(true);
    expect(repeatsTitle("Revise DBMS", "Revise DBMS normalisation")).toBe(false);
  });

  it("an objective is a repeat when it is the title with words run on; a criterion is not", () => {
    expect(objectiveRepeatsTitle("Revise DBMS normalisation 3nf", "Revise DBMS normalisation")).toBe(true);
    expect(repeatsTitle("Revise DBMS normalisation 3nf", "Revise DBMS normalisation")).toBe(false);
    expect(objectiveRepeatsTitle("Revise DBMS normalisationally", "Revise DBMS normalisation")).toBe(false);
  });

  it("a title in another script is compared as written", () => {
    expect(repeatsTitle("डेटाबेस दोहराएँ", "डेटाबेस दोहराएँ")).toBe(true);
    expect(repeatsTitle("नॉर्मलाइज़ेशन", "डेटाबेस दोहराएँ")).toBe(false);
  });
});

describe("splitCriteria", () => {
  it("splits on new lines and semicolons and drops list markers", () => {
    expect(splitCriteria("1. Define 2NF\n2) Define 3NF\n* Example; \u2022 Check")).toEqual([
      "Define 2NF",
      "Define 3NF",
      "Example",
      "Check",
    ]);
  });

  it("anything but text is no criteria", () => {
    expect(splitCriteria(undefined)).toEqual([]);
    expect(splitCriteria(42)).toEqual([]);
    expect(splitCriteria(" ; \n ")).toEqual([]);
  });
});

describe("taskFacts", () => {
  it("names the kind of work, its length and when it is due", () => {
    expect(taskFacts({ task_kind: "write", duration_minutes: 25, deadline_hint: "Friday" })).toEqual({
      kind: "Writing",
      duration: "25 min",
      due: "Friday",
    });
  });

  it("a bare date reads as a day", () => {
    expect(taskFacts({ deadline_hint: "2026-11-17" }).due).toBe("due Tue 17 Nov");
  });

  it("anything unknown is left out, never guessed", () => {
    expect(taskFacts({})).toEqual({ kind: null, duration: null, due: null });
    expect(taskFacts({ task_kind: "chores", duration_minutes: null, deadline_hint: "  " })).toEqual({
      kind: null,
      duration: null,
      due: null,
    });
    expect(taskFacts({ task_kind: "toString" }).kind).toBeNull();
    expect(taskFacts(null)).toEqual({ kind: null, duration: null, due: null });
  });
});

describe("durationLabel", () => {
  it("minutes, hours, or both", () => {
    expect(durationLabel(25)).toBe("25 min");
    expect(durationLabel(60)).toBe("1 h");
    expect(durationLabel(90)).toBe("1 h 30 min");
    expect(durationLabel(0.4)).toBe("1 min");
  });

  it("no length for zero, negative or non-numbers", () => {
    expect(durationLabel(0)).toBeNull();
    expect(durationLabel(-5)).toBeNull();
    expect(durationLabel("25")).toBeNull();
    expect(durationLabel(Number.NaN)).toBeNull();
  });
});

describe("woopFor", () => {
  const CARD = { wish: "Revise", outcome: "Calm in the quiz", obstacle: "If the notes feel too long", plan: "then revise only 2NF" };

  it("the chat's stored plan comes first", () => {
    expect(woopFor({ woop_card: CARD }, { obstacle_trigger: "If tired", behavioral_response: "then do 10 minutes" })).toEqual({
      obstacle: "If tired",
      plan: "then do 10 minutes",
      outcome: null,
    });
  });

  it("else the workspace's own card", () => {
    expect(woopFor({ woop_card: CARD })).toEqual({
      obstacle: "If the notes feel too long",
      plan: "then revise only 2NF",
      outcome: "Calm in the quiz",
    });
  });

  it("none without both an obstacle and a plan", () => {
    expect(woopFor({ woop_card: { ...CARD, plan: "" } })).toBeNull();
    expect(woopFor({ woop_card: null }, { obstacle_trigger: "If tired" })).toBeNull();
    expect(woopFor({})).toBeNull();
    expect(woopFor(null, "nonsense")).toBeNull();
  });
});

describe("a composed workspace", () => {
  it("approachOf: trims, and reads a missing or blank approach as none", async () => {
    const { approachOf } = await import("@/lib/workspace");
    expect(approachOf({ approach: "  Spend ten minutes recalling.  " })).toBe("Spend ten minutes recalling.");
    expect(approachOf({ approach: "   " })).toBeNull();
    expect(approachOf({})).toBeNull();
    expect(approachOf(null)).toBeNull();
  });

  it("preparedTitle: a composed workspace is 'Prepared for this task', whatever its kind", async () => {
    const { preparedTitle } = await import("@/lib/workspace");
    expect(preparedTitle({ approach: "Do this first.", task_kind: "write" })).toBe("Prepared for this task");
    expect(preparedTitle({ approach: "Do this first.", task_kind: "study" })).toBe("Prepared for this task");
  });

  it("preparedTitle: a recipe-built workspace keeps the heading of its kind", async () => {
    const { preparedTitle } = await import("@/lib/workspace");
    expect(preparedTitle({ task_kind: "admin" })).toBe("Get started");
    expect(preparedTitle({ task_kind: "study" })).toBe("Practice");
    expect(preparedTitle(null)).toBe("Practice");
  });
});
