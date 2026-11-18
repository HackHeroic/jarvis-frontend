import { describe, expect, it } from "vitest";
import { voiceAction } from "../voiceActions";

describe("voiceAction", () => {
  it("opens the page a short request names", () => {
    expect(voiceAction("open my schedule")).toMatchObject({ kind: "navigate", href: "/schedule" });
    expect(voiceAction("Show me the dashboard.")).toMatchObject({ kind: "navigate", href: "/dashboard" });
    expect(voiceAction("pull up my documents")).toMatchObject({ kind: "navigate", href: "/documents" });
    expect(voiceAction("go to habits")).toMatchObject({ kind: "navigate", href: "/habits" });
    expect(voiceAction("show me what you know about me")).toMatchObject({ kind: "navigate", href: "/you" });
  });

  it("switches the theme", () => {
    expect(voiceAction("switch to dark mode")).toMatchObject({ kind: "theme", theme: "dark" });
    expect(voiceAction("light mode please")).toMatchObject({ kind: "theme", theme: "light" });
    expect(voiceAction("lights off")).toMatchObject({ kind: "theme", theme: "dark" });
  });

  it("sends a question to chat, even when it names a page", () => {
    expect(voiceAction("what is on my schedule today")).toEqual({ kind: "chat", text: "what is on my schedule today" });
    expect(voiceAction("explain third normal form")).toMatchObject({ kind: "chat" });
    expect(voiceAction("show me how to normalise the student table from my notes step by step"))
      .toMatchObject({ kind: "chat" });
  });

  it("sends a request to open something that is not a page to chat", () => {
    expect(voiceAction("open a new plan for my exam")).toMatchObject({ kind: "chat" });
  });
});
