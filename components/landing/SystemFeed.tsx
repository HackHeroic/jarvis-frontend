"use client";

import { useEffect, useState } from "react";

/**
 * Persistent floating "system feed" — fixed bottom-right.
 *
 * Always visible while scrolling the landing. Auto-rotates messages every ~3.5s
 * to suggest a continuously running engine. Mobile: simplified to a single dot
 * + iteration counter.
 */

const FEED = [
  "recalibrating focus window for tomorrow",
  "extracted 3 deadlines from PDF",
  "skipped morning gym → moved to evening",
  "memory decay refresh · 12 items",
  "behavior model · adjusting peak-hour bias",
  "constraint solver · 0.04s",
  "loop iteration complete",
  "draft updated · 2 conflicts resolved",
  "noticed pattern · you skip 7am tasks 4/5 times",
  "rescheduling · prof meeting moved",
];

function fakeTime(offsetMin = 0): string {
  const d = new Date(Date.now() - offsetMin * 60_000);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function SystemFeed() {
  const [idx, setIdx] = useState(0);
  const [iter, setIter] = useState(0);
  const [mounted, setMounted] = useState(false);

  // start counters only on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setIter(Math.floor(Date.now() / 1000) % 1_000_000);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % FEED.length), 3500);
    return () => clearInterval(id);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setIter((p) => p + Math.floor(Math.random() * 5) + 1);
    }, 1400);
    return () => clearInterval(id);
  }, [mounted]);

  if (!mounted) return null;

  const message = FEED[idx];
  const offset = (idx % 5) + 1;

  return (
    <div
      className="fixed bottom-5 right-5 z-40 hidden md:flex flex-col items-end gap-1.5 pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* main feed line */}
      <div
        className="glass-card flex items-center gap-2.5 px-3.5 py-2 rounded-full"
        style={{
          borderColor: "rgba(212,119,90,0.22)",
          boxShadow:
            "0 12px 28px rgba(0,0,0,0.45), 0 0 24px rgba(212,119,90,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
          style={{ boxShadow: "0 0 10px #4A7B6B", animation: "glow-pulse 1.6s ease-in-out infinite" }}
        />
        <span className="text-[#FAF8F4]/40 font-mono text-[10px] tracking-[1px] uppercase tabular-nums">
          {fakeTime(offset)}
        </span>
        <span className="text-[#FAF8F4]/25 text-[10px]">·</span>
        <span
          key={idx}
          className="text-[#FAF8F4]/85 font-mono text-[10.5px] tracking-[0.3px] animate-[sf-in_0.5s_ease-out]"
        >
          {message}
        </span>
      </div>

      {/* secondary status row */}
      <div className="flex items-center gap-2 pr-3 font-mono text-[9.5px] tracking-[1.5px] uppercase text-[#FAF8F4]/30">
        <span className="text-[#D4775A]/85">jarvis</span>
        <span className="text-[#FAF8F4]/20">·</span>
        <span>iteration</span>
        <span className="text-[#E09D5C]/85 tabular-nums">#{iter.toLocaleString()}</span>
        <span className="text-[#FAF8F4]/20">·</span>
        <span className="text-[#4A7B6B]/85">live</span>
      </div>

      <style>{`
        @keyframes sf-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
