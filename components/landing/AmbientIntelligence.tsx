"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SCENES, type AmbientScene } from "@/lib/landing/scenes";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function ChannelCard({ scene }: { scene: AmbientScene }) {
  const accent =
    scene.channel === "imessage" ? "#6B7FB5" :
    scene.channel === "slack" ? "#4A7B6B" :
    scene.channel === "gmail" ? "#E09D5C" :
    "#D4775A";

  return (
    <motion.div
      key={scene.id}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-xl p-5 backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent}66`,
        boxShadow: `0 0 24px ${accent}22`,
      }}
    >
      <div className="text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/40 mb-2 font-mono">
        {scene.channelLabel} · {scene.sender}
      </div>
      <div className="text-[#FAF8F4] text-[16px] leading-snug font-light">
        {scene.message}
      </div>
      {scene.attachment ? (
        <div
          className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md text-[11px] text-[#FAF8F4]/70"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
        >
          📎 {scene.attachment}
        </div>
      ) : null}
    </motion.div>
  );
}

function SchedulePanel({ scene }: { scene: AmbientScene }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex justify-between items-center mb-3 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/50">
        <span>schedule · live</span>
        <span className="flex items-center gap-1.5 text-[#4A7B6B]">
          <span
            className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
            style={{ animation: "ai-livepulse 1.6s ease-in-out infinite" }}
          />
          rewriting
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {scene.blocks.map((b) => (
          <motion.div
            key={`${scene.id}-${b.label}`}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center gap-3 mb-1.5 rounded-md px-3 py-2 text-[12px] relative"
            style={{
              borderLeft: `2px solid ${b.color}`,
              background: `${b.color}22`,
              color: "#FAF8F4",
            }}
          >
            <span className="text-[#FAF8F4]/55 font-mono w-24 shrink-0">{b.time}</span>
            <span className="flex-1">{b.label}</span>
            {b.badge ? (
              <span
                className="text-[9px] uppercase tracking-[0.5px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: `${b.color}33`, color: b.color }}
              >
                {b.badge}
              </span>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function AmbientIntelligence() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
      if (isMobile || !sectionRef.current) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=400%",
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const idx = Math.min(SCENES.length - 1, Math.floor(self.progress * SCENES.length));
          setActiveIdx(idx);
        },
      });
      return () => {
        trigger.kill();
      };
    },
    { dependencies: [isMobile], scope: sectionRef }
  );

  // Mobile: stacked render of all scenes
  if (isMobile) {
    return (
      <section ref={sectionRef} className="bg-[#1C1A17] py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHead />
          <div className="flex flex-col gap-16 mt-16">
            {SCENES.map((s) => (
              <div key={s.id} className="grid grid-cols-1 gap-4">
                <ChannelCard scene={s} />
                <SchedulePanel scene={s} />
              </div>
            ))}
          </div>
          <Closer />
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="bg-[#1C1A17] relative">
      <div className="h-screen w-full flex flex-col justify-between max-w-7xl mx-auto px-12 py-24">
        <SectionHead />
        <div className="grid grid-cols-2 gap-12 items-start flex-1 mt-12">
          <div className="flex items-center justify-center min-h-[280px]">
            <AnimatePresence mode="wait">
              <ChannelCard key={SCENES[activeIdx].id} scene={SCENES[activeIdx]} />
            </AnimatePresence>
          </div>
          <SchedulePanel scene={SCENES[activeIdx]} />
        </div>
        <Closer />
      </div>
      <style>{`@keyframes ai-livepulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </section>
  );
}

function SectionHead() {
  return (
    <div className="max-w-2xl">
      <p className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-6">
        i see your life happening.
      </p>
      <h3 className="text-[#FAF8F4] text-[28px] md:text-[32px] font-light leading-tight tracking-[-0.4px]">
        You don&apos;t open me. <em className="not-italic text-[#D4775A] font-medium">I&apos;m already there.</em>
      </h3>
    </div>
  );
}

function Closer() {
  return (
    <p className="text-[#FAF8F4]/55 text-[14px] md:text-[15px] italic font-light text-center mt-16 max-w-3xl mx-auto">
      Most apps reschedule when your <span className="not-italic">calendar</span> changes. <span className="text-[#D4775A] font-medium not-italic">I reschedule when your <em className="italic">life</em> changes.</span>
    </p>
  );
}
