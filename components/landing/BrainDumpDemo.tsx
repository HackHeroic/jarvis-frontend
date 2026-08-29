"use client";

import { motion, AnimatePresence, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseDump, type ParsedBlock } from "@/lib/landing/dumpParser";

const FALLBACK_PREFILL = "Prepare for ML competition by Friday. Gym 3x. Call mom Sunday.";

function prefillForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    // morning
    return "Make today count. Deep work, gym 3x, call mom Sunday.";
  }
  if (hour >= 12 && hour < 17) {
    // afternoon
    return "Salvage the afternoon. Finish ML deck, gym tonight, prep for Monday.";
  }
  if (hour >= 17 && hour < 22) {
    // evening
    return "Set up tomorrow morning. Run, then deep work on thesis. Call mom Sunday.";
  }
  // night
  return "Tomorrow: ship the demo. Deep work, light lunch, gym after. Sleep first.";
}

// Type the prefill character-by-character once the section is in view.
function useTypewriter(target: string, start: boolean, perChar = 32) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!start) return;
    setText("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setText(targetRef.current.slice(0, i));
      if (i >= targetRef.current.length) {
        clearInterval(id);
        setDone(true);
      }
    }, perChar);
    return () => clearInterval(id);
  }, [start, perChar]);

  return { text, done };
}

