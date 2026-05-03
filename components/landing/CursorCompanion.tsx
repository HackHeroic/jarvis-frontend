"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A tiny copper dot that follows the cursor at 0.8x lag with a soft trailing
 * halo. Becomes brighter and slightly larger when over interactive elements
 * (anchor tags, buttons, inputs, textareas, [data-jarvis-hover]).
 *
 * Hidden on mobile (no cursor) and when prefers-reduced-motion.
 */
export default function CursorCompanion() {
  const dotRef = useRef<HTMLDivElement>(null);
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

    let mouseX = -100;
    let mouseY = -100;
    let dotX = -100;
    let dotY = -100;
    let haloX = -100;
    let haloY = -100;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onOverOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return setActive(false);
      const interactive = target.closest(
        "a, button, input, textarea, [role=button], [data-jarvis-hover]"
      );
      setActive(Boolean(interactive));
    };

    const tick = () => {
      // ease-out interpolation
      dotX += (mouseX - dotX) * 0.35;
      dotY += (mouseY - dotY) * 0.35;
      haloX += (mouseX - haloX) * 0.12;
      haloY += (mouseY - haloY) * 0.12;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
      }
      if (haloRef.current) {
        haloRef.current.style.transform = `translate(${haloX}px, ${haloY}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOverOut);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOverOut);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={haloRef}
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[60]"
        style={{
          width: active ? 56 : 32,
          height: active ? 56 : 32,
          borderRadius: "50%",
          background: active
            ? "radial-gradient(circle, rgba(212,119,90,0.28) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(212,119,90,0.14) 0%, transparent 70%)",
          transition: "width 0.3s ease, height 0.3s ease, background 0.3s ease",
          mixBlendMode: "screen",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[60]"
        style={{
          width: active ? 8 : 5,
          height: active ? 8 : 5,
          borderRadius: "50%",
          background: active ? "#E09D5C" : "#D4775A",
          boxShadow: active
            ? "0 0 16px #E09D5C, 0 0 4px #E09D5C"
            : "0 0 10px #D4775A",
          transition: "width 0.25s ease, height 0.25s ease, background 0.25s ease",
        }}
      />
    </>
  );
}
