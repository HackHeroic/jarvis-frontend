"use client";

import { useEffect, useState } from "react";
import JarvisLogo from "./JarvisLogo";

/**
 * Cinematic boot sequence shown once per session before the landing reveals.
 *
 * Timeline:
 *   0  →  300ms  · pure black + grain settling
 *   300 → 1700ms · status lines type out (4 lines, ~350ms each)
 *   1700 → 2700ms · orb fires up (scale 0 → 1, dim → bright)
 *   2700 → 4200ms · wordmark "jarvis" + tagline reveal
 *   4200 → 4900ms · final ● ready beat
 *   4900 → 5500ms · whole overlay fades + scales out
 *
 * Skippable: any click or keypress jumps to the end.
 * Persisted: sessionStorage key "jarvis-booted-v1" so reload doesn't replay.
 * Reduced motion: bails immediately, lands on the page with no animation.
 */

const BOOT_LINES = [
  { text: "initializing", channel: "neural" },
  { text: "loading psychology frameworks", channel: "core" },
  { text: "calibrating constraint solver", channel: "math" },
  { text: "ready", channel: "ok" },
];

const SKIP_KEY = "jarvis-booted-v1";

type Phase = "black" | "boot" | "orb" | "name" | "ready" | "fade" | "done";

export default function BootSequence() {
  const [phase, setPhase] = useState<Phase>("black");
  const [bootLine, setBootLine] = useState(0);

  // skip immediately if already booted this session OR reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SKIP_KEY) === "1") {
      setPhase("done");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem(SKIP_KEY, "1");
      setPhase("done");
      return;
    }

    // lock body scroll while booting
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // phase timeline
  useEffect(() => {
    if (phase === "done") return;
    const ts: ReturnType<typeof setTimeout>[] = [];
    if (phase === "black") {
      ts.push(setTimeout(() => setPhase("boot"), 300));
    } else if (phase === "boot") {
      ts.push(setTimeout(() => setPhase("orb"), 1700));
    } else if (phase === "orb") {
      ts.push(setTimeout(() => setPhase("name"), 1000));
    } else if (phase === "name") {
      ts.push(setTimeout(() => setPhase("ready"), 1500));
    } else if (phase === "ready") {
      ts.push(setTimeout(() => setPhase("fade"), 700));
    } else if (phase === "fade") {
      ts.push(
        setTimeout(() => {
          sessionStorage.setItem(SKIP_KEY, "1");
          document.body.style.overflow = "";
          setPhase("done");
        }, 700)
      );
    }
    return () => ts.forEach(clearTimeout);
  }, [phase]);

  // boot line stagger
  useEffect(() => {
    if (phase !== "boot") return;
    if (bootLine >= BOOT_LINES.length) return;
    const t = setTimeout(() => setBootLine((i) => i + 1), 350);
    return () => clearTimeout(t);
  }, [phase, bootLine]);

  // skip on click/key
  useEffect(() => {
    if (phase === "done" || phase === "fade") return;
    const skip = () => setPhase("fade");
    window.addEventListener("click", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("click", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);

  if (phase === "done") return null;

  const isFading = phase === "fade";
  const orbVisible = phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  const nameVisible = phase === "name" || phase === "ready" || phase === "fade";
  const readyVisible = phase === "ready" || phase === "fade";

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0B0907] flex items-center justify-center"
      style={{
        opacity: isFading ? 0 : 1,
        transform: isFading ? "scale(1.05)" : "scale(1)",
        transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
      }}
      aria-label="Jarvis booting"
      role="status"
    >
      {/* film grain */}
      <div className="landing-grain" style={{ position: "absolute" }} aria-hidden />

      {/* warm radial breathing behind the orb */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(212,119,90,0.20) 0%, rgba(212,119,90,0.06) 30%, transparent 65%)",
          opacity: orbVisible ? 1 : 0,
          transition: "opacity 1.2s ease-out",
        }}
      />

      {/* faint vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-md px-6 text-center">
        {/* Orb */}
        <div
          style={{
            transform: orbVisible ? "scale(1)" : "scale(0.05)",
            opacity: orbVisible ? 1 : 0,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out",
            filter: orbVisible ? "blur(0)" : "blur(6px)",
            transitionProperty: "transform, opacity, filter",
          }}
        >
          <JarvisLogo size="xl" wordmark={false} animated={orbVisible} />
        </div>

        {/* Wordmark + tagline */}
        <div
          className="flex flex-col items-center gap-4"
          style={{
            opacity: nameVisible ? 1 : 0,
            transform: nameVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
          }}
        >
          <h1
            className="text-[#FAF8F4] text-[44px] md:text-[52px] font-light tracking-[-1.4px] leading-none"
            style={{
              textShadow: nameVisible ? "0 0 30px rgba(212,119,90,0.3)" : "none",
              transition: "text-shadow 1s ease-out",
            }}
          >
            jarvis
          </h1>
          <p className="text-[#D4775A] text-[11px] md:text-[12px] tracking-[3px] uppercase font-mono">
            super-intelligence · applied to real life
          </p>
          <p
            className="text-[#FAF8F4]/45 text-[12px] md:text-[13px] font-light italic max-w-sm"
            style={{
              opacity: readyVisible ? 1 : 0,
              transition: "opacity 0.6s ease-out 0.2s",
            }}
          >
            I&apos;m awake. I already know what your day looks like.
          </p>
        </div>
      </div>

      {/* Boot status — bottom center */}
      {phase === "boot" || phase === "orb" || phase === "name" || phase === "ready" || phase === "fade" ? (
        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-1.5 font-mono text-[10px] tracking-[1.5px] uppercase">
          {BOOT_LINES.slice(0, bootLine).map((line) => {
            const isReady = line.text === "ready";
            return (
              <div
                key={line.text}
                className="flex items-center gap-2 animate-[boot-line-in_0.45s_ease-out]"
                style={{
                  color: isReady ? "#4A7B6B" : "rgba(250,248,244,0.45)",
                }}
              >
                <span style={{ color: isReady ? "#4A7B6B" : "#D4775A" }}>●</span>
                <span className="text-[#FAF8F4]/30 w-[42px] text-right">{line.channel}</span>
                <span className="text-[#FAF8F4]/20">·</span>
                <span>{line.text}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Skip hint */}
      <p className="absolute bottom-4 right-6 text-[#FAF8F4]/25 text-[9.5px] font-mono tracking-[1.5px] uppercase">
        any key skips
      </p>

      <style>{`
        @keyframes boot-line-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
