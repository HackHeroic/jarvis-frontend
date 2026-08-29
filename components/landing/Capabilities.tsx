"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import type { ReactNode } from "react";

/**
 * "what i can do." — five plain sentences, made to feel like system output.
 *  - each sentence reveals sequentially on scroll-into-view
 *  - keywords (documents, remember, math, learn, your machine) glow softly
 *  - row hover: spreads a subtle copper glow, underlines the keyword, brightens copy
 *  - faint mono "processing" ticker drifts along the right edge of each row
 */

const SENTENCES: Array<{ key: string; text: ReactNode; tail: string }> = [
  {
    key: "documents",
    text: (
      <>
        I read your <em className="cap-key">documents</em> — syllabi, PDFs, slides — and pin the right pieces to the right work.
      </>
    ),
    tail: "indexing · 0.2s",
  },
  {
    key: "remember",
    text: (
      <>
        I <em className="cap-key">remember</em> what matters and forget what doesn&apos;t, on the curve memory follows.
      </>
    ),
    tail: "decay · sm-2",
  },
  {
    key: "math",
    text: (
      <>
        I do the <em className="cap-key">math</em> on your constraints. Conflicts aren&apos;t possible.
      </>
    ),
    tail: "solver · v1",
  },
  {
    key: "learn",
    text: (
      <>
        I <em className="cap-key">learn</em> how you actually work — when you focus, when you skip, when you lie about it.
      </>
    ),
    tail: "behavior · live",
  },
  {
    key: "your-machine",
    text: (
      <>
        I run on <em className="cap-key">your machine.</em> Your data stays where you sleep.
      </>
    ),
    tail: "local · private",
  },
];

export default function Capabilities() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      id="why"
      ref={sectionRef}
      className="relative bg-[#1C1A17] py-32 overflow-hidden"
    >
      {/* warm radial behind list */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 50% 50%, rgba(212,119,90,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.95, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-3 uppercase flex items-center gap-2.5"
        >
          <span
            className="block w-[6px] h-[6px] rounded-full bg-[#D4775A]"
            style={{ boxShadow: "0 0 12px #D4775A", animation: "glow-pulse 2.4s ease-in-out infinite" }}
          />
          what i can do.
        </motion.p>

        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[#FAF8F4] text-[22px] md:text-[26px] font-light tracking-[-0.4px] mb-12 max-w-xl"
        >
          Five things, said plainly.{" "}
          <em className="not-italic text-[#FAF8F4]/55 italic">No bullet points needed.</em>
        </motion.h3>

        <div className="flex flex-col">
          {SENTENCES.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.18 }}
              className="cap-row group relative py-7 border-b border-white/5 last:border-b-0 transition-colors duration-300"
            >
              {/* hover halo */}
              <span
                aria-hidden
                className="cap-halo absolute inset-x-[-24px] inset-y-0 pointer-events-none rounded-2xl opacity-0 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 50%, rgba(212,119,90,0.10), transparent 70%)",
                }}
              />

              {/* index dot */}
              <span
                aria-hidden
                className="absolute left-[-22px] top-[34px] hidden md:flex items-center gap-1 font-mono text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/30"
              >
                0{i + 1}
              </span>

              <p className="relative text-[#FAF8F4] text-[20px] md:text-[22px] font-light leading-[1.6]">
                {s.text}
              </p>

              {/* faint processing ticker */}
              <span
                aria-hidden
                className="cap-tick absolute right-0 top-2 font-mono text-[9px] tracking-[1.5px] uppercase text-[#FAF8F4]/25 opacity-0 transition-opacity duration-500"
              >
                {s.tail}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-[#FAF8F4]/40 text-[11px] font-mono tracking-[2px] uppercase text-center mt-16"
        >
          ● five capabilities · always running · no toggles
        </motion.p>
      </div>

      <style>{`
        .cap-key {
          font-style: normal;
          color: #D4775A;
          font-weight: 500;
          position: relative;
          background: linear-gradient(0deg, rgba(212,119,90,0.18), rgba(212,119,90,0.18)) bottom / 100% 0 no-repeat;
          padding-bottom: 1px;
          transition: text-shadow .35s ease, background-size .35s ease, color .35s ease;
          text-shadow: 0 0 0 rgba(212,119,90,0);
        }
        .cap-row:hover .cap-halo { opacity: 1; }
        .cap-row:hover .cap-tick { opacity: 1; }
        .cap-row:hover .cap-key {
          color: #E09D5C;
          text-shadow: 0 0 14px rgba(224,157,92,0.55);
          background-size: 100% 2px;
        }
      `}</style>
    </section>
  );
}
