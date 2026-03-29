"use client";

import { motion } from "motion/react";

export default function Philosophy() {
  return (
    <section
      id="how-it-works"
      className="py-32"
      style={{
        background: "linear-gradient(to bottom, #1C1A17, #2A2420)",
      }}
    >
      <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-2xl md:text-3xl font-semibold text-[#FAF8F4] leading-snug"
        >
          &ldquo;Every other productivity app makes you feel guilty for not
          keeping up.{" "}
          <span className="text-[#D4775A]">
            Jarvis makes falling behind impossible.
          </span>
          &rdquo;
        </motion.blockquote>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-8 text-[#FAF8F4]/40 text-sm max-w-md mx-auto"
        >
          When you skip a task, Jarvis doesn&apos;t punish you. It re-evaluates
          your priorities and builds a new plan that still gets you to the finish
          line.
        </motion.p>
      </div>
    </section>
  );
}
