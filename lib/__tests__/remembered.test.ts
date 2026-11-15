/**
 * What a chat turn says it remembered: one line per memory it created ("Remembered")
 * or replaced ("Updated"), none for one it only heard again, Undo only when the
 * memory's id is known, and a forgotten memory reads "Forgotten" with its words gone
 * from the stored chat. Moments restored from storage may be anything.
 */
import { describe, expect, it } from "vitest";
import { toLearningMoment, type LearningMoment } from "@/lib/learning";
import { markForgotten, noticedLines, rememberedLines } from "@/lib/remembered";
import type { JarvisMessage, MemoryExtractedEvent } from "@/lib/types";

const frame = (over: Partial<MemoryExtractedEvent> = {}): MemoryExtractedEvent => ({
  memory_id: "m-1",
  type: "fact",
  content: "Computer Networks professor is Dr. Rao, who gives surprise quizzes on Thursdays",
  confidence: 0.9,
  provenance: "said",
  action: "created",
  ...over,
});

/** A frame as the chat keeps it: normalised into a learning moment. */
const moment = (over: Partial<MemoryExtractedEvent> = {}): LearningMoment =>
  toLearningMoment(frame(over), "memory")!;

describe("rememberedLines", () => {
  it("two created memories give two lines, in order", () => {
    const lines = rememberedLines([
      moment({ memory_id: "m-1", content: "Goes to the gym every weekday at 6 PM" }),
      moment({ memory_id: "m-2", content: "Dr. Rao gives surprise quizzes on Thursdays" }),
    ]);
    expect(lines).toEqual([
      { memoryId: "m-1", text: "Goes to the gym every weekday at 6 PM", verb: "Remembered", forgotten: false },
      { memoryId: "m-2", text: "Dr. Rao gives surprise quizzes on Thursdays", verb: "Remembered", forgotten: false },
    ]);
  });

  it("a reinforced memory gives no line", () => {
    expect(rememberedLines([moment({ action: "reinforced" })])).toEqual([]);
  });

  it("a superseded memory reads Updated", () => {
    const [line] = rememberedLines([moment({ memory_id: "m-9", content: "Gym moved to 7 AM on weekdays", action: "superseded" })]);
    expect(line).toEqual({ memoryId: "m-9", text: "Gym moved to 7 AM on weekdays", verb: "Updated", forgotten: false });
  });

  it("the same memory_id twice is listed once", () => {
    const lines = rememberedLines([moment({ memory_id: "m-1" }), moment({ memory_id: "m-1" }), moment({ memory_id: "m-2" })]);
    expect(lines.map((l) => l.memoryId)).toEqual(["m-1", "m-2"]);
  });

  it("reads the raw frames too", () => {
    const lines = rememberedLines([frame({ action: "created" }), frame({ memory_id: "m-2", action: "reinforced" })]);
    expect(lines.map((l) => [l.memoryId, l.verb])).toEqual([["m-1", "Remembered"]]);
  });

  it("a memory without an id still shows, with no id (so no Undo); without ids, the same words show once", () => {
    const noId = { kind: "memory", id: "", content: "Prefers evening study", action: "created" };
    const lines = rememberedLines([noId, { ...noId }, { kind: "memory", content: "Has a lab on Fridays", action: "created" }]);
    expect(lines).toEqual([
      { memoryId: null, text: "Prefers evening study", verb: "Remembered", forgotten: false },
      { memoryId: null, text: "Has a lab on Fridays", verb: "Remembered", forgotten: false },
    ]);
  });

  it("patterns, unknown actions and rows it cannot read are left out", () => {
    const lines = rememberedLines([
      { kind: "pattern", id: "p-1", content: "Mornings go better", action: "created" },
      moment({ action: "created", memory_id: "m-1" }),
      { kind: "memory", id: "m-2", content: "x", action: "strengthened" },
      { kind: "memory", id: "m-3", content: "  ", action: "created" },
      { kind: "memory", id: "m-4", action: "created" },
      null,
      "Remembered: something",
      42,
    ]);
    expect(lines.map((l) => l.memoryId)).toEqual(["m-1"]);
  });

  it("anything but a list is no lines", () => {
    expect(rememberedLines(undefined)).toEqual([]);
    expect(rememberedLines({ 0: moment() })).toEqual([]);
  });

  it("a forgotten memory keeps its place with no words", () => {
    const lines = rememberedLines([
      { ...moment({ memory_id: "m-1" }), content: "", forgotten: true },
      moment({ memory_id: "m-2", content: "Hostel mess closes at 9 PM" }),
    ]);
    expect(lines).toEqual([
      { memoryId: "m-1", text: "", verb: "Remembered", forgotten: true },
      { memoryId: "m-2", text: "Hostel mess closes at 9 PM", verb: "Remembered", forgotten: false },
    ]);
  });

  it("a duplicate that was forgotten makes the one line forgotten", () => {
    const lines = rememberedLines([moment({ memory_id: "m-1" }), { ...moment({ memory_id: "m-1" }), content: "", forgotten: true }]);
    expect(lines).toEqual([{ memoryId: "m-1", text: "", verb: "Remembered", forgotten: true }]);
  });
});

