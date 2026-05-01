"use client";

import { motion } from "motion/react";

const SENTENCES: Array<{ text: React.ReactNode }> = [
  { text: <>I read your <em className="not-italic text-[#D4775A] font-medium">documents</em> — syllabi, PDFs, slides — and pin the right pieces to the right work.</> },
  { text: <>I <em className="not-italic text-[#D4775A] font-medium">remember</em> what matters and forget what doesn&apos;t, on the curve memory follows.</> },
  { text: <>I do the <em className="not-italic text-[#D4775A] font-medium">math</em> on your constraints. Conflicts aren&apos;t possible.</> },
  { text: <>I <em className="not-italic text-[#D4775A] font-medium">learn</em> how you actually work — when you focus, when you skip, when you lie about it.</> },
  { text: <>I run on <em className="not-italic text-[#D4775A] font-medium">your machine.</em> Your data stays where you sleep.</> },
];

export default function Capabilities() {
  return (
    <section className="relative bg-[#1C1A17] py-32">
      <div className="max-w-[720px] mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-12"
        >
          what i can do.
        </motion.p>

        <div className="flex flex-col">
          {SENTENCES.map((s, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.12 }}
              className="text-[#FAF8F4] text-[20px] md:text-[22px] font-light leading-[1.6] py-6 border-b border-white/5 last:border-b-0"
            >
              {s.text}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
