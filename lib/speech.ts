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

const FEMALE_NAME = /female|feminine|samantha|victoria|karen|moira|tessa|zira|aria|jenny|ava|susan|allison|aditi|heera|veena|lekha|priya|neha|reena|sangeeta/i;

/** An utterance in Jarvis's voice: the same voice for replies and for "Yes?". */
export function jarvisUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const indianVoices = voices.filter((voice) => /^en[-_]in$/i.test(voice.lang));
  const voice = indianVoices.find((v) => FEMALE_NAME.test(v.name))
    ?? voices.find((v) =>
      FEMALE_NAME.test(v.name)
      && v.lang.toLowerCase().startsWith(navigator.language.split("-")[0].toLowerCase()),
    )
    ?? voices.find((v) => FEMALE_NAME.test(v.name))
    ?? indianVoices[0];
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-IN";
  utterance.volume = 1;
  utterance.rate = 1.08;
  utterance.pitch = voice ? 1.28 : 1.48;
  return utterance;
}
