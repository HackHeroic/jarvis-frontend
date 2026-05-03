"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cursor companion — a small HUD reticle that follows the cursor.
 *
 * Idle state:
 *   - center dot (2px, terra)
 *   - thin outer ring (24px, terra @ 35%)
 *   - 4 tick marks (N/S/E/W) at the cardinal points
 *   - soft halo glow behind everything
 *
 * Active state (hovering a, button, input, textarea, [data-jarvis-hover]):
 *   - ring scales up to ~30px and brightens to gold
 *   - tick marks extend outward
 *   - ring acquires a slow rotation
 *   - halo brightens and grows
 *
 * Hidden on touch / fine-pointer-less devices and when prefers-reduced-motion.
 */
export default function CursorCompanion() {
  const ringRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let mouseX = -200;
    let mouseY = -200;
    let ringX = -200;
    let ringY = -200;
    let haloX = -200;
    let haloY = -200;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return setActive(false);
      const interactive = target.closest(
        "a, button, input, textarea, [role=button], [data-jarvis-hover]"
      );
      setActive(Boolean(interactive));
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.32;
      ringY += (mouseY - ringY) * 0.32;
      haloX += (mouseX - haloX) * 0.12;
      haloY += (mouseY - haloY) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      }
      if (haloRef.current) {
        haloRef.current.style.transform = `translate(${haloX}px, ${haloY}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  const ringSize = active ? 30 : 24;
  const tickLen = active ? 6 : 4;
  const tickGap = active ? 5 : 4;
  const ringColor = active ? "#E09D5C" : "#D4775A";
  const ringOpacity = active ? 0.85 : 0.45;
  const dotColor = active ? "#FAF8F4" : "#E09D5C";
  const haloSize = active ? 64 : 38;

  return (
    <>
      {/* halo — slowest follow */}
      <div
        ref={haloRef}
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[60]"
        style={{
          width: haloSize,
          height: haloSize,
          borderRadius: "50%",
          background: active
            ? "radial-gradient(circle, rgba(224,157,92,0.30) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(212,119,90,0.18) 0%, transparent 70%)",
          transition:
            "width 0.35s ease, height 0.35s ease, background 0.35s ease",
          mixBlendMode: "screen",
        }}
      />

      {/* reticle — faster follow */}
      <div
        ref={ringRef}
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[60]"
        style={{
          width: ringSize,
          height: ringSize,
          transition: "width 0.25s ease, height 0.25s ease",
        }}
      >
        {/* outer ring — rotates slowly when active */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid ${ringColor}`,
            opacity: ringOpacity,
            transition: "border-color 0.25s ease, opacity 0.25s ease",
            boxShadow: active
              ? `0 0 12px rgba(224,157,92,0.45)`
              : "0 0 6px rgba(212,119,90,0.25)",
            animation: active ? "cc-ring-spin 6s linear infinite" : undefined,
          }}
        />

        {/* 4 cardinal tick marks (N/S/E/W) */}
        {(["n", "s", "e", "w"] as const).map((dir) => {
          const isVertical = dir === "n" || dir === "s";
          const offsetSide = isVertical ? "50%" : dir === "e" ? "100%" : "0%";
          const offsetCross = isVertical ? (dir === "n" ? "0%" : "100%") : "50%";
          const w = isVertical ? 1 : tickLen;
          const h = isVertical ? tickLen : 1;
          const ty = dir === "n" ? -tickGap : dir === "s" ? tickGap : 0;
          const tx = dir === "w" ? -tickGap : dir === "e" ? tickGap : 0;
          return (
            <span
              key={dir}
              style={{
                position: "absolute",
                left: isVertical ? offsetSide : offsetSide,
                top: isVertical ? offsetCross : offsetCross,
                width: w,
                height: h,
                background: ringColor,
                opacity: ringOpacity,
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                transition:
                  "background 0.25s ease, opacity 0.25s ease, transform 0.25s ease",
                boxShadow: active ? `0 0 6px ${ringColor}` : "none",
              }}
            />
          );
        })}

        {/* center dot */}
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: active ? 4 : 2,
            height: active ? 4 : 2,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: active
              ? `0 0 10px ${dotColor}`
              : `0 0 6px ${dotColor}`,
            transition:
              "width 0.25s ease, height 0.25s ease, background 0.25s ease",
          }}
        />
      </div>

      <style>{`
        @keyframes cc-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
