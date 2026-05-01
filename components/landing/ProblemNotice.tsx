"use client";

import { motion } from "motion/react";

export default function ProblemNotice() {
  return (
    <section className="relative bg-[#1C1A17] py-40 md:py-48">
      <div className="max-w-[680px] mx-auto px-6 md:px-12 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-[#D4775A]/80 text-[11px] tracking-[2px] font-mono uppercase lowercase mb-10"
          style={{ textTransform: "lowercase" }}
        >
          i notice.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="text-[#FAF8F4] text-[28px] md:text-[32px] font-light leading-snug tracking-[-0.4px] mb-6"
        >
          You make about{" "}
          <span className="text-[#D4775A] font-medium">87 decisions</span>{" "}
          before noon. Most are tiny. All cost you.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.55 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
          className="text-[#FAF8F4]/55 text-[15px] italic font-light"
        >
          (That&apos;s why your big ones feel hard by 4 p.m.)
        </motion.p>
      </div>
    </section>
  );
}
