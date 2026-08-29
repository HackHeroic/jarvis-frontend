"use client";

import Link from "next/link";
import { motion } from "motion/react";
import JarvisLogo from "@/components/landing/JarvisLogo";

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#1C1A17] overflow-hidden">
      {/* page-wide grain to match landing */}
      <div
        aria-hidden
        className="landing-grain"
        style={{ position: "absolute" }}
      />

      {/* warm radial behind the glyph */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 50% 50%, rgba(212,119,90,0.16) 0%, rgba(212,119,90,0.04) 40%, transparent 75%)",
        }}
      />

      {/* faint vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-10"
        >
          <JarvisLogo size="xl" wordmark={false} animated />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-6 flex items-center justify-center gap-2.5 uppercase"
        >
          <span
            className="block w-[6px] h-[6px] rounded-full bg-[#D4775A]"
            style={{ boxShadow: "0 0 12px #D4775A", animation: "glow-pulse 2.4s ease-in-out infinite" }}
          />
          signal lost · 404
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-[#FAF8F4] text-[34px] md:text-[44px] font-light leading-[1.15] tracking-[-0.6px] mb-5"
        >
          I can&apos;t find that.{" "}
          <span className="text-[#D4775A] font-medium">Yet.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-[#FAF8F4]/60 text-[15px] font-light leading-relaxed mb-10 max-w-md mx-auto"
        >
          Either the page moved, or I haven&apos;t built it yet. <span className="italic text-[#FAF8F4]/45">(I&apos;m working on it.)</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex items-center justify-center gap-6"
        >
          <Link
            href="/"
            className="text-[#D4775A] hover:text-[#E09D5C] text-[14px] font-medium tracking-[0.5px] transition-colors"
          >
            ← back home
          </Link>
          <span className="text-[#FAF8F4]/20">·</span>
          <Link
            href="/dashboard"
            className="text-[#FAF8F4]/60 hover:text-[#FAF8F4] text-[14px] font-light tracking-[0.5px] transition-colors"
          >
            open jarvis
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-16 text-[#FAF8F4]/35 text-[10px] font-mono tracking-[2px] uppercase"
        >
          jarvis · running · still listening
        </motion.p>
      </div>
    </main>
  );
}