describe("noticedLines", () => {
  it("lists the patterns with words, in order", () => {
    const lines = noticedLines([
      { kind: "pattern", id: "p-1", content: "Mornings go better than evenings", action: "created" },
      moment(),
      { kind: "pattern", id: "", content: "  " },
      { kind: "pattern", id: "p-2", content: "Short tasks get done first", action: "strengthened" },
    ]);
    expect(lines.map((l) => l.text)).toEqual(["Mornings go better than evenings", "Short tasks get done first"]);
    expect(new Set(lines.map((l) => l.key)).size).toBe(2);
  });

  it("anything but a list is no lines", () => {
    expect(noticedLines(null)).toEqual([]);
  });
});

describe("markForgotten", () => {
  const reply = (id: string, moments: LearningMoment[], memories?: { memory_id?: string; memory_type: string; content: string }[]): JarvisMessage => ({
    id,
    role: "assistant",
    content: "Noted.",
    timestamp: 1,
    learningMoments: moments,
    ...(memories ? { response: { intent: "CONVERSATION", message: "Noted.", memories } } : {}),
  });

  it("marks every moment for the memory forgotten and erases its words", () => {
    const messages = [
      reply("a", [moment({ memory_id: "m-1" }), moment({ memory_id: "m-2", content: "Lab on Fridays" })]),
      reply("b", [moment({ memory_id: "m-1", action: "reinforced" })]),
    ];
    const next = markForgotten(messages, "m-1");
    expect(next[0].learningMoments![0]).toMatchObject({ id: "m-1", content: "", forgotten: true });
    expect(next[0].learningMoments![1]).toMatchObject({ id: "m-2", content: "Lab on Fridays" });
    expect(next[0].learningMoments![1].forgotten).toBeUndefined();
    expect(next[1].learningMoments![0]).toMatchObject({ content: "", forgotten: true });
    expect(rememberedLines(next[0].learningMoments)[0]).toEqual({
      memoryId: "m-1",
      text: "",
      verb: "Remembered",
      forgotten: true,
    });
  });

  it("the memory leaves the reply's panel memories, so its words are not kept", () => {
    const messages = [
      reply("a", [moment({ memory_id: "m-1" })], [
        { memory_id: "m-1", memory_type: "fact", content: "Dr. Rao gives surprise quizzes" },
        { memory_id: "m-2", memory_type: "fact", content: "Lab on Fridays" },
      ]),
    ];
    const next = markForgotten(messages, "m-1");
    expect(next[0].response?.memories?.map((m) => m.memory_id)).toEqual(["m-2"]);
    expect(JSON.stringify(next)).not.toContain("Dr. Rao");
  });

  it("leaves pattern moments with the same id alone", () => {
    const pattern: LearningMoment = { kind: "pattern", id: "m-1", content: "Mornings go better", provenance: "inferred", confidence: 0.8, action: "created" };
    const messages = [reply("a", [pattern])];
    expect(markForgotten(messages, "m-1")).toBe(messages);
  });

  it("returns the same chat when no message mentions the memory, or the id is blank", () => {
    const messages = [reply("a", [moment({ memory_id: "m-2" })])];
    expect(markForgotten(messages, "m-1")).toBe(messages);
    expect(markForgotten(messages, "  ")).toBe(messages);
  });

  it("does not change the messages it was given", () => {
    const messages = [reply("a", [moment({ memory_id: "m-1" })])];
    const before = JSON.stringify(messages);
    markForgotten(messages, "m-1");
    expect(JSON.stringify(messages)).toBe(before);
  });
});
