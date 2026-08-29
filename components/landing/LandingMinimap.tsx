"use client";

import { useEffect, useState } from "react";

/**
 * Right-edge minimap. Vertical stack of dots, one per major section.
 *  - Hover any dot → its label slides out next to it
 *  - Click → smooth-scrolls to the section's anchor
 *  - The active dot (closest to viewport center) glows with a ring
 *
 * Hidden on mobile (< md) and during the boot sequence.
 */

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: "hero", label: "vision" },
  { id: "problem", label: "i notice" },
  { id: "tiers", label: "three levels" },
  { id: "how-it-works", label: "how i think" },
  { id: "ambient", label: "i see" },
  { id: "why", label: "what i can do" },
  { id: "demo", label: "try me" },
  { id: "compound", label: "compounding" },
  { id: "vision", label: "we're building" },
  { id: "pricing", label: "pricing" },
];

export default function LandingMinimap() {
  const [active, setActive] = useState(0);
  const [enabled, setEnabled] = useState(false);

  // enable only when the boot sequence has finished
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkBoot = () => {
      if (sessionStorage.getItem("jarvis-booted-v1") === "1") {
        setEnabled(true);
      }
    };
    checkBoot();
    // poll every 500ms in case boot finishes after this mounts
    const id = setInterval(() => {
      checkBoot();
      if (sessionStorage.getItem("jarvis-booted-v1") === "1") clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, []);

  // observe which section is closest to viewport center
  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      const center = window.innerHeight / 2;
      let closest = 0;
      let dMin = Infinity;
      SECTIONS.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - center);
        if (d < dMin) {
          dMin = d;
          closest = i;
        }
      });
      setActive(closest);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col gap-3 pointer-events-auto"
      aria-label="Section navigation"
    >
      {SECTIONS.map((s, i) => {
        const isActive = i === active;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="group relative flex items-center justify-end h-3 transition-transform"
            aria-label={`Jump to ${s.label}`}
          >
            {/* label that slides in on hover */}
            <span
              className="mr-3 px-2 py-0.5 rounded-md font-mono text-[9.5px] tracking-[1.5px] uppercase opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
              style={{
                background: "rgba(28,26,23,0.85)",
                border: "1px solid rgba(212,119,90,0.25)",
                color: "#FAF8F4",
                backdropFilter: "blur(6px)",
              }}
            >
              {s.label}
            </span>

            {/* dot */}
            <span
              className="block transition-all duration-300"
              style={{
                width: isActive ? 10 : 6,
                height: isActive ? 10 : 6,
                borderRadius: "50%",
                background: isActive ? "#D4775A" : "rgba(250,248,244,0.25)",
                boxShadow: isActive ? "0 0 12px rgba(212,119,90,0.7)" : "none",
                outline: isActive ? "1px solid rgba(212,119,90,0.4)" : "none",
                outlineOffset: 4,
              }}
            />
          </a>
        );
      })}
    </div>
  );
}
