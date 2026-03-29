"use client";

import Link from "next/link";
import { motion } from "motion/react";

const stagger = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i, duration: 0.6, ease: "easeOut" as const },
  }),
};

export default function Hero() {
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

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-16 pt-24 pb-16">
        {/* Text column */}
        <div className="flex-1 max-w-xl">
          <motion.p
            custom={0}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-[#D4775A] text-xs uppercase tracking-[2px] font-semibold mb-4"
          >
            AI-Powered Preparation Engine
          </motion.p>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-5xl md:text-[56px] font-extrabold leading-[1.1] text-[#FAF8F4] mb-6"
          >
            Your brain dump{" "}
            <span className="text-[#D4775A]">becomes your plan.</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-[#FAF8F4]/60 text-sm leading-relaxed mb-8 max-w-md"
          >
            Dump everything on your mind. Jarvis structures it into actionable
            schedules, adapts to your energy, and never makes you feel guilty for
            falling behind.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex items-center gap-4 mb-8"
          >
            <Link
              href="/dashboard"
              className="bg-[#D4775A] text-[#1C1A17] font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[#D4775A]/90 transition-colors"
            >
              Start for Free &rarr;
            </Link>
            <a
              href="#how-it-works"
              className="border border-[#FAF8F4]/20 text-[#FAF8F4] text-sm px-6 py-3 rounded-lg hover:border-[#FAF8F4]/40 transition-colors"
            >
              Watch Demo
            </a>
          </motion.div>

          <motion.p
            custom={4}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-[#FAF8F4]/40 text-xs"
          >
            Built for students, by a student.
          </motion.p>
        </div>

        {/* Brain orb */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-72 h-72 md:w-96 md:h-96">
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D4775A]/20 via-[#6B7FB5]/20 to-[#4A7B6B]/20 blur-3xl" />
            {/* Orb */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#D4775A]/30 via-[#6B7FB5]/20 to-[#4A7B6B]/30 border border-[#FAF8F4]/10">
              {/* Inner network SVG */}
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                fill="none"
              >
                {/* Lines */}
                <line x1="60" y1="60" x2="140" y2="60" stroke="#D4775A" strokeOpacity="0.4" strokeWidth="1" />
                <line x1="140" y1="60" x2="160" y2="120" stroke="#6B7FB5" strokeOpacity="0.4" strokeWidth="1" />
                <line x1="160" y1="120" x2="100" y2="160" stroke="#4A7B6B" strokeOpacity="0.4" strokeWidth="1" />
                <line x1="100" y1="160" x2="40" y2="120" stroke="#D4775A" strokeOpacity="0.4" strokeWidth="1" />
                <line x1="40" y1="120" x2="60" y2="60" stroke="#6B7FB5" strokeOpacity="0.4" strokeWidth="1" />
                <line x1="60" y1="60" x2="100" y2="100" stroke="#4A7B6B" strokeOpacity="0.3" strokeWidth="1" />
                <line x1="140" y1="60" x2="100" y2="100" stroke="#D4775A" strokeOpacity="0.3" strokeWidth="1" />
                <line x1="100" y1="100" x2="100" y2="160" stroke="#6B7FB5" strokeOpacity="0.3" strokeWidth="1" />
                {/* Nodes */}
                <circle cx="60" cy="60" r="5" fill="#D4775A" fillOpacity="0.8" />
                <circle cx="140" cy="60" r="5" fill="#6B7FB5" fillOpacity="0.8" />
                <circle cx="160" cy="120" r="4" fill="#4A7B6B" fillOpacity="0.8" />
                <circle cx="100" cy="160" r="5" fill="#D4775A" fillOpacity="0.8" />
                <circle cx="40" cy="120" r="4" fill="#6B7FB5" fillOpacity="0.8" />
                <circle cx="100" cy="100" r="6" fill="#FAF8F4" fillOpacity="0.6" />
              </svg>
            </div>

            {/* Orbiting particles */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  animation: `orbit ${8 + i * 2}s linear infinite`,
                  animationDelay: `${i * -1.5}s`,
                }}
              >
                <div
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: ["#D4775A", "#6B7FB5", "#4A7B6B", "#E09D5C", "#D4775A"][i],
                    opacity: 0.6,
                    boxShadow: `0 0 6px ${["#D4775A", "#6B7FB5", "#4A7B6B", "#E09D5C", "#D4775A"][i]}`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[#FAF8F4]/30 text-xs">Scroll</span>
        <svg
          className="w-5 h-5 text-[#FAF8F4]/30 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Orbit keyframes injected via style tag */}
      <style>{`
        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes aurora-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-5%, 3%) scale(1.02); }
          66% { transform: translate(3%, -2%) scale(0.98); }
        }
      `}</style>
    </section>
  );
}
