/**
 * What a spoken request can do without a model: move around the app and switch the
 * theme. Anything else is a question or a request for Jarvis, and goes to chat.
 */

export type VoiceAction =
  | { kind: "navigate"; href: string; say: string }
  | { kind: "theme"; theme: "dark" | "light"; say: string }
  | { kind: "chat"; text: string };

const PAGES: Array<{ href: string; say: string; words: RegExp }> = [
  { href: "/dashboard", say: "Your dashboard, sir.", words: /\b(dashboard|home|overview)\b/ },
  { href: "/schedule", say: "Your schedule, sir.", words: /\b(schedule|calendar|timetable|timeline)\b/ },
  { href: "/documents", say: "Your documents, sir.", words: /\b(documents?|docs|files|notes|syllabus)\b/ },
  { href: "/habits", say: "The rules I've learned, sir.", words: /\b(habits?|rules?|check-?ins?)\b/ },
  { href: "/you", say: "Here is what I know about you, sir.", words: /\b(you page|profile|memor(?:y|ies)|what you know about me|settings)\b/ },
  { href: "/chat", say: "Right here, sir.", words: /\b(chat|conversation)\b/ },
];

/** "open", "show me", "go to"…: the request is to see a page, not a question about it. */
const GO = /^(?:please\s+)?(?:open(?: up)?|show(?: me)?|go(?: back)? to|take me(?: back)? to|pull up|bring up|switch to|navigate to|let me see|display)\b/;

/** What to do with a spoken request. */
export function voiceAction(request: string): VoiceAction {
  const text = request.trim();
  const said = text.toLowerCase().replace(/[.!?]+$/, "");

  const theme = /\b(dark|night|light|day)\s*(?:mode|theme)\b/.exec(said)
    ?? /\b(?:lights?|go)\s+(dark|off|on|light)\b/.exec(said);
  if (theme) {
    const dark = ["dark", "night", "off"].includes(theme[1]);
    return { kind: "theme", theme: dark ? "dark" : "light", say: dark ? "Dimming the lights, sir." : "Lights up, sir." };
  }

  // A short request to see a page; a longer sentence that happens to name one is a question.
  if (GO.test(said) && said.split(/\s+/).length <= 7) {
    const page = PAGES.find((candidate) => candidate.words.test(said));
    if (page) return { kind: "navigate", href: page.href, say: page.say };
  }
  return { kind: "chat", text };
}
