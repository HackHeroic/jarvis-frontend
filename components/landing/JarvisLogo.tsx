"use client";

import { CSSProperties } from "react";
import clsx from "clsx";

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
}

/**
 * Loop-and-signal mark in palette gradient. Optional lowercase "jarvis" wordmark.
 * The signal dot orbits the loop on a 4s loop when animated.
 * Honors prefers-reduced-motion via the surrounding @media in globals.css.
 */
export default function JarvisLogo({
  size = "md",
  wordmark = false,
  animated = true,
  className,
}: JarvisLogoProps) {
  const px = SIZE_PX[size];
  const gradId = `jarvis-grad-${size}`;
  const orbitDur = size === "xl" ? "6s" : "4s";

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
