"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * "I notice." — live cognition scene.
 *
 * Two-column composition:
 *   LEFT: animated insight ("87 decisions" counts up; "All cost you." pulses;
 *         a personality line lands after the main thought) over a warm
 *         radial glow with ambient signal fragments drifting in the background.
 *   RIGHT: "constructing today" panel — schedule blocks materialize one-by-one,
 *          each tagged PREDICTED / OPTIMIZED / ADJUSTED with a palette-tinted
 *          badge and a brief glow halo on appear. A running "decisions absorbed"
 *          counter ticks up as blocks arrive.
 *
 * Cause→effect is implied by 3 slow particles drifting from the insight area
 * toward the schedule panel: decisions → fatigue → system takes over.
 *
 * Motion philosophy: slow, calm, inevitable. Nothing flashy.
 */

const FRAGMENTS = [
  { text: "meeting?", x: 8, y: 14, blur: true, rotate: -3 },
  { text: "delay?", x: 78, y: 22, blur: false, rotate: 2 },
  { text: "low energy", x: 18, y: 76, blur: true, rotate: -1 },
  { text: "9:23", x: 88, y: 10, blur: false, rotate: 0 },
  { text: "11:47", x: 4, y: 44, blur: false, rotate: 0 },
  { text: "skip?", x: 70, y: 88, blur: true, rotate: 4 },
  { text: "morning fog", x: 48, y: 6, blur: true, rotate: -2 },
  { text: "is this important?", x: 38, y: 92, blur: true, rotate: -1 },
  { text: "deep work", x: 92, y: 60, blur: false, rotate: 1 },
  { text: "later?", x: 14, y: 30, blur: true, rotate: 2 },
];

type Predicted = {
  time: string;
  label: string;
  state: "PREDICTED" | "OPTIMIZED" | "ADJUSTED";
  color: string;
};
const PREDICTED: Predicted[] = [
  { time: "08:30", label: "Quiet start · email triage", state: "PREDICTED", color: "#D4775A" },
  { time: "10:00", label: "Deep work · before fatigue peaks", state: "OPTIMIZED", color: "#E09D5C" },
  { time: "12:00", label: "Lunch · light, away from desk", state: "PREDICTED", color: "#4A7B6B" },
  { time: "14:30", label: "Easy admin · post-lunch dip", state: "ADJUSTED", color: "#6B7FB5" },
  { time: "16:00", label: "Second wind · creative work", state: "OPTIMIZED", color: "#E09D5C" },
];

const STATE_STYLE: Record<Predicted["state"], { fg: string; bg: string; border: string }> = {
  PREDICTED: { fg: "#D4775A", bg: "rgba(212,119,90,0.14)", border: "rgba(212,119,90,0.4)" },
  OPTIMIZED: { fg: "#E09D5C", bg: "rgba(224,157,92,0.16)", border: "rgba(224,157,92,0.42)" },
  ADJUSTED: { fg: "#6B7FB5", bg: "rgba(107,127,181,0.16)", border: "rgba(107,127,181,0.42)" },
};

/** Eased count-up to a target number once `start` is true. */
function useAnimatedCount(target: number, durationMs: number, start: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, durationMs]);
  return n;
}

