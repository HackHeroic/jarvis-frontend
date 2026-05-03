"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
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

const BASE_BLOCKS = [
  { time: "9:00", label: "Deep work · CNNs", color: "#D4775A" },
  { time: "11:30", label: "Gym (45m)", color: "#4A7B6B" },
  { time: "13:00", label: "Lunch w/ Mira", color: "#6B7FB5" },
  { time: "15:00", label: "Backprop study", color: "#D4775A" },
];

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

export default function HeroLivingPlan() {
  const [activeSignal, setActiveSignal] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const id = setInterval(() => setActiveSignal((p) => (p + 1) % SIGNALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPromptIdx((p) => (p + 1) % PROMPTS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center bg-[#1C1A17] overflow-hidden">
      {/* aurora background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: [
              "radial-gradient(ellipse 700px 500px at 18% 50%, rgba(212,119,90,0.22) 0%, transparent 70%)",
              "radial-gradient(ellipse 600px 600px at 78% 30%, rgba(107,127,181,0.18) 0%, transparent 70%)",
              "radial-gradient(ellipse 500px 380px at 60% 85%, rgba(74,123,107,0.16) 0%, transparent 70%)",
            ].join(", "),
            animation: "aurora-drift 18s ease-in-out infinite",
          }}
        />
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

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
            className="text-[#FAF8F4] text-[44px] md:text-[60px] font-light leading-[1.04] tracking-[-1.4px] mb-6"
          >
            I think about your day{" "}
            <em className="not-italic text-[#D4775A] font-medium">before</em> you do.
            <br />
            <span className="text-[#FAF8F4]/85">Then I handle it before you ask.</span>
          </motion.h1>

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
              placeholder={PROMPTS[promptIdx]}
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
            Tell me what&apos;s on your mind.
          </motion.p>
        </div>

        {/* Right column — Orb + floating cards composition */}
        <div className="relative h-[520px] hidden lg:block">
          {/* The orb sits as the visual anchor */}
          <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[420px] h-[420px]">
            <JarvisOrb className="w-full h-full" />
          </div>

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
            {BASE_BLOCKS.map((b, i) => {
              const isMoved = i === activeSignal % BASE_BLOCKS.length;
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
      `}</style>
    </section>
  );
}