export default function BrainDumpDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });

  // time-aware prefill picked after mount to avoid SSR mismatch
  const [prefill, setPrefill] = useState<string>(FALLBACK_PREFILL);
  useEffect(() => {
    setPrefill(prefillForHour(new Date().getHours()));
  }, []);

  const { text: typed, done: typedDone } = useTypewriter(prefill, inView);
  const [text, setText] = useState(""); // user-controlled (after typing finishes)
  const [userTouched, setUserTouched] = useState(false);
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [revealCount, setRevealCount] = useState(0);

  // After typing completes, hand off to user-editable state and reveal blocks one-by-one.
  useEffect(() => {
    if (typedDone && !userTouched) setText(prefill);
  }, [typedDone, userTouched]);

  // Parse on text change with a small debounce.
  useEffect(() => {
    if (!text.trim()) {
      setBlocks([]);
      setRevealCount(0);
      return;
    }
    const t = setTimeout(() => {
      const next = parseDump(text);
      setBlocks(next);
      setRevealCount(0);
    }, 600);
    return () => clearTimeout(t);
  }, [text]);

  // Sequential reveal — increment count every 350ms until all blocks are placed.
  useEffect(() => {
    if (blocks.length === 0) return;
    if (revealCount >= blocks.length) return;
    const id = setTimeout(() => setRevealCount((c) => c + 1), 350);
    return () => clearTimeout(id);
  }, [blocks, revealCount]);

  const seedHref = useMemo(
    () => `/dashboard?seed=${encodeURIComponent(text || prefill)}`,
    [text, prefill]
  );

  const isBuilding = revealCount < blocks.length;
  const visibleBlocks = blocks.slice(0, revealCount);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#1C1A17] py-32 overflow-hidden"
    >
      {/* warm radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 500px at 50% 50%, rgba(212,119,90,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.95, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-3 uppercase"
        >
          try me.
        </motion.p>

        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[#FAF8F4] text-[24px] md:text-[30px] font-light tracking-[-0.4px] mb-12 max-w-2xl"
        >
          Type a brain dump.{" "}
          <em className="not-italic text-[#D4775A] font-medium">Watch your day form.</em>
        </motion.h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Brain dump pad — typewriter reveal then editable */}
          <div>
            <div className="relative group">
              <div
                className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(212,119,90,0.18), rgba(224,157,92,0.10) 50%, rgba(107,127,181,0.12))",
                  filter: "blur(16px)",
                }}
              />
              {!userTouched && !typedDone ? (
                <div
                  className="relative w-full bg-[#1A1815] border border-white/10 rounded-xl p-5 text-[#FAF8F4] text-[16px] font-light leading-relaxed min-h-[170px] whitespace-pre-wrap"
                >
                  {typed}
                  <span className="inline-block w-[2px] h-[18px] ml-0.5 align-middle bg-[#D4775A] animate-pulse" />
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => {
                    setUserTouched(true);
                    setText(e.target.value);
                  }}
                  placeholder="Tell me what's on your mind..."
                  rows={7}
                  className="relative w-full bg-[#1A1815] border border-white/10 rounded-xl p-5 text-[#FAF8F4] text-[16px] font-light leading-relaxed resize-none focus:outline-none focus:border-[#D4775A]/55 focus:ring-2 focus:ring-[#D4775A]/20 transition-all placeholder:text-[#FAF8F4]/30"
                />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono tracking-[1px] uppercase">
              <span className="text-[#FAF8F4]/45">
                {blocks.length} block{blocks.length === 1 ? "" : "s"} · live preview
              </span>
              <span className="text-[#FAF8F4]/35">{text.length} chars</span>
            </div>
          </div>

          {/* Live schedule preview — sequential reveal */}
          <div
            className="glass-card relative rounded-2xl p-5 min-h-[280px]"
            style={{ borderColor: "rgba(212,119,90,0.22)" }}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/55">
                <span className="text-[#D4775A]">▦</span>
                <span>today · mock · demo</span>
              </div>
              <span
                className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[1.5px] transition-colors"
                style={{ color: isBuilding ? "#E09D5C" : "#4A7B6B" }}
              >
                <span
                  className="block w-[5px] h-[5px] rounded-full"
                  style={{
                    background: isBuilding ? "#E09D5C" : "#4A7B6B",
                    boxShadow: isBuilding ? "0 0 10px #E09D5C" : "0 0 8px #4A7B6B",
                    animation: "bd-pulse 1.4s ease-in-out infinite",
                  }}
                />
                {isBuilding ? "building" : "live"}
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {visibleBlocks.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  className="text-[#FAF8F4]/40 text-[13px] italic font-light text-center py-12"
                >
                  Waiting for input…
                </motion.div>
              ) : (
                visibleBlocks.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="relative flex items-center gap-3 mb-2 rounded-lg px-3 py-2.5 text-[13px]"
                    style={{
                      borderLeft: `2px solid ${b.color}`,
                      background: `linear-gradient(90deg, ${b.color}28, ${b.color}10 60%, transparent)`,
                      color: "#FAF8F4",
                    }}
                  >
                    {/* glow halo on appear */}
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.55, 0] }}
                      transition={{ duration: 1.4, ease: "easeOut" }}
                      style={{
                        background: `radial-gradient(circle, ${b.color}55, transparent 70%)`,
                      }}
                    />
                    <span className="relative text-[#FAF8F4]/55 font-mono w-24 shrink-0 text-[10.5px]">
                      {b.time}
                    </span>
                    <span className="relative flex-1 font-light leading-snug">
                      {b.label}
                    </span>
                    <span className="relative text-[#FAF8F4]/40 text-[10px] font-mono">
                      {b.durationMin}m
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* footer status */}
            {blocks.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[1.5px] text-[#FAF8F4]/45">
                <span>
                  <span className="text-[#E09D5C] tabular-nums">{visibleBlocks.length}</span>
                  <span className="text-[#FAF8F4]/35"> / {blocks.length} placed</span>
                </span>
                <span className="text-[#FAF8F4]/30">v1 · solver</span>
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-[#FAF8F4]/55 text-[14px] italic font-light text-center mt-16 max-w-2xl mx-auto">
          That&apos;s it. That&apos;s the demo. The rest is just running it for years.
        </p>

        <div className="text-center mt-8">
          <Link
            href={seedHref}
            className="inline-block text-[#D4775A] hover:text-[#E09D5C] text-[15px] font-medium tracking-[0.5px] transition-colors"
          >
            begin →
          </Link>
        </div>
      </div>

      <style>{`@keyframes bd-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </section>
  );
}
