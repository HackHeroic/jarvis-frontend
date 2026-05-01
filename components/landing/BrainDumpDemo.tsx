"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseDump, type ParsedBlock } from "@/lib/landing/dumpParser";

const PREFILL = "Prepare for ML competition by Friday. Gym 3x. Call mom Sunday.";

export default function BrainDumpDemo() {
  const [text, setText] = useState(PREFILL);
  const [blocks, setBlocks] = useState<ParsedBlock[]>(() => parseDump(PREFILL));
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Re-parse on text change with a small debounce to feel alive but not jittery
  useEffect(() => {
    const t = setTimeout(() => setBlocks(parseDump(text)), 600);
    return () => clearTimeout(t);
  }, [text]);

  const seedHref = useMemo(() => `/dashboard?seed=${encodeURIComponent(text)}`, [text]);

  return (
    <section className="relative bg-[#1C1A17] py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-12"
        >
          try me.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Brain dump pad */}
          <div>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell me what's on your mind..."
              rows={8}
              className="w-full bg-[#252320] border border-white/10 rounded-xl p-5 text-[#FAF8F4] text-[16px] font-light leading-relaxed resize-none focus:outline-none focus:border-[#D4775A]/50 focus:ring-1 focus:ring-[#D4775A]/30 transition-colors placeholder:text-[#FAF8F4]/30"
            />
            <div className="mt-3 text-[11px] font-mono text-[#FAF8F4]/40 tracking-[0.5px]">
              {blocks.length} block{blocks.length === 1 ? "" : "s"} · live preview →
            </div>
          </div>

          {/* Live schedule preview */}
          <div
            className="rounded-xl p-5 min-h-[280px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex justify-between items-center mb-4 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/50">
              <span>today · mock · demo</span>
              <span className="flex items-center gap-1.5 text-[#4A7B6B]">
                <span
                  className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
                  style={{ animation: "bd-pulse 1.6s ease-in-out infinite" }}
                />
                live
              </span>
            </div>
            <AnimatePresence mode="popLayout">
              {blocks.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex items-center gap-3 mb-1.5 rounded-md px-3 py-2.5 text-[13px]"
                  style={{
                    borderLeft: `2px solid ${b.color}`,
                    background: `${b.color}1A`,
                    color: "#FAF8F4",
                  }}
                >
                  <span className="text-[#FAF8F4]/55 font-mono w-24 shrink-0">{b.time}</span>
                  <span className="flex-1">{b.label}</span>
                  <span className="text-[#FAF8F4]/40 text-[10px] font-mono">{b.durationMin}m</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-[#FAF8F4]/55 text-[14px] italic font-light text-center mt-16 max-w-2xl mx-auto">
          That&apos;s it. That&apos;s the demo. The rest is just running it for years.
        </p>

        <div className="text-center mt-8">
          <Link
            href={seedHref}
            className="inline-block text-[#D4775A] hover:text-[#E09D5C] text-[14px] font-medium tracking-[0.5px] transition-colors"
          >
            begin →
          </Link>
        </div>
      </div>

      <style>{`@keyframes bd-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </section>
  );
}