export default function ProblemNotice() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const decisionCount = useAnimatedCount(87, 1400, inView);

  // "decisions absorbed" — visibly increments as schedule blocks materialize.
  const [absorbed, setAbsorbed] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setAbsorbed((p) => Math.min(87, p + Math.floor(Math.random() * 6) + 9));
      if (i >= PREDICTED.length + 1) clearInterval(id);
    }, 700);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#1C1A17] py-32 md:py-40 overflow-hidden"
    >
      {/* warm radial glow centered behind the insight column */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 900px 600px at 30% 50%, rgba(212,119,90,0.14) 0%, rgba(212,119,90,0.04) 35%, transparent 70%)",
        }}
      />

      {/* ambient signal fragments — faint, drifting */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {FRAGMENTS.map((f, i) => (
          <span
            key={i}
            className="absolute font-mono text-[#FAF8F4] select-none"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              fontSize: 11,
              opacity: 0,
              filter: f.blur ? "blur(0.6px)" : undefined,
              transform: `rotate(${f.rotate}deg)`,
              animation: `pn-frag ${48 + i * 5}s ease-in-out ${i * 3}s infinite`,
            }}
          >
            {f.text}
          </span>
        ))}
      </div>

      {/* cause→effect: subtle particles drifting from left text to right panel */}
      <div aria-hidden className="absolute inset-0 pointer-events-none hidden lg:block">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              top: `${48 + i * 3}%`,
              width: 4,
              height: 4,
              background: i === 1 ? "#E09D5C" : "#D4775A",
              boxShadow: `0 0 10px ${i === 1 ? "#E09D5C" : "#D4775A"}`,
              animation: `pn-flow ${11 + i * 2}s linear ${i * 3 + 2}s infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
        {/* LEFT — live cognition */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 0.95, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.6 }}
            className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-8 flex items-center gap-2.5 uppercase"
          >
            <span
              className="block w-[6px] h-[6px] rounded-full bg-[#D4775A]"
              style={{ boxShadow: "0 0 12px #D4775A", animation: "glow-pulse 2.4s ease-in-out infinite" }}
            />
            i notice.
          </motion.p>

          <h2 className="text-[#FAF8F4] text-[34px] md:text-[44px] font-light leading-[1.15] tracking-[-0.6px] mb-8">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="block"
            >
              You make about{" "}
              <motion.span
                className="relative inline-block text-[#E09D5C] font-medium tabular-nums"
                animate={
                  inView
                    ? {
                        textShadow: [
                          "0 0 0 rgba(224,157,92,0)",
                          "0 0 30px rgba(224,157,92,0.55)",
                          "0 0 14px rgba(224,157,92,0.3)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2.4, delay: 0.6 }}
              >
                {decisionCount} decisions
              </motion.span>{" "}
              before noon.
            </motion.span>

            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="block"
            >
              Most are tiny.{" "}
              <motion.span
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 1.5, duration: 0.7 }}
                className="text-[#D4775A] font-medium relative"
                style={{ textShadow: "0 0 18px rgba(212,119,90,0.35)" }}
              >
                All cost you.
              </motion.span>
            </motion.span>
          </h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 0.5 } : {}}
            transition={{ delay: 1.9, duration: 0.6 }}
            className="text-[#FAF8F4]/55 text-[14px] md:text-[15px] italic font-light mb-12 max-w-md"
          >
            (That&apos;s why your big ones feel hard by 4 p.m.)
          </motion.p>

          {/* personality line — Jarvis takes over */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.4, duration: 0.8 }}
            className="flex items-start gap-3 pt-7 border-t border-white/5 max-w-md"
          >
            <span
              className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B] mt-1.5 flex-shrink-0"
              style={{ boxShadow: "0 0 10px #4A7B6B", animation: "glow-pulse 1.8s ease-in-out infinite" }}
            />
            <p className="text-[#FAF8F4] text-[15px] md:text-[16px] font-light leading-snug">
              <span className="text-[#D4775A] font-medium">I already accounted for them.</span>{" "}
              <span className="text-[#FAF8F4]/55 italic">You won&apos;t need to.</span>
            </p>
          </motion.div>
        </div>

        {/* RIGHT — constructing today */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="glass-card relative rounded-2xl p-5"
          style={{ borderColor: "rgba(212,119,90,0.22)" }}
        >
          {/* corner sheen */}
          <div
            aria-hidden
            className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-tr-2xl"
            style={{
              background:
                "radial-gradient(circle at 100% 0%, rgba(212,119,90,0.18) 0%, transparent 60%)",
            }}
          />

          {/* header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 relative">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/65">
              <span className="text-[#D4775A]">▦</span>
              <span>constructing today</span>
            </div>
            <span className="flex items-center gap-1.5 text-[#4A7B6B] text-[10px] font-mono uppercase tracking-[1.5px]">
              <span
                className="block w-[5px] h-[5px] rounded-full bg-[#4A7B6B]"
                style={{ boxShadow: "0 0 8px #4A7B6B", animation: "glow-pulse 1.6s ease-in-out infinite" }}
              />
              live
            </span>
          </div>

          {/* blocks materialize one-by-one */}
          {PREDICTED.map((b, i) => {
            const meta = STATE_STYLE[b.state];
            const delay = 0.9 + i * 0.55;
            return (
              <motion.div
                key={b.time}
                initial={{ opacity: 0, x: -10 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay, duration: 0.55, ease: "easeOut" }}
                className="relative flex items-center gap-3 mb-2 rounded-lg px-3 py-2.5 text-[12px]"
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
                  animate={inView ? { opacity: [0, 0.55, 0] } : {}}
                  transition={{ delay, duration: 1.6 }}
                  style={{
                    background: `radial-gradient(circle, ${b.color}55, transparent 70%)`,
                  }}
                />
                <span className="relative text-[#FAF8F4]/55 font-mono w-14 shrink-0 text-[10.5px]">
                  {b.time}
                </span>
                <span className="relative flex-1 font-light leading-snug">{b.label}</span>
                <span
                  className="relative text-[9px] uppercase tracking-[1px] font-mono px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: meta.bg,
                    color: meta.fg,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  {b.state}
                </span>
              </motion.div>
            );
          })}

          {/* footer — running absorbed counter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 4.0, duration: 0.7 }}
            className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[1.5px] text-[#FAF8F4]/45"
          >
            <span>
              <span className="text-[#E09D5C] tabular-nums">{absorbed}</span>
              <span className="text-[#FAF8F4]/35"> of 87 decisions absorbed</span>
            </span>
            <span className="text-[#FAF8F4]/30">v1 · solver</span>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @keyframes pn-frag {
          0%   { transform: translate(0, 0); opacity: 0; }
          15%  { opacity: 0.18; }
          50%  { transform: translate(10px, -14px); opacity: 0.22; }
          85%  { opacity: 0.18; }
          100% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes pn-flow {
          0%   { left: 38%; opacity: 0; }
          12%  { opacity: 0.85; }
          85%  { opacity: 0.85; }
          100% { left: 64%; opacity: 0; }
        }
      `}</style>
    </section>
  );
}
