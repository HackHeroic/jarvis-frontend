/**
 * What a spoken request can do without a model: move around the app and switch the
 * theme. Anything else is a question or a request for Jarvis, and goes to chat.
 */

import { capstoneTopicFor } from "@/lib/capstone";

export type VoiceAction =
  /** "stop", "continue", "next", "back": steers whatever Jarvis is presenting. */
  | { kind: "control"; what: "stop" | "resume" | "next" | "back"; otherwise: VoiceAction }
  | { kind: "capstone"; on: boolean; say: string }
  /** Asked to explain how Jarvis is built; `otherwise` is what to do outside capstone mode. */
  | { kind: "explain"; topic: string; otherwise: VoiceAction }
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

/** "explain", "walk us through", "show the"…: a request for a walkthrough of a topic. */
const EXPLAIN = /^(?:please\s+)?(?:can you\s+)?(?:explain|walk (?:me |us )?through|animate|present|demonstrate|describe|tell (?:me|us) (?:about|how)|how (?:does|do|did|is|are|were|was)|show(?: me| us)?|play|draw|open|start|what (?:is|are)(?: the| your)?)\b/;

/** What to do with a spoken request. */
export function voiceAction(request: string): VoiceAction {
  const text = request.trim();
  const said = text.toLowerCase().replace(/[.!?]+$/, "");

  if (said.split(/\s+/).length <= 4) {
    const what = /\b(stop|pause|quiet|enough|wait|hold on|silence|shut up)\b/.test(said) ? "stop"
      : /\b(continue|resume|go on|carry on|keep going|go ahead)\b/.test(said) ? "resume"
      : /\b(next|skip)\b/.test(said) ? "next"
      : /\b(back|previous|again|repeat)\b/.test(said) ? "back"
      : null;
    if (what) return { kind: "control", what, otherwise: plainAction(text, said) };
  }

  // Speech recognition hears "capstone" as capstan, cap stone, captain, keystone…
  const mode = /\b(?:cap\s?st[oa]ne?s?|capstan|kapstone|captain|keystone|cabstone|project|presentation|demo)\s+mode\b|\bcap\s?st[oa]ne?\b/.exec(said);
  if (mode && said.split(/\s+/).length <= 8) {
    const off = /\b(off|exit|leave|stop|end|disable|close)\b/.test(said);
    return {
      kind: "capstone",
      on: !off,
      say: off ? "Capstone mode off, sir." : "Capstone mode on. Ask me how I was built, sir.",
    };
  }
  if (EXPLAIN.test(said) && /\b(everything|whole (?:project|thing|system)|all of it|full (?:walkthrough|tour)|how (?:you were|it was|jarvis was) built|entire (?:project|system))\b/.test(said)) {
    return { kind: "explain", topic: "all", otherwise: plainAction(text, said) };
  }
  if (EXPLAIN.test(said)) {
    const topic = capstoneTopicFor(said);
    if (topic) return { kind: "explain", topic: topic.id, otherwise: plainAction(text, said) };
  }
  return plainAction(text, said);
}

function plainAction(text: string, said: string): VoiceAction {

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
