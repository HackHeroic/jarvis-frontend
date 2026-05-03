"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PROMPTS = [
  "Prepare for ML competition by Friday…",
  "Cram for finals next week…",
  "Set up a workout habit again…",
  "Plan a focused thesis week…",
];

const SIGNALS = [
  { id: "txt", from: "iMessage · Sara", body: "Surprise dinner @ 8?", color: "#6B7FB5" },
  { id: "cal", from: "Calendar", body: "Prof meeting → 3pm", color: "#D4775A" },
  { id: "slk", from: "Slack · #ml-team", body: "Deadline → Wed", color: "#4A7B6B" },
];

type TimeBlock = { time: string; label: string; color: string };

/**
 * Generate a 4-block mini-schedule starting from the next round hour after now.
 * Different label sets for morning / afternoon / evening / night.
 * Pure on `hour` so component stays referentially-transparent post-mount.
 */
function buildBlocksFor(hour: number): TimeBlock[] {
  const fmt = (h: number, m = 0) => {
    const hh = ((h % 24) + 24) % 24;
    return `${hh}:${m.toString().padStart(2, "0")}`;
  };
  // bucket
  if (hour >= 5 && hour < 12) {
    // morning
    const start = Math.max(hour + 1, 9);
    return [
      { time: fmt(start), label: "Deep work · CNNs", color: "#D4775A" },
      { time: fmt(start + 2, 30), label: "Gym (45m)", color: "#4A7B6B" },
      { time: fmt(start + 4), label: "Lunch w/ Mira", color: "#6B7FB5" },
      { time: fmt(start + 6), label: "Backprop study", color: "#D4775A" },
    ];
  }
  if (hour >= 12 && hour < 17) {
    // afternoon — salvage what's left
    const start = hour + 1;
    return [
      { time: fmt(start), label: "Deep work · finalize ML deck", color: "#D4775A" },
      { time: fmt(start + 1, 30), label: "Quick walk (15m)", color: "#4A7B6B" },
      { time: fmt(start + 2), label: "Office hours · prof", color: "#6B7FB5" },
      { time: fmt(start + 4), label: "Reading · backprop", color: "#D4775A" },
    ];
  }
  if (hour >= 17 && hour < 22) {
    // evening — set up tomorrow morning
    return [
      { time: "Tomorrow 7:00", label: "Run + shower", color: "#4A7B6B" },
      { time: "Tomorrow 9:00", label: "Deep work · thesis", color: "#D4775A" },
      { time: "Tomorrow 11:30", label: "Coffee w/ Mira", color: "#6B7FB5" },
      { time: "Tomorrow 14:00", label: "Demo prep", color: "#D4775A" },
    ];
  }
  // night
  return [
    { time: "Tomorrow 9:00", label: "Ship the demo", color: "#D4775A" },
    { time: "Tomorrow 12:00", label: "Lunch · light", color: "#4A7B6B" },
    { time: "Tomorrow 14:30", label: "Easy admin · post-lunch", color: "#6B7FB5" },
    { time: "Tomorrow 16:00", label: "Second wind · review", color: "#D4775A" },
  ];
}

/**
 * 3D-feel copper orb composed of stacked layers:
 *  - outer halo (soft radial glow, breathing)
 *  - mid ring (rotating conic gradient — gives 3D shading illusion)
 *  - inner ring (counter-rotating conic gradient)
 *  - core sphere (radial gradient with terra → gold core, glossy specular highlight)
 *  - 3 orbiting nodes on different axes
 * No external 3D dep — pure CSS + SVG.
 */
