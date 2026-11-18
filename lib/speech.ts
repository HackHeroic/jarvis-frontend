/** The browser's speech APIs, as Jarvis uses them: one voice, and a typed recogniser. */

export type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal?: boolean };

export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type RecognitionConstructor = new () => BrowserSpeechRecognition;

/** The browser's speech recogniser, or null where there is none (Firefox, older Safari). */
export function speechRecognition(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

/** British male voices, best first: the nearest a browser has to the film's Jarvis. */
const JARVIS_VOICES = [/^daniel\b/i, /google uk english male/i, /^(oliver|arthur|george|ryan|thomas)\b/i, /uk english male/i];

function jarvisVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  for (const name of JARVIS_VOICES) {
    const named = voices.find((voice) => name.test(voice.name) && /^en/i.test(voice.lang));
    if (named) return named;
  }
  const british = voices.filter((voice) => /^en[-_]gb$/i.test(voice.lang));
  return british.find((voice) => !/female/i.test(voice.name)) ?? british[0]
    ?? voices.find((voice) => /^en/i.test(voice.lang));
}

/** An utterance in Jarvis's voice: the same voice for replies and for "Yes, sir?". */
export function jarvisUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = jarvisVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-GB";
  utterance.volume = 1;
  utterance.rate = 1.04;
  utterance.pitch = 0.92;
  return utterance;
}

/** Say one short line in Jarvis's voice, replacing whatever was being said. */
export function say(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(jarvisUtterance(text));
}
