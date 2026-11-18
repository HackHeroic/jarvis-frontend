import { describe, expect, it } from "vitest";
import { commandAfterWakeWord, spokenRequest } from "../wakeWord";

describe("commandAfterWakeWord", () => {
  it("returns null when Jarvis was not addressed", () => {
    expect(commandAfterWakeWord("what is on my plate today")).toBeNull();
    expect(commandAfterWakeWord("")).toBeNull();
  });

  it("returns the request that follows the wake word", () => {
    expect(commandAfterWakeWord("Jarvis, what's on today?")).toBe("what's on today?");
    expect(commandAfterWakeWord("hey Jarvis plan my DBMS revision")).toBe("plan my DBMS revision");
    expect(commandAfterWakeWord("so um okay jarvis explain third normal form")).toBe("explain third normal form");
  });

  it("returns the request that came before a trailing wake word", () => {
    expect(commandAfterWakeWord("What's on today, Jarvis?")).toBe("What's on today");
  });

  it("returns an empty request when only the wake word was said", () => {
    expect(commandAfterWakeWord("Jarvis")).toBe("");
    expect(commandAfterWakeWord("Hey, Jarvis!")).toBe("");
  });

  it("accepts the spellings speech recognition produces", () => {
    for (const heard of ["jarvus open my schedule", "Jervis open my schedule", "javis open my schedule"]) {
      expect(commandAfterWakeWord(heard)).toBe("open my schedule");
    }
  });

  it("does not wake on a word that only contains it", () => {
    expect(commandAfterWakeWord("the jarvisian approach")).toBeNull();
  });
});

describe("spokenRequest", () => {
  it("keeps the words as said, without a repeated wake word", () => {
    expect(spokenRequest("  what's due this week  ")).toBe("what's due this week");
    expect(spokenRequest("Jarvis what's due this week")).toBe("what's due this week");
  });
});
