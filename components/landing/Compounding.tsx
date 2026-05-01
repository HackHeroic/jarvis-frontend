"use client";

import { motion } from "motion/react";

const MILESTONES = [
  {
    label: "Day 1",
    quote: "I'm useful out of the box.",
    sub: "(architecture — integrated engine on day one)",
  },
  {
    label: "Month 3",
    quote: "I know your energy. Your habits. The mornings you skip and don't admit. I'm yours.",
    sub: "(data — personalization compounds)",
  },
  {
    label: "Year 1",
    quote: "Switching feels like starting over with a stranger.",
    sub: "(compounding — psychology + ambient layered)",
  },
];

export default function Compounding() {
  return (
    <section className="relative bg-[#1C1A17] py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-3 text-center"
        >
          i get better every day.
        </motion.p>

        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[#FAF8F4] text-[24px] md:text-[28px] font-light text-center max-w-2xl mx-auto mb-20"
        >
          Day one is good. <em className="not-italic text-[#D4775A] font-medium">By month three I&apos;m yours.</em>
        </motion.h3>

        {/* Hairline with traveling pulse */}
        <div className="relative mb-12 hidden md:block">
          <div
            className="h-px w-full"
            style={{
              background: "linear-gradient(to right, transparent, rgba(212,119,90,0.4) 10%, rgba(212,119,90,0.4) 90%, transparent)",
            }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full"
            style={{
              background: "#D4775A",
              boxShadow: "0 0 12px #D4775A",
              animation: "comp-travel 12s linear infinite",
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.3 }}
              className="text-center"
            >
              <p className="text-[#D4775A] text-[13px] font-mono tracking-[2px] uppercase mb-4">
                {m.label}
              </p>
              <p className="text-[#FAF8F4] text-[18px] md:text-[20px] font-light leading-relaxed mb-3">
                &ldquo;{m.quote}&rdquo;
              </p>
              <p className="text-[#FAF8F4]/35 text-[11px] italic font-light">
                {m.sub}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes comp-travel {
          0% { left: 0%; opacity: 0.2; }
          5% { opacity: 1; }
          50% { left: 100%; opacity: 1; }
          55% { opacity: 0.2; }
          100% { left: 0%; opacity: 0.2; }
        }
      `}</style>
    </section>
  );
}
