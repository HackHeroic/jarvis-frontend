"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SCENES, type AmbientScene, type ScheduleBlock } from "@/lib/landing/scenes";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const CHANNEL_ICON: Record<AmbientScene["channel"], string> = {
  imessage: "💬",
  slack: "#",
  gmail: "✉",
  calendar: "▦",
};

function ChannelCard({ scene }: { scene: AmbientScene }) {
  const accent =
    scene.channel === "imessage"
      ? "#6B7FB5"
      : scene.channel === "slack"
      ? "#4A7B6B"
      : scene.channel === "gmail"
      ? "#E09D5C"
      : "#D4775A";

  return (
    <motion.div
      key={scene.id}
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.97 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-card relative rounded-2xl p-6 max-w-md w-full"
      style={{
        borderColor: `${accent}55`,
        boxShadow: `0 18px 50px rgba(0,0,0,0.45), 0 0 60px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* corner sheen */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-24 h-24 pointer-events-none rounded-tr-2xl"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${accent}33 0%, transparent 60%)`,
        }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[16px]"
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}55`,
            color: accent,
            boxShadow: `0 0 14px ${accent}33`,
          }}
        >
          {CHANNEL_ICON[scene.channel]}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/45 font-mono">
            {scene.channelLabel}
          </span>
          <span className="text-[#FAF8F4]/85 text-[13px] font-light">{scene.sender}</span>
        </div>
        <span
          className="ml-auto text-[9px] uppercase tracking-[1.5px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: `${accent}1A`, color: accent, border: `1px solid ${accent}33` }}
        >
          incoming
        </span>
      </div>

      <p className="text-[#FAF8F4] text-[18px] leading-snug font-light mb-4">
        &ldquo;{scene.message}&rdquo;
      </p>

      {scene.attachment ? (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-[#FAF8F4]/75"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
        >
          <span style={{ color: accent }}>📎</span> {scene.attachment}
        </div>
      ) : null}
    </motion.div>
  );
}

function badgeStyle(state: ScheduleBlock["state"]): { bg: string; fg: string; border: string; label: string } {
  switch (state) {
    case "moved":
      return { bg: "rgba(224,157,92,0.18)", fg: "#E09D5C", border: "rgba(224,157,92,0.45)", label: "moved" };
    case "added":
      return { bg: "rgba(74,123,107,0.20)", fg: "#79B49C", border: "rgba(74,123,107,0.45)", label: "added" };
    case "expanded":
      return { bg: "rgba(212,119,90,0.20)", fg: "#D4775A", border: "rgba(212,119,90,0.45)", label: "expanded" };
    default:
      return { bg: "rgba(255,255,255,0.05)", fg: "#FAF8F4", border: "rgba(255,255,255,0.1)", label: "stable" };
  }
}

function SchedulePanel({ scene }: { scene: AmbientScene }) {
  const movedCount = scene.blocks.filter((b) => b.state !== "stable").length;
  return (
    <div
      className="glass-card relative rounded-2xl p-5 w-full"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
    >
      {/* header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/55">
          <span className="text-[#D4775A]">▦</span>
          <span>schedule</span>
          <span className="text-[#FAF8F4]/30">·</span>
          <span>{scene.id === "exam" ? "next 3 weeks" : "today"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] uppercase tracking-[1.5px] font-mono px-2 py-0.5 rounded-full text-[#E09D5C]"
            style={{ background: "rgba(224,157,92,0.15)", border: "1px solid rgba(224,157,92,0.35)" }}
          >
            {movedCount} change{movedCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5 text-[#4A7B6B] text-[10px] font-mono uppercase tracking-[1.5px]">
            <span
              className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
              style={{ boxShadow: "0 0 8px #4A7B6B", animation: "ai-livepulse 1.6s ease-in-out infinite" }}
            />
            live
          </span>
        </div>
      </div>

      {/* blocks */}
      <AnimatePresence mode="popLayout">
        {scene.blocks.map((b) => {
          const badge = badgeStyle(b.state);
          return (
            <motion.div
              key={`${scene.id}-${b.label}`}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="flex items-center gap-3 mb-2 rounded-lg px-3 py-2.5 text-[12px] relative group"
              style={{
                borderLeft: `2px solid ${b.color}`,
                background: `linear-gradient(90deg, ${b.color}26, ${b.color}10 60%, transparent)`,
                color: "#FAF8F4",
              }}
            >
              <span className="text-[#FAF8F4]/55 font-mono w-28 shrink-0 text-[10.5px]">
                {b.time}
              </span>
              <span className="flex-1 font-light leading-snug">{b.label}</span>
              {b.badge ? (
                <span
                  className="text-[9px] uppercase tracking-[1px] font-mono px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: badge.bg,
                    color: badge.fg,
                    border: `1px solid ${badge.border}`,
                  }}
                >
                  {b.badge}
                </span>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* footer hint */}
      <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono uppercase tracking-[1.5px] text-[#FAF8F4]/35">
        rewriting · 0.04s · constraint solver · v1
      </div>
    </div>
  );
}

function SceneStepper({ active, total }: { active: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="block transition-all duration-500"
          style={{
            width: i === active ? 28 : 8,
            height: 3,
            borderRadius: 2,
            background: i === active ? "#D4775A" : "rgba(250,248,244,0.18)",
            boxShadow: i === active ? "0 0 8px rgba(212,119,90,0.6)" : "none",
          }}
        />
      ))}
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
      <section ref={sectionRef} className="bg-[#1C1A17] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHead />
          <div className="flex flex-col gap-12 mt-12">
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
    <section ref={sectionRef} className="bg-[#1C1A17] relative overflow-hidden">
      {/* ambient glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: "-10%",
          top: "20%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(ellipse, rgba(212,119,90,0.08), transparent 70%)",
        }}
      />
      <div className="h-screen w-full flex flex-col justify-between max-w-7xl mx-auto px-12 py-20 relative">
        <div className="flex items-end justify-between">
          <SectionHead />
          <SceneStepper active={activeIdx} total={SCENES.length} />
        </div>
        <div className="grid grid-cols-[1fr_1.2fr] gap-16 items-center flex-1 mt-12">
          <div className="flex items-center justify-center min-h-[320px]">
            <AnimatePresence mode="wait">
              <ChannelCard key={SCENES[activeIdx].id} scene={SCENES[activeIdx]} />
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={SCENES[activeIdx].id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <SchedulePanel scene={SCENES[activeIdx]} />
            </motion.div>
          </AnimatePresence>
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
      <p className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-5 uppercase">
        i see your life happening.
      </p>
      <h3 className="text-[#FAF8F4] text-[32px] md:text-[40px] font-light leading-[1.1] tracking-[-0.7px]">
        You don&apos;t open me.{" "}
        <em className="not-italic text-[#D4775A] font-medium">I&apos;m already there.</em>
      </h3>
    </div>
  );
}

function Closer() {
  return (
    <p className="text-[#FAF8F4]/60 text-[14px] md:text-[15px] italic font-light text-center mt-12 max-w-3xl mx-auto">
      Most apps reschedule when your <span className="not-italic">calendar</span> changes.{" "}
      <span className="text-[#D4775A] font-medium not-italic">
        I reschedule when your <em className="italic">life</em> changes.
      </span>
    </p>
  );
}