function JarvisOrb({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{ animation: "orb-float 7s ease-in-out infinite" }}
      aria-hidden="true"
    >
      {/* outermost halo glow */}
      <div
        className="absolute inset-[-20%] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(212,119,90,0.32) 0%, rgba(212,119,90,0.12) 35%, transparent 65%)",
          filter: "blur(20px)",
          animation: "glow-pulse 4.5s ease-in-out infinite",
        }}
      />

      {/* outer rotating ring — conic gradient gives subtle shimmer like rim-light */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(212,119,90,0.0) 0deg, rgba(224,157,92,0.45) 90deg, rgba(212,119,90,0.05) 180deg, rgba(224,157,92,0.35) 270deg, rgba(212,119,90,0.0) 360deg)",
          maskImage:
            "radial-gradient(circle, transparent 62%, black 64%, black 70%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 62%, black 64%, black 70%, transparent 72%)",
          animation: "orb-rotate-slow 18s linear infinite",
        }}
      />

      {/* mid ring — counter-rotating */}
      <div
        className="absolute inset-[8%] rounded-full"
        style={{
          background:
            "conic-gradient(from 90deg, rgba(107,127,181,0.0) 0deg, rgba(107,127,181,0.25) 60deg, rgba(212,119,90,0.0) 130deg, rgba(74,123,107,0.22) 220deg, rgba(212,119,90,0.0) 320deg)",
          maskImage:
            "radial-gradient(circle, transparent 58%, black 60%, black 66%, transparent 68%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 58%, black 60%, black 66%, transparent 68%)",
          animation: "orb-rotate-rev 26s linear infinite",
        }}
      />

      {/* inner core sphere — radial gradient with hot terra → gold center,
          plus a gloss specular dot for the "ball" feel */}
      <div
        className="absolute inset-[18%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 38% 32%, #ffd9b8 0%, #E09D5C 18%, #D4775A 38%, #8a3d27 70%, #2C1A12 100%)",
          boxShadow:
            "inset -16px -22px 60px rgba(0,0,0,0.55), inset 12px 14px 40px rgba(255,210,160,0.35), 0 30px 60px rgba(0,0,0,0.55), 0 0 80px rgba(212,119,90,0.55)",
          animation: "orb-breathe 5.5s ease-in-out infinite",
        }}
      />

      {/* glossy specular highlight */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: "28%",
          top: "22%",
          width: "22%",
          height: "14%",
          background:
            "radial-gradient(ellipse, rgba(255,235,210,0.55) 0%, rgba(255,235,210,0.0) 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* faint inner network (suggests neural activity) */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-[24%] opacity-25 mix-blend-screen"
        fill="none"
      >
        <line x1="60" y1="60" x2="140" y2="60" stroke="#FAF8F4" strokeWidth="0.8" />
        <line x1="140" y1="60" x2="160" y2="120" stroke="#FAF8F4" strokeWidth="0.8" />
        <line x1="160" y1="120" x2="100" y2="160" stroke="#FAF8F4" strokeWidth="0.8" />
        <line x1="100" y1="160" x2="40" y2="120" stroke="#FAF8F4" strokeWidth="0.8" />
        <line x1="40" y1="120" x2="60" y2="60" stroke="#FAF8F4" strokeWidth="0.8" />
        <line x1="60" y1="60" x2="100" y2="100" stroke="#FAF8F4" strokeWidth="0.6" />
        <line x1="140" y1="60" x2="100" y2="100" stroke="#FAF8F4" strokeWidth="0.6" />
        <circle cx="60" cy="60" r="2.5" fill="#FAF8F4" />
        <circle cx="140" cy="60" r="2.5" fill="#FAF8F4" />
        <circle cx="160" cy="120" r="2" fill="#FAF8F4" />
        <circle cx="100" cy="160" r="2.5" fill="#FAF8F4" />
        <circle cx="40" cy="120" r="2" fill="#FAF8F4" />
        <circle cx="100" cy="100" r="3" fill="#FAF8F4" />
      </svg>

      {/* three orbiting particles on different inclinations */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 pointer-events-none"
          style={{
            animation: `orb-rotate-slow ${10 + i * 4}s linear infinite`,
            animationDelay: `${i * -2}s`,
            transform: i === 1 ? "rotateX(24deg)" : i === 2 ? "rotateY(28deg)" : undefined,
          }}
        >
          <div
            className="absolute"
            style={{
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: ["#E09D5C", "#D4775A", "#FAF8F4"][i],
              boxShadow: `0 0 14px ${["#E09D5C", "#D4775A", "#FAF8F4"][i]}`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Smooth typing placeholder — types current target then deletes when cycling.
function useSmoothPlaceholder(targets: string[], hold = 2400, perChar = 36) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");
  const targetRef = useRef("");
  targetRef.current = targets[idx] ?? "";

  useEffect(() => {
    if (phase === "typing") {
      if (text.length < targetRef.current.length) {
        const t = setTimeout(() => setText(targetRef.current.slice(0, text.length + 1)), perChar);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("hold"), hold);
      return () => clearTimeout(t);
    }
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("deleting"), 200);
      return () => clearTimeout(t);
    }
    if (phase === "deleting") {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), perChar / 2);
        return () => clearTimeout(t);
      }
      setIdx((i) => (i + 1) % targets.length);
      setPhase("typing");
      return;
    }
  }, [text, phase, hold, perChar, targets.length]);

  return text;
}

