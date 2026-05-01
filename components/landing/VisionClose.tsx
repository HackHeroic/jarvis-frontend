"use client";

import { motion } from "motion/react";
import Link from "next/link";
import JarvisLogo from "./JarvisLogo";

export default function VisionClose() {
  return (
    <section className="relative bg-[#0F0D0A] min-h-[80vh] flex items-center overflow-hidden">
      {/* film grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* aurora horizon */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[180px] pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(212,119,90,0.18), transparent)",
          filter: "blur(8px)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-10"
        >
          <JarvisLogo size="xl" wordmark={false} animated />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="text-[#FAF8F4] text-[36px] md:text-[44px] font-light leading-tight tracking-[-0.8px] mb-8"
        >
          We&apos;re building the <em className="not-italic text-[#D4775A] font-medium">Jarvis</em> from Iron Man — for real life.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.65 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-[#FAF8F4]/65 text-[16px] font-light leading-relaxed mb-10 max-w-xl mx-auto"
        >
          A learning loop that compounds daily. Always preparing. Always learning. Always in your corner.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link
            href="/dashboard"
            className="inline-block text-[#D4775A] hover:text-[#E09D5C] text-[16px] font-light tracking-[1px] transition-colors"
          >
            begin.
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
