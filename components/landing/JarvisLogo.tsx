"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<Size, number> = {
  sm: 22,
  md: 26,
  lg: 32,
  xl: 96,
};

const WORDMARK_PX: Record<Size, number> = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 36,
};

interface JarvisLogoProps {
  size?: Size;
  wordmark?: boolean;
  animated?: boolean;
  className?: string;
  /** When true, the signal-dot orbit speed reacts to page scroll velocity. */
  reactToScroll?: boolean;
}

/**
 * Hook: returns a smoothed scroll-velocity factor in roughly [0, 1].
 *  0 = idle / not scrolling, 1 = fast scroll. Decays over ~600ms after stop.
 */
function useScrollVelocity(active: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let target = 0;
    let smoothed = 0;
    let raf = 0;

    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const dy = Math.abs(window.scrollY - lastY);
      const speed = dy / dt; // px/ms
      target = Math.min(1, speed / 2.4); // 2.4 px/ms ≈ "fast"
      lastY = window.scrollY;
      lastT = now;
    };

    const tick = () => {
      // ease toward target, decay quickly when target is 0
      smoothed += (target - smoothed) * 0.18;
      target *= 0.92; // natural decay
      setV(smoothed);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [active]);
  return v;
}

/**
 * Loop-and-signal mark in palette gradient. Optional lowercase "jarvis" wordmark.
 * The signal dot orbits the loop on a 4s loop when animated. When reactToScroll
 * is true, the orbit speeds up while the user is scrolling fast (down to ~1.5s)
 * and slows back to its idle period when the user stops.
 * Honors prefers-reduced-motion via the surrounding @media in globals.css.
 */
export default function JarvisLogo({
  size = "md",
  wordmark = false,
  animated = true,
  className,
  reactToScroll = false,
}: JarvisLogoProps) {
  const px = SIZE_PX[size];
  const gradId = `jarvis-grad-${size}`;
  const baseDur = size === "xl" ? 6 : 4;
  const v = useScrollVelocity(reactToScroll && animated);
  // map velocity 0→1 to multiplier 1→0.4 (faster orbit when scrolling fast)
  const mult = 1 - v * 0.6;
  const orbitDur = `${(baseDur * mult).toFixed(2)}s`;

  return (
    <span
      className={clsx("inline-flex items-center gap-2", className)}
      aria-label="Jarvis"
      role="img"
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4775A" />
            <stop offset="50%" stopColor="#E09D5C" />
            <stop offset="100%" stopColor="#6B7FB5" />
          </linearGradient>
        </defs>
        {/* Loop path: J descender curls into a closed circle with an entry gap at top */}
        <path
          d="M16 4 a12 12 0 1 1 -8.5 3.5 L11 11 a7 7 0 1 0 5-2 z M16 0 v9"
          stroke={`url(#${gradId})`}
          strokeWidth={size === "xl" ? 1.6 : 2.5}
          fill="none"
          strokeLinecap="round"
        />
        {/* Signal dot — orbits the loop's circular section */}
        <circle r="1.6" fill="#E09D5C">
          {animated ? (
            <animateMotion
              dur={orbitDur}
              repeatCount="indefinite"
              path="M22 20 A6 6 0 1 1 22 19.99 Z"
            />
          ) : null}
          {!animated ? <set attributeName="cx" to="22" /> : null}
          {!animated ? <set attributeName="cy" to="20" /> : null}
        </circle>
      </svg>

      {wordmark ? (
        <span
          style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 300,
            fontSize: WORDMARK_PX[size],
            letterSpacing: "-0.3px",
            color: "#FAF8F4",
          }}
        >
          jarvis
        </span>
      ) : null}
    </span>
  );
}