export default function HeroLivingPlan() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeSignal, setActiveSignal] = useState(0);
  const [draft, setDraft] = useState("");
  const placeholder = useSmoothPlaceholder(PROMPTS);

  // Time-aware schedule — populated after mount to avoid SSR hydration mismatch.
  // Default to a reasonable static set so the schedule is never empty.
  const [blocks, setBlocks] = useState<TimeBlock[]>([
    { time: "9:00", label: "Deep work · CNNs", color: "#D4775A" },
    { time: "11:30", label: "Gym (45m)", color: "#4A7B6B" },
    { time: "13:00", label: "Lunch w/ Mira", color: "#6B7FB5" },
    { time: "15:00", label: "Backprop study", color: "#D4775A" },
  ]);
  useEffect(() => {
    setBlocks(buildBlocksFor(new Date().getHours()));
  }, []);

  // mouse-tracking aurora parallax (-1 to +1 in each axis)
  const [mp, setMp] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const r = sectionRef.current.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      setMp({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActiveSignal((p) => (p + 1) % SIGNALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  // Particle handoff — each time the active signal changes, fire a single
  // particle from the active signal card → orb → schedule. Tracked by a
  // monotonically increasing key so motion replays on each change.
  const [handoffKey, setHandoffKey] = useState(0);
  useEffect(() => {
    setHandoffKey((k) => k + 1);
  }, [activeSignal]);

  // Headline split into words for the staggered reveal
  const HEAD_LINE_1 = ["I", "think", "about", "your", "day", "before", "you", "do."];
  const HEAD_LINE_2 = ["Then", "I", "handle", "it", "before", "you", "ask."];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center bg-[#1C1A17] overflow-hidden"
    >
      {/* aurora background — subtly tracks cursor with parallax */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-40 transition-transform duration-[800ms] ease-out"
          style={{
            background: [
              "radial-gradient(ellipse 700px 500px at 18% 50%, rgba(212,119,90,0.22) 0%, transparent 70%)",
              "radial-gradient(ellipse 600px 600px at 78% 30%, rgba(107,127,181,0.18) 0%, transparent 70%)",
              "radial-gradient(ellipse 500px 380px at 60% 85%, rgba(74,123,107,0.16) 0%, transparent 70%)",
            ].join(", "),
            animation: "aurora-drift 18s ease-in-out infinite",
            transform: `translate(${mp.x * 18}px, ${mp.y * 12}px)`,
          }}
        />
      </div>

      {/* universe echo: sparse star field (15 deterministic dots) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 15 }).map((_, i) => {
          const x = (i * 23.7) % 100;
          const y = (i * 37.3) % 100;
          const sz = i % 3 === 0 ? 2 : 1;
          const delay = (i * 0.31) % 4;
          const dur = 3.2 + ((i * 0.27) % 2.4);
          const tone = i % 4 === 0 ? "#E09D5C" : i % 5 === 0 ? "#FAF8F4" : "#D4775A";
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                width: sz,
                height: sz,
                borderRadius: "50%",
                background: tone,
                boxShadow: `0 0 ${sz * 3}px ${tone}`,
                opacity: 0.35,
                animation: `hero-star ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* universe echo: faint perspective grid hint at the bottom */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden hidden md:block"
        style={{
          height: "40%",
          perspective: 800,
          opacity: 0.3,
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "rotateX(64deg) translateY(28%) translateZ(-200px)",
            transformOrigin: "50% 100%",
            backgroundImage:
              "linear-gradient(0deg, rgba(212,119,90,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(212,119,90,0.22) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
            animation: "hero-grid-move 28s linear infinite",
          }}
        />
      </div>

      {/* universe echo: a single very dim wireframe dodecahedron drifting behind the orb */}
      <div
        aria-hidden
        className="absolute pointer-events-none hidden lg:block"
        style={{
          right: "8%",
          top: "44%",
          transform: "translateY(-50%)",
          opacity: 0.08,
          animation: "hero-dodec-spin 40s linear infinite, hero-dodec-float 14s ease-in-out infinite",
        }}
      >
        <svg width={420} height={420} viewBox="0 0 420 420">
          {(() => {
            const pts: string[] = [];
            const r = 200;
            const cx = 210;
            const cy = 210;
            for (let i = 0; i < 10; i++) {
              const a = (i * Math.PI * 2) / 10;
              const rr = i % 2 === 0 ? r : r * 0.62;
              pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
            }
            return (
              <>
                <polygon
                  points={pts.join(" ")}
                  fill="none"
                  stroke="#D4775A"
                  strokeWidth={0.8}
                  strokeLinejoin="round"
                />
                <circle cx={cx} cy={cy} r={r * 0.35} fill="none" stroke="#D4775A" strokeWidth={0.6} opacity={0.7} />
                <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke="#D4775A" strokeWidth={0.5} opacity={0.5} />
                {pts.map((p, i) => {
                  const [x, y] = p.split(",").map(Number);
                  return (
                    <line
                      key={i}
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                      stroke="#D4775A"
                      strokeWidth={0.3}
                      opacity={0.4}
                    />
                  );
                })}
              </>
            );
          })()}
        </svg>
      </div>

      {/* faint vignette to focus the eye */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-16 pt-28 pb-20 items-center">
        {/* Left column */}
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.95, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-6 flex items-center gap-2.5 uppercase"
          >
            <span
              className="block w-[7px] h-[7px] rounded-full bg-[#4A7B6B]"
              style={{
                boxShadow: "0 0 14px #4A7B6B, 0 0 4px #4A7B6B",
                animation: "glow-pulse 1.6s ease-in-out infinite",
              }}
            />
            jarvis · running
          </motion.p>

          <h1 className="text-[#FAF8F4] text-[44px] md:text-[60px] font-light leading-[1.04] tracking-[-1.4px] mb-6">
            <span className="block">
              {HEAD_LINE_1.map((w, i) => (
                <motion.span
                  key={`l1-${i}`}
                  initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: "easeOut" }}
                  className="inline-block mr-[0.28em]"
                  style={
                    w === "before"
                      ? {
                          color: "#D4775A",
                          fontWeight: 500,
                        }
                      : undefined
                  }
                >
                  {w}
                </motion.span>
              ))}
            </span>
            <span className="block text-[#FAF8F4]/85">
              {HEAD_LINE_2.map((w, i) => (
                <motion.span
                  key={`l2-${i}`}
                  initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, delay: 0.85 + i * 0.06, ease: "easeOut" }}
                  className="inline-block mr-[0.28em]"
                >
                  {w}
                </motion.span>
              ))}
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.55, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-[#FAF8F4]/55 text-[16px] font-light leading-relaxed max-w-lg mb-10"
          >
            An intelligence that captures, decomposes, schedules, listens, and remembers — quietly, in the background, while your day unfolds.
          </motion.p>

          {/* Polished input */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative mb-6 group"
          >
            <div
              className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,119,90,0.18), rgba(224,157,92,0.10) 50%, rgba(107,127,181,0.12))",
                filter: "blur(16px)",
              }}
            />
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder + (placeholder.length > 0 ? "▍" : "")}
              className="relative w-full bg-[#1A1815] border border-white/10 rounded-xl px-5 py-4 pr-14 text-[#FAF8F4] text-[15px] font-light focus:outline-none focus:border-[#D4775A]/60 focus:ring-2 focus:ring-[#D4775A]/20 transition-all placeholder:text-[#FAF8F4]/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  window.location.href = `/dashboard?seed=${encodeURIComponent(draft)}`;
                }
              }}
            />
            <Link
              href={draft.trim() ? `/dashboard?seed=${encodeURIComponent(draft)}` : "/dashboard"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D4775A] hover:text-[#E09D5C] hover:bg-[#D4775A]/10 text-[16px] font-medium px-3 py-2 rounded-lg transition-colors"
              aria-label="begin"
            >
              →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-[#FAF8F4]/45 text-[13px] font-light italic"
          >
            I&apos;m not waiting for you to start.
          </motion.p>
        </div>

        {/* Right column — Orb + floating cards composition */}
        <div className="relative h-[520px] hidden lg:block">
          {/* The orb sits as the visual anchor */}
          <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[420px] h-[420px]">
            <JarvisOrb className="w-full h-full" />
          </div>

          {/* Particle handoff — fires from active signal card → orb → schedule */}
          <motion.span
            key={`handoff-in-${handoffKey}`}
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            initial={{
              left: "12%",
              top: ["18%", "54%", "84%"][activeSignal],
              opacity: 0,
              scale: 0.6,
            }}
            animate={{
              left: ["12%", "55%"],
              top: [["18%", "54%", "84%"][activeSignal], "50%"],
              opacity: [0, 1, 0.85],
              scale: [0.6, 1.1, 0.9],
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{
              width: 7,
              height: 7,
              background: SIGNALS[activeSignal].color,
              boxShadow: `0 0 14px ${SIGNALS[activeSignal].color}`,
              zIndex: 5,
            }}
          />
          <motion.span
            key={`handoff-out-${handoffKey}`}
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            initial={{ left: "55%", top: "50%", opacity: 0, scale: 0.6 }}
            animate={{
              left: ["55%", "78%"],
              top: ["50%", "92%"],
              opacity: [0, 0.95, 0],
              scale: [0.6, 1, 0.7],
            }}
            transition={{ duration: 0.9, ease: "easeIn", delay: 0.6 }}
            style={{
              width: 6,
              height: 6,
              background: "#E09D5C",
              boxShadow: "0 0 12px #E09D5C",
              zIndex: 5,
            }}
          />

          {/* Orb pulse on signal change */}
          <motion.span
            key={`orb-pulse-${handoffKey}`}
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.55, 0], scale: [0.6, 1.25, 1.4] }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.7 }}
            style={{
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 280,
              height: 280,
              background:
                "radial-gradient(circle, rgba(212,119,90,0.45), transparent 60%)",
              filter: "blur(8px)",
              zIndex: 1,
            }}
          />

          {/* Floating signal cards orbit around the orb */}
          {SIGNALS.map((s, i) => {
            const isActive = i === activeSignal;
            const positions = [
              { top: "8%", left: "0%" },
              { top: "44%", left: "-6%" },
              { top: "78%", left: "4%" },
            ];
            return (
              <motion.div
                key={s.id}
                animate={{
                  opacity: isActive ? 1 : 0.55,
                  scale: isActive ? 1.04 : 0.96,
                  y: isActive ? -4 : 0,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="glass-card absolute w-[230px] rounded-xl p-3.5"
                style={{
                  ...positions[i],
                  borderColor: isActive ? `${s.color}88` : "rgba(255,255,255,0.08)",
                  boxShadow: isActive
                    ? `0 12px 32px rgba(0,0,0,0.4), 0 0 36px ${s.color}55, inset 0 1px 0 rgba(255,255,255,0.06)`
                    : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="block w-1.5 h-1.5 rounded-full"
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                  />
                  <span className="text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/55 font-mono">
                    {s.from}
                  </span>
                </div>
                <div className="text-[#FAF8F4] text-[13px] font-light leading-snug">
                  {s.body}
                </div>
              </motion.div>
            );
          })}

          {/* Mini schedule docked at bottom-right of orb composition */}
          <div
            className="glass-card absolute bottom-2 right-2 w-[270px] rounded-xl p-3.5"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="flex justify-between items-center mb-2.5 font-mono text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/55">
              <span>today · wed</span>
              <span className="flex items-center gap-1.5 text-[#4A7B6B]">
                <span
                  className="block w-[5px] h-[5px] rounded-full bg-[#4A7B6B]"
                  style={{
                    boxShadow: "0 0 8px #4A7B6B",
                    animation: "glow-pulse 1.6s ease-in-out infinite",
                  }}
                />
                live
              </span>
            </div>
            {blocks.map((b, i) => {
              const isMoved = i === activeSignal % blocks.length;
              return (
                <motion.div
                  key={b.label}
                  animate={{
                    x: isMoved ? 6 : 0,
                    backgroundColor: isMoved ? "rgba(224,157,92,0.18)" : `${b.color}1A`,
                    borderLeftColor: isMoved ? "#E09D5C" : b.color,
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="flex items-center gap-2 mb-1 rounded-md px-2.5 py-1.5 text-[11px] relative"
                  style={{
                    borderLeftWidth: "2px",
                    borderLeftStyle: "solid",
                    color: "#FAF8F4",
                  }}
                >
                  <span className="text-[#FAF8F4]/55 font-mono w-12 text-[10px]">{b.time}</span>
                  <span className="flex-1 truncate">{b.label}</span>
                  {isMoved ? (
                    <span className="text-[8px] uppercase tracking-[0.5px] font-mono text-[#E09D5C] bg-[#E09D5C]/15 px-1.5 py-0.5 rounded">
                      moved
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* mobile orb (smaller, below the text) */}
      <div className="lg:hidden absolute right-[-80px] bottom-[-80px] w-[260px] h-[260px] opacity-70 pointer-events-none">
        <JarvisOrb className="w-full h-full" />
      </div>

      {/* scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 pointer-events-none">
        <span className="text-[#FAF8F4]/35 text-[10px] font-mono tracking-[2px] uppercase">scroll</span>
        <svg
          className="w-4 h-4 text-[#FAF8F4]/30 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <style>{`
        @keyframes aurora-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-5%, 3%) scale(1.02); }
          66% { transform: translate(3%, -2%) scale(0.98); }
        }
        @keyframes hero-star {
          0%, 100% { opacity: 0.18; transform: scale(0.85); }
          50%      { opacity: 0.55; transform: scale(1.15); }
        }
        @keyframes hero-grid-move {
          from { background-position: 0 0; }
          to   { background-position: 0 70px; }
        }
        @keyframes hero-dodec-spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to   { transform: translateY(-50%) rotate(360deg); }
        }
        @keyframes hero-dodec-float {
          0%, 100% { translate: 0 0; }
          50%      { translate: 0 -16px; }
        }
      `}</style>
    </section>
  );
}
