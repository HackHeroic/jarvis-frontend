"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Keyboard easter eggs (subtle, never noisy):
 *  - press "j" → flash an "acknowledged" toast bottom-left, briefly amplify
 *    the global glow-pulse keyframe so all sage/terra status pulses brighten
 *    in sync ("Jarvis hears you")
 *  - press "?" → toggle a small help overlay in Jarvis voice
 *
 * Ignores keypresses while the user is typing into an input or textarea.
 */

const HELP_LINES = [
  { k: "/", v: "focus the input. tell me what you want." },
  { k: "j", v: "I'll acknowledge. Try it." },
  { k: "esc", v: "close this overlay." },
  { k: "scroll", v: "everything else." },
];

export default function EasterEggs() {
  const [ack, setAck] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const isTextField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTextField(e.target)) return;

      if (e.key === "j" || e.key === "J") {
        setAck((n) => n + 1);
      } else if (e.key === "?") {
        setHelpOpen((o) => !o);
      } else if (e.key === "Escape") {
        setHelpOpen(false);
      } else if (e.key === "/") {
        // focus the hero input if present
        const input = document.querySelector<HTMLInputElement>(
          "section input[type=text]"
        );
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Acknowledgment toast auto-clears
  useEffect(() => {
    if (ack === 0) return;
    const t = setTimeout(() => setAck(0), 1800);
    return () => clearTimeout(t);
  }, [ack]);

  return (
    <>
      {/* "j" acknowledgment */}
      <AnimatePresence>
        {ack > 0 ? (
          <motion.div
            key={ack}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="glass-card fixed bottom-5 left-5 z-50 px-3.5 py-2 rounded-full flex items-center gap-2.5"
            style={{
              borderColor: "rgba(74,123,107,0.35)",
              boxShadow:
                "0 12px 28px rgba(0,0,0,0.45), 0 0 24px rgba(74,123,107,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            aria-live="polite"
          >
            <span
              className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
              style={{ boxShadow: "0 0 12px #4A7B6B" }}
            />
            <span className="text-[#FAF8F4]/85 font-mono text-[10.5px] tracking-[1.5px] uppercase">
              acknowledged
            </span>
            <span className="text-[#FAF8F4]/35 text-[10px] font-mono">·</span>
            <span className="text-[#FAF8F4]/55 text-[10.5px] italic">I hear you.</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* "?" help overlay */}
      <AnimatePresence>
        {helpOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
            style={{ background: "rgba(11,9,7,0.55)", backdropFilter: "blur(6px)" }}
            onClick={() => setHelpOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-card relative max-w-md w-[92%] mx-4 rounded-2xl p-7"
              style={{ borderColor: "rgba(212,119,90,0.3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <span
                  className="block w-[6px] h-[6px] rounded-full bg-[#D4775A]"
                  style={{ boxShadow: "0 0 12px #D4775A", animation: "glow-pulse 2.4s ease-in-out infinite" }}
                />
                <span className="text-[#D4775A] font-mono text-[10px] tracking-[2.5px] uppercase">
                  jarvis · listening
                </span>
              </div>
              <p className="text-[#FAF8F4] text-[18px] font-light leading-relaxed mb-5">
                I&apos;m here.{" "}
                <em className="not-italic text-[#FAF8F4]/55 italic">What did you want to know?</em>
              </p>
              <div className="flex flex-col gap-2 mb-5">
                {HELP_LINES.map((row) => (
                  <div
                    key={row.k}
                    className="flex items-center gap-3 font-mono text-[11px] text-[#FAF8F4]/70"
                  >
                    <kbd
                      className="inline-flex items-center justify-center min-w-[24px] h-[20px] px-1.5 rounded text-[10px] uppercase tracking-[0.5px]"
                      style={{
                        background: "rgba(212,119,90,0.15)",
                        border: "1px solid rgba(212,119,90,0.35)",
                        color: "#D4775A",
                      }}
                    >
                      {row.k}
                    </kbd>
                    <span className="text-[#FAF8F4]/55 italic">{row.v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[#FAF8F4]/35 text-[11px] font-mono uppercase tracking-[1.5px]">
                press <span className="text-[#D4775A]">esc</span> to close
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* tiny global hint — fixed bottom-center, fades after a few seconds */}
      <FirstVisitHint />
    </>
  );
}

function FirstVisitHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("jarvis-hint-seen") === "1") return;
    const t1 = setTimeout(() => setShow(true), 6500);
    const t2 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("jarvis-hint-seen", "1");
    }, 13000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <div
            className="glass-card flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[10px] tracking-[1.5px] uppercase text-[#FAF8F4]/55"
            style={{ borderColor: "rgba(212,119,90,0.22)" }}
          >
            <span
              className="block w-[5px] h-[5px] rounded-full bg-[#D4775A]"
              style={{ boxShadow: "0 0 8px #D4775A", animation: "glow-pulse 1.8s ease-in-out infinite" }}
            />
            <span>press</span>
            <kbd
              className="inline-flex items-center justify-center px-1.5 py-px rounded text-[9px] uppercase"
              style={{
                background: "rgba(212,119,90,0.15)",
                border: "1px solid rgba(212,119,90,0.35)",
                color: "#D4775A",
              }}
            >
              ?
            </kbd>
            <span>for help</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
