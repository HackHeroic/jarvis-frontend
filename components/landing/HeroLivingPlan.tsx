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
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: [
              "radial-gradient(ellipse 600px 400px at 20% 50%, #D4775A33 0%, transparent 70%)",
              "radial-gradient(ellipse 500px 500px at 70% 30%, #6B7FB533 0%, transparent 70%)",
              "radial-gradient(ellipse 400px 300px at 60% 80%, #4A7B6B33 0%, transparent 70%)",
            ].join(", "),
            animation: "aurora-drift 15s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 pt-24 pb-16 items-center">
        {/* Left column */}
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-6 flex items-center gap-2"
          >
            <span
              className="block w-[7px] h-[7px] rounded-full bg-[#4A7B6B]"
              style={{ boxShadow: "0 0 10px #4A7B6B", animation: "hero-livepulse 1.6s ease-in-out infinite" }}
            />
            jarvis · running
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="text-[#FAF8F4] text-[44px] md:text-[56px] font-light leading-[1.1] tracking-[-1.2px] mb-8"
          >
            I think about your day{" "}
            <em className="not-italic text-[#D4775A] font-medium">before</em> you do.
            <br />
            Then I handle it before you ask.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative mb-8"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={PROMPTS[promptIdx]}
              className="w-full bg-[#252320] border border-white/10 rounded-xl px-5 py-4 text-[#FAF8F4] text-[15px] font-light focus:outline-none focus:border-[#D4775A]/50 focus:ring-1 focus:ring-[#D4775A]/30 transition-colors placeholder:text-[#FAF8F4]/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  window.location.href = `/dashboard?seed=${encodeURIComponent(draft)}`;
                }
              }}
            />
            <Link
              href={draft.trim() ? `/dashboard?seed=${encodeURIComponent(draft)}` : "/dashboard"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4775A] hover:text-[#E09D5C] text-[14px] font-medium px-3 py-1 transition-colors"
              aria-label="begin"
            >
              →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-[#FAF8F4]/40 text-[13px] font-light italic"
          >
            Tell me what&apos;s on your mind.
          </motion.p>
        </div>

        {/* Right column — Living Plan */}
        <div className="grid grid-cols-2 gap-4 items-stretch">
          {/* Signal cards */}
          <div className="relative h-[360px]">
            {SIGNALS.map((s, i) => {
              const isActive = i === activeSignal;
              return (
                <motion.div
                  key={s.id}
                  animate={{
                    opacity: isActive ? 1 : 0.4,
                    scale: isActive ? 1.02 : 0.98,
                    y: i * 110,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute left-0 right-0 rounded-xl p-3 backdrop-blur-md"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${s.color}66`,
                    boxShadow: isActive ? `0 0 24px ${s.color}55` : "none",
                  }}
                >
                  <div className="text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/40 mb-1.5 font-mono">
                    {s.from}
                  </div>
                  <div className="text-[#FAF8F4] text-[13px] font-light leading-snug">
                    {s.body}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Schedule */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex justify-between items-center mb-3 font-mono text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/50">
              <span>today · wed</span>
              <span className="flex items-center gap-1.5 text-[#4A7B6B]">
                <span
                  className="block w-[5px] h-[5px] rounded-full bg-[#4A7B6B]"
                  style={{ animation: "hero-livepulse 1.6s ease-in-out infinite" }}
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
                    x: isMoved ? 8 : 0,
                    backgroundColor: isMoved ? "#E09D5C22" : `${b.color}1A`,
                    borderLeftColor: isMoved ? "#E09D5C" : b.color,
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="flex items-center gap-2 mb-1.5 rounded-md px-2.5 py-1.5 text-[11px] relative"
                  style={{ borderLeftWidth: "2px", borderLeftStyle: "solid", color: "#FAF8F4" }}
                >
                  <span className="text-[#FAF8F4]/55 font-mono w-12 text-[10px]">{b.time}</span>
                  <span className="flex-1">{b.label}</span>
                  {isMoved ? (
                    <span className="text-[8px] uppercase tracking-[0.5px] font-mono text-[#E09D5C]">
                      moved
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hero-livepulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes aurora-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-5%, 3%) scale(1.02); }
          66% { transform: translate(3%, -2%) scale(0.98); }
        }
      `}</style>
    </section>
  );
}
