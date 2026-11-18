/**
 * Hands-free Jarvis: finding the wake word in what the browser heard, and handing the
 * spoken request to the chat page.
 */

/** "Jarvis" as speech recognition tends to spell it, with an optional "hey" or "ok". */
const WAKE_WORD = /\b(?:(?:hey|hi|ok|okay|yo)[\s,]+)?(?:jarvis|jarvus|jervis|jarves|jarvies|javis|jarvi's)\b[\s,.!?:;-]*/i;

/**
 * The request spoken with the wake word, or null when the wake word was not said.
 *
 * "Jarvis, what's on today?" gives "what's on today?"; "What's on today, Jarvis?" gives
 * "What's on today"; "Jarvis" alone gives "" (the caller then waits for the request).
 */
export function commandAfterWakeWord(transcript: string): string | null {
  const heard = transcript.trim();
  const match = WAKE_WORD.exec(heard);
  if (!match) return null;
  const after = heard.slice(match.index + match[0].length).trim();
  if (after) return after;
  return heard.slice(0, match.index).replace(/[\s,.!?:;-]+$/, "").trim();
}

/** What was said once Jarvis is already awake: the words, without a repeated wake word. */
export function spokenRequest(transcript: string): string {
  return commandAfterWakeWord(transcript) ?? transcript.trim();
}

/** Fired on window with the request as `detail`; the chat page sends it. */
export const VOICE_COMMAND_EVENT = "jarvis:voice-command";
/** Fired on window with `detail: boolean` while the composer's own mic is dictating. */
export const DICTATION_EVENT = "jarvis:dictation";
export const HANDS_FREE_KEY = "jarvis-hands-free";

const PENDING_KEY = "jarvis-voice-command";

/** Keep a request spoken on another page for the chat page to send once it opens. */
export function holdVoiceCommand(text: string): void {
  try { sessionStorage.setItem(PENDING_KEY, text); } catch { /* storage may be unavailable */ }
}

/** The request held for the chat page, read once. */
export function takeVoiceCommand(): string | null {
  try {
    const held = sessionStorage.getItem(PENDING_KEY);
    if (held !== null) sessionStorage.removeItem(PENDING_KEY);
    return held;
  } catch {
    return null;
  }
}
