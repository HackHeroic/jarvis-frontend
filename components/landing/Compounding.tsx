"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * Day 1 → Month 3 → Year 1 transformation.
 *  - horizontal progress line (terra gradient)
 *  - a glowing node travels left → right as the user scrolls
 *  - each milestone activates when in view: scale up, glow halo, breathe
 *  - Month 3 is the strongest visual focus (largest, brightest, italic emphasis)
 */

const MILESTONES = [
  {
    label: "Day 1",
    quote: "I'm useful out of the box.",
    sub: "(architecture — integrated engine on day one)",
    weight: 0.7,
  },
  {
    label: "Month 3",
    quote: "I know your energy. Your habits. The mornings you skip and don't admit. I'm yours.",
    sub: "(data — personalization compounds)",
    weight: 1.0, // strongest
  },
  {
    label: "Year 1",
    quote: "Switching feels like starting over with a stranger.",
    sub: "(compounding — psychology + ambient layered)",
    weight: 0.85,
  },
];

function MilestoneCard({
  m,
  inView,
  emphasis,
  index,
}: {
  m: (typeof MILESTONES)[number];
  inView: boolean;
  emphasis: boolean;
  index: number;
}) {
  const baseScale = m.weight;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 + index * 0.25 }}
      className="relative text-center px-2"
    >
      {/* breathing halo on the active stage */}
      {emphasis ? (
        <div
          aria-hidden
          className="absolute -inset-6 rounded-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(212,119,90,0.16), transparent 70%)",
            animation: "comp-breathe 4.5s ease-in-out infinite",
          }}
        />
      ) : null}

      <p
        className="font-mono tracking-[2.5px] uppercase mb-4"
        style={{
          color: emphasis ? "rgba(212,119,90,1)" : "rgba(212,119,90,0.7)",
          fontSize: emphasis ? 14 : 12,
          textShadow: emphasis ? "0 0 18px rgba(212,119,90,0.45)" : "none",
        }}
      >
        {m.label}
      </p>

      <p
        className="text-[#FAF8F4] font-light leading-relaxed mb-3 mx-auto"
        style={{
          fontSize: emphasis ? 22 : Math.round(18 * baseScale + 2),
          maxWidth: emphasis ? 360 : 280,
          opacity: emphasis ? 1 : 0.85,
          fontStyle: emphasis ? "italic" : "normal",
        }}
      >
        &ldquo;{m.quote}&rdquo;
      </p>
      <p
        className="text-[#FAF8F4]/40 italic font-light"
        style={{ fontSize: 11 }}
      >
        {m.sub}
      </p>
    </motion.div>
  );
}

export default function Compounding() {
  const sectionRef = useRef<HTMLElement>(null);
  const stage0 = useRef<HTMLDivElement>(null);
  const stage1 = useRef<HTMLDivElement>(null);
  const stage2 = useRef<HTMLDivElement>(null);
  const stageRefs = [stage0, stage1, stage2];
  const v0 = useInView(stage0, { once: true, amount: 0.5 });
  const v1 = useInView(stage1, { once: true, amount: 0.5 });
  const v2 = useInView(stage2, { once: true, amount: 0.5 });
  const inViewArr = [v0, v1, v2];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 70%", "end 30%"],
  });
  const nodeX = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const nodeOpacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 1, 1, 0]);
  // Month 3 is in focus when scrollProgress ~ 0.4–0.7
  const month3Glow = useTransform(scrollYProgress, [0.3, 0.5, 0.7], [0.3, 1, 0.6]);

  return (
    <section ref={sectionRef} className="relative bg-[#1C1A17] py-32 overflow-hidden">
      {/* warm vignette */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: "20%",
          top: "30%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(ellipse, rgba(212,119,90,0.07), transparent 70%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.95, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-3 text-center uppercase"
        >
          i get better every day.
        </motion.p>

        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-[#FAF8F4] text-[26px] md:text-[32px] font-light text-center max-w-2xl mx-auto mb-24 tracking-[-0.4px]"
        >
          Day one is good.{" "}
          <em className="not-italic text-[#D4775A] font-medium">By month three I&apos;m yours.</em>
        </motion.h3>

        {/* Horizontal progress line + scroll-driven node */}
        <div className="relative mb-16 hidden md:block h-2">
          <div
            className="h-px w-full absolute left-0 top-1/2 -translate-y-1/2"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, rgba(212,119,90,0.18) 12%, rgba(212,119,90,0.55) 50%, rgba(212,119,90,0.30) 88%, transparent 100%)",
            }}
          />
          {/* tick marks under each milestone */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full"
              style={{
                left: `${16.66 + i * 33.33}%`,
                background: i === 1 ? "#D4775A" : "rgba(212,119,90,0.6)",
                boxShadow: i === 1 ? "0 0 12px #D4775A" : "0 0 6px rgba(212,119,90,0.5)",
              }}
            />
          ))}
          {/* scroll-driven traveling node */}
          <motion.span
            aria-hidden
            className="absolute top-1/2 w-[10px] h-[10px] rounded-full"
            style={{
              left: nodeX,
              translateX: "-50%",
              translateY: "-50%",
              background: "#E09D5C",
              boxShadow: "0 0 18px #E09D5C, 0 0 6px #E09D5C",
              opacity: nodeOpacity,
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 items-start">
          {MILESTONES.map((m, i) => (
            <div key={m.label} ref={stageRefs[i]}>
              <MilestoneCard
                m={m}
                inView={inViewArr[i]}
                emphasis={i === 1}
                index={i}
              />
            </div>
          ))}
        </div>

        {/* faint footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-[#FAF8F4]/40 text-[11px] font-mono tracking-[2px] uppercase text-center mt-16"
        >
          <motion.span style={{ opacity: month3Glow }}>● </motion.span>
          compounding · architecture + data + psychology + ambient
        </motion.p>
      </div>

      <style>{`
        @keyframes comp-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </section>
  );
}
