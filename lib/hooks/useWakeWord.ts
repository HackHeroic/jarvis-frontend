"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speechRecognition, type BrowserSpeechRecognition } from "@/lib/speech";
import { commandAfterWakeWord, DICTATION_EVENT, HANDS_FREE_KEY, spokenRequest } from "@/lib/wakeWord";

/**
 * off: the user turned hands-free off. unsupported: no speech recognition here.
 * blocked: the microphone was refused. standby: listening for "Jarvis".
 * awake: Jarvis heard its name and is taking the request. speaking: Jarvis is talking
 * (the microphone is paused so it never hears itself).
 */
export type PresenceStatus = "off" | "unsupported" | "blocked" | "standby" | "awake" | "speaking";

/** How long Jarvis stays awake for the request after hearing only its name. */
const AWAKE_MS = 8000;

type Options = {
  /** Called once with each spoken request. */
  onCommand: (text: string) => void;
  /** Called when only "Jarvis" was heard, before the request. */
  onWake?: () => void;
  /** False where hands-free does not run at all (phones). */
  available: boolean;
  /** Keep listening while Jarvis speaks, so "Jarvis, stop" can interrupt it. */
  bargeIn?: boolean;
};

/**
 * Listens for "Jarvis" with the browser's speech recognition, all the time the app is
 * open, and reports the request spoken with or after it.
 */
export function useWakeWord({ onCommand, onWake, available, bargeIn = false }: Options) {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<PresenceStatus>("standby");
  const [heard, setHeard] = useState("");

  const handlers = useRef({ onCommand, onWake, bargeIn });
  handlers.current = { onCommand, onWake, bargeIn };

  useEffect(() => {
    try { setEnabled(localStorage.getItem(HANDS_FREE_KEY) !== "off"); } catch { /* keep the default */ }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      try { localStorage.setItem(HANDS_FREE_KEY, on ? "off" : "on"); } catch { /* ignore */ }
      return !on;
    });
  }, []);

  useEffect(() => {
    const Recognition = speechRecognition();
    if (!available || !Recognition) { setStatus("unsupported"); return; }
    if (!enabled) { setStatus("off"); setHeard(""); return; }

    let stopped = false;
    let running = false;
    let blocked = false;
    let dictating = false;
    let awakeUntil = 0;
    let restart: number | undefined;
    let recognition: BrowserSpeechRecognition | null = null;

    const speaking = () => "speechSynthesis" in window && window.speechSynthesis.speaking;
    const paused = () => dictating || (speaking() && !handlers.current.bargeIn) || document.hidden;
    const awake = () => Date.now() < awakeUntil;

    const show = () => {
      if (stopped) return;
      if (blocked) setStatus("blocked");
      else if (speaking()) setStatus("speaking");
      else setStatus(awake() ? "awake" : "standby");
    };

    // While Jarvis is talking (barge-in), "stop" or "pause" acts the moment it is heard:
    // no name needed and no waiting for the sentence to end. Jarvis's own lines avoid
    // those words, so it does not interrupt itself.
    let interruptedAt = 0;
    const interruption = (transcript: string): boolean => {
      if (!handlers.current.bargeIn || !speaking()) return false;
      if (Date.now() - interruptedAt < 2500) return true;
      if (!/\b(stop|pause|paws|silence|be quiet|shut up)\b/i.test(transcript)) return false;
      interruptedAt = Date.now();
      awakeUntil = 0;
      setHeard("");
      handlers.current.onCommand("stop");
      return true;
    };

    const deliver = (text: string) => {
      awakeUntil = 0;
      setHeard("");
      handlers.current.onCommand(text);
    };

    const start = () => {
      if (stopped || running || blocked || paused()) return;
      const next = new Recognition();
      next.lang = navigator.language || "en-IN";
      next.continuous = true;
      next.interimResults = true;
      next.maxAlternatives = 1;
      next.onresult = (event) => {
        for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? "";
          if (interruption(transcript)) continue;
          if (!result.isFinal) {
            // Show what is being heard as soon as the name is in it.
            const sofar = awake() ? spokenRequest(transcript) : commandAfterWakeWord(transcript);
            if (sofar !== null) {
              if (!awake()) awakeUntil = Date.now() + AWAKE_MS;
              setHeard(sofar);
            }
            continue;
          }
          if (awake()) {
            const request = spokenRequest(transcript);
            if (request) deliver(request);
            else if (commandAfterWakeWord(transcript) === "") {
              // Only the name so far: answer, and wait for the request.
              awakeUntil = Date.now() + AWAKE_MS;
              handlers.current.onWake?.();
            }
            continue;
          }
          const request = commandAfterWakeWord(transcript);
          if (request === null) continue;
          if (request) deliver(request);
          else {
            awakeUntil = Date.now() + AWAKE_MS;
            handlers.current.onWake?.();
          }
        }
        show();
      };
      next.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") blocked = true;
      };
      next.onend = () => {
        running = false;
        show();
        if (!stopped && !blocked) restart = window.setTimeout(start, 400);
      };
      try {
        next.start();
        running = true;
        recognition = next;
      } catch {
        restart = window.setTimeout(start, 1000);
      }
    };

    const halt = () => {
      if (!running) return;
      try { (recognition?.abort ?? recognition?.stop)?.call(recognition); } catch { /* already stopped */ }
    };

    // Speaking, dictation and a hidden tab pause the microphone; a lapsed "awake" falls
    // back to standby. One light poll covers all of them (speech synthesis has no event
    // this hook could subscribe to from outside the page that started it).
    const watch = window.setInterval(() => {
      if (paused()) {
        // While Jarvis answers "Yes?", the wait for the request starts when it finishes.
        if (awake() && speaking()) awakeUntil = Date.now() + AWAKE_MS;
        halt();
      } else if (!running) start();
      if (!awake()) setHeard((text) => (text ? "" : text));
      show();
    }, 300);

    const onDictation = (event: Event) => {
      dictating = Boolean((event as CustomEvent<boolean>).detail);
      if (dictating) halt();
    };
    window.addEventListener(DICTATION_EVENT, onDictation);

    start();
    show();
    return () => {
      stopped = true;
      window.clearInterval(watch);
      window.clearTimeout(restart);
      window.removeEventListener(DICTATION_EVENT, onDictation);
      halt();
    };
  }, [enabled, available]);

  return { status, heard, enabled, toggle };
}
