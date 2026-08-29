"use client";

import { motion, useInView } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import JarvisLogo from "./JarvisLogo";

/**
 * Cinematic Vision Close.
 *  - Larger orb (1.2× scale) breathing harder than anywhere else
 *  - Headline crawls in line-by-line like opening titles (3 lines, slow)
 *  - "begin." link has magnetic pull on hover (cursor → button by 4-6px)
 *    plus a halo bloom that breathes
 *  - Full-bleed warm aurora drifting on a 30s cycle
 *  - Subtle starfield glints (5 dots) anchor it to the boot universe
 */

function MagneticBegin() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      // pull only when within 120px
      if (d < 120) {
        setHover(true);
        setPull({ x: dx * 0.18, y: dy * 0.18 });
      } else {
        setHover(false);
        setPull({ x: 0, y: 0 });
      }
    };
    const onLeave = () => {
      setHover(false);
      setPull({ x: 0, y: 0 });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <span className="relative inline-block">
      {/* halo bloom */}
      <span
        aria-hidden
        className="absolute inset-[-30px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,119,90,0.32), transparent 70%)",
          opacity: hover ? 1 : 0.5,
          filter: "blur(14px)",
          transition: "opacity 0.35s ease",
          animation: "vc-halo 4s ease-in-out infinite",
        }}
      />
      <Link
        ref={ref}
        href="/dashboard"
        className="relative inline-block px-6 py-3 text-[#D4775A] hover:text-[#E09D5C] text-[18px] font-light tracking-[2px] transition-colors"
        style={{
          transform: `translate(${pull.x}px, ${pull.y}px)`,
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s ease",
        }}
      >
        begin.
      </Link>
    </span>
  );
}

export default function VisionClose() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.4 });

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#0B0907] min-h-[92vh] flex items-center overflow-hidden"
    >
      {/* full-bleed warm aurora drifting */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 1100px 700px at 50% 60%, rgba(212,119,90,0.28) 0%, rgba(224,157,92,0.12) 30%, transparent 70%)",
            "radial-gradient(ellipse 800px 500px at 20% 30%, rgba(107,127,181,0.10) 0%, transparent 70%)",
          ].join(", "),
          animation: "vc-aurora-drift 30s ease-in-out infinite",
        }}
      />

      {/* film grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* anchor stars (5) — universe echo */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => {
          const x = [12, 28, 70, 86, 50][i];
          const y = [22, 78, 18, 64, 88][i];
          const tone = i % 2 === 0 ? "#D4775A" : "#E09D5C";
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: tone,
                boxShadow: `0 0 8px ${tone}`,
                opacity: 0.55,
                animation: `vc-twinkle ${3 + (i * 0.7)}s ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* aurora horizon at the foot */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[260px] pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(212,119,90,0.22), transparent)",
          filter: "blur(14px)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
        {/* orb — larger and breathing harder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1.15 } : {}}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="flex justify-center mb-12"
          style={{
            filter: "drop-shadow(0 0 36px rgba(212,119,90,0.45))",
          }}
        >
          <JarvisLogo size="xl" wordmark={false} animated />
        </motion.div>

        {/* line-by-line crawl headline */}
        <h2 className="text-[#FAF8F4] text-[34px] md:text-[44px] font-light leading-[1.18] tracking-[-0.8px] mb-10">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.0, ease: "easeOut", delay: 0.4 }}
            className="block"
          >
            We&apos;re building the{" "}
            <em className="not-italic text-[#D4775A] font-medium">Jarvis</em>{" "}
            from Iron Man —
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.0, ease: "easeOut", delay: 1.1 }}
            className="block italic text-[#FAF8F4]/85"
          >
            for real life.
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 0.7, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 1.8 }}
          className="text-[#FAF8F4]/70 text-[16px] md:text-[17px] font-light leading-relaxed mb-4 max-w-xl mx-auto"
        >
          A learning loop that compounds daily.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 0.55, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 2.2 }}
          className="text-[#FAF8F4]/55 text-[14px] md:text-[15px] font-light italic leading-relaxed mb-12 max-w-xl mx-auto"
        >
          Always preparing. Always learning. Always in your corner.
        </motion.p>

        {/* signature whisper line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 0.45 } : {}}
          transition={{ duration: 1.0, delay: 2.6 }}
          className="text-[#FAF8F4]/45 text-[13px] font-light italic mb-10"
        >
          You&apos;ll forget you have me. <span className="text-[#D4775A]/85 not-italic">That&apos;s the point.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 3.0 }}
        >
          <MagneticBegin />
        </motion.div>
      </div>

      <style>{`
        @keyframes vc-aurora-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(-3%, 2%) scale(1.04); }
          66%      { transform: translate(2%, -2%) scale(0.97); }
        }
        @keyframes vc-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50%      { opacity: 0.85; transform: scale(1.2); }
        }
        @keyframes vc-halo {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
      `}</style>
    </section>
  );
}
