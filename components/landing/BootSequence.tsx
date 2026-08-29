"use client";

import { useEffect, useState } from "react";
import JarvisLogo from "./JarvisLogo";

/**
 * Cinematic boot sequence — Iron-Man-Jarvis startup, warm-palette universe.
 *
 * Layers (back → front):
 *   0  film grain
 *   1  warm nebula (slow rotating radial cloud)
 *   2  star field (deterministic copper/amber dots, twinkle)
 *   3  perspective grid floor (CSS 3D, recedes into distance)
 *   4  rotating wireframe gadgets — dodecahedron / cube / orbital rings
 *   5  corner HUD diagnostics — diagnostic ring, data stream, signal bars,
 *      rotating polyhedron readout
 *   6  orb + wordmark + tagline (center stack)
 *   7  status type-out
 *   8  skip hint
 *
 * Timeline (~5s, skippable):
 *   black 300ms → boot 1400ms → orb 1000ms → name 1500ms → ready 700ms → fade 700ms
 */

const BOOT_LINES = [
  { text: "initializing", channel: "neural" },
  { text: "loading psychology frameworks", channel: "core" },
  { text: "calibrating constraint solver", channel: "math" },
  { text: "ready", channel: "ok" },
];

const SKIP_KEY = "jarvis-booted-v1";

type Phase = "black" | "boot" | "orb" | "name" | "ready" | "fade" | "done";

/* --------------------- Layer 1: Nebula -------------------- */
function Nebula({ phase }: { phase: Phase }) {
  const visible = phase !== "black";
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 1100px 700px at 50% 55%, rgba(212,119,90,0.22) 0%, rgba(224,157,92,0.12) 25%, rgba(107,127,181,0.08) 55%, transparent 75%)",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.4s ease-out",
        animation: "boot-nebula-rotate 60s linear infinite",
      }}
    />
  );
}

/* --------------------- Layer 2: Star field -------------------- */
function StarField({ phase }: { phase: Phase }) {
  const visible = phase !== "black";
  // Deterministic star positions to avoid SSR hydration mismatch.
  const stars = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 17.31) % 100;
    const y = (i * 31.71) % 100;
    const sz = (i % 3) === 0 ? 2 : 1;
    const delay = (i * 0.13) % 4;
    const dur = 2.4 + ((i * 0.27) % 2.6);
    const tone = i % 5 === 0 ? "#E09D5C" : i % 7 === 0 ? "#FAF8F4" : "#D4775A";
    return { x, y, sz, delay, dur, tone, key: i };
  });
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 1.6s ease-out" }}
    >
      {stars.map((s) => (
        <span
          key={s.key}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.sz,
            height: s.sz,
            borderRadius: "50%",
            background: s.tone,
            boxShadow: `0 0 ${s.sz * 4}px ${s.tone}`,
            opacity: 0.6,
            animation: `boot-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* --------------------- Layer 3: Perspective grid -------------------- */
function PerspectiveGrid({ phase }: { phase: Phase }) {
  const visible = phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden"
      style={{
        height: "55%",
        perspective: 700,
        opacity: visible ? 0.5 : 0,
        transition: "opacity 1.4s ease-out",
        maskImage:
          "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: "rotateX(62deg) translateY(20%) translateZ(-180px)",
          transformOrigin: "50% 100%",
          backgroundImage:
            "linear-gradient(0deg, rgba(212,119,90,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(212,119,90,0.32) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "boot-grid-move 18s linear infinite",
        }}
      />
    </div>
  );
}

/* --------------------- Layer 4: 3D wireframe gadgets -------------------- */
function WireDodecahedron({ size = 120, color = "#D4775A" }: { size?: number; color?: string }) {
  // Stylized dodecahedron-ish wireframe (10-pointed star shell)
  const pts: string[] = [];
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    const rr = i % 2 === 0 ? r : r * 0.62;
    pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
        strokeLinejoin="round"
        opacity={0.55}
      />
      <circle cx={cx} cy={cy} r={r * 0.35} fill="none" stroke={color} strokeWidth={0.6} opacity={0.4} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={color} strokeWidth={0.5} opacity={0.3} />
      {/* connecting spokes */}
      {pts.map((p, i) => {
        const [x, y] = p.split(",").map(Number);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={0.4}
            opacity={0.25}
          />
        );
      })}
    </svg>
  );
}

function WireCube({ size = 90, color = "#E09D5C" }: { size?: number; color?: string }) {
  const s = size;
  const o = size * 0.18; // perspective offset
  return (
    <svg width={s + o} height={s + o} viewBox={`0 0 ${s + o} ${s + o}`}>
      {/* back face */}
      <polygon
        points={`${o},0 ${s + o},0 ${s + o},${s} ${o},${s}`}
        fill="none"
        stroke={color}
        strokeWidth={0.7}
        opacity={0.4}
      />
      {/* front face */}
      <polygon
        points={`0,${o} ${s},${o} ${s},${s + o} 0,${s + o}`}
        fill="none"
        stroke={color}
        strokeWidth={0.9}
        opacity={0.7}
      />
      {/* connectors */}
      <line x1={0} y1={o} x2={o} y2={0} stroke={color} strokeWidth={0.5} opacity={0.4} />
      <line x1={s} y1={o} x2={s + o} y2={0} stroke={color} strokeWidth={0.5} opacity={0.4} />
      <line x1={s} y1={s + o} x2={s + o} y2={s} stroke={color} strokeWidth={0.5} opacity={0.4} />
      <line x1={0} y1={s + o} x2={o} y2={s} stroke={color} strokeWidth={0.5} opacity={0.4} />
    </svg>
  );
}

function WireOrbit({ size = 160, color = "#6B7FB5" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <ellipse
        cx={size / 2}
        cy={size / 2}
        rx={size / 2 - 4}
        ry={size / 5}
        fill="none"
        stroke={color}
        strokeWidth={0.7}
        opacity={0.45}
      />
      <ellipse
        cx={size / 2}
        cy={size / 2}
        rx={size / 2 - 4}
        ry={size / 3}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        opacity={0.35}
        transform={`rotate(60 ${size / 2} ${size / 2})`}
      />
      <ellipse
        cx={size / 2}
        cy={size / 2}
        rx={size / 2 - 4}
        ry={size / 4}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        opacity={0.35}
        transform={`rotate(-60 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function GadgetField({ phase }: { phase: Phase }) {
  const visible = phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  const fade = phase === "fade";
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: visible && !fade ? 1 : fade ? 0 : 0,
        transition: "opacity 1.4s ease-out",
      }}
    >
      {/* upper-left dodecahedron */}
      <div
        className="absolute hidden md:block"
        style={{
          top: "12%",
          left: "8%",
          animation: "boot-spin 28s linear infinite, boot-float 9s ease-in-out infinite",
          filter: "drop-shadow(0 0 12px rgba(212,119,90,0.35))",
        }}
      >
        <WireDodecahedron size={140} color="#D4775A" />
      </div>

      {/* upper-right tilted orbit rings */}
      <div
        className="absolute hidden md:block"
        style={{
          top: "16%",
          right: "10%",
          animation: "boot-spin-rev 36s linear infinite",
          filter: "drop-shadow(0 0 12px rgba(107,127,181,0.3))",
        }}
      >
        <WireOrbit size={180} color="#6B7FB5" />
      </div>

      {/* bottom-left cube */}
      <div
        className="absolute hidden md:block"
        style={{
          bottom: "16%",
          left: "12%",
          animation: "boot-spin 22s linear infinite, boot-float 7s ease-in-out infinite",
          filter: "drop-shadow(0 0 10px rgba(224,157,92,0.4))",
        }}
      >
        <WireCube size={100} color="#E09D5C" />
      </div>

      {/* bottom-right small dodec */}
      <div
        className="absolute hidden md:block"
        style={{
          bottom: "12%",
          right: "9%",
          animation: "boot-spin-rev 24s linear infinite, boot-float 8s ease-in-out infinite",
          filter: "drop-shadow(0 0 10px rgba(212,119,90,0.35))",
        }}
      >
        <WireDodecahedron size={110} color="#D4775A" />
      </div>

      {/* tiny floating dot — second sun */}
      <div
        className="absolute"
        style={{
          top: "26%",
          right: "26%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#E09D5C",
          boxShadow: "0 0 18px #E09D5C",
          animation: "boot-twinkle 2.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* --------------------- Layer 5: Corner HUD diagnostics -------------------- */
function CornerDiagnosticTL({ phase }: { phase: Phase }) {
  const visible = phase === "boot" || phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  // Sweep percentage from 0 → 100 across the boot phases (approx).
  const pct =
    phase === "boot" ? 35 : phase === "orb" ? 62 : phase === "name" ? 88 : phase === "ready" ? 100 : 100;
  const circ = 2 * Math.PI * 22;
  const dash = (pct / 100) * circ;
  return (
    <div
      className="absolute top-5 left-5 hidden md:flex items-center gap-3 font-mono text-[9.5px] tracking-[1.5px] uppercase text-[#FAF8F4]/65"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease-out" }}
    >
      <svg width={56} height={56} viewBox="0 0 56 56" style={{ animation: "boot-spin 8s linear infinite" }}>
        <circle cx={28} cy={28} r={22} fill="none" stroke="rgba(212,119,90,0.18)" strokeWidth={1} />
        <circle
          cx={28}
          cy={28}
          r={22}
          fill="none"
          stroke="#D4775A"
          strokeWidth={1.5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dasharray 0.7s ease-out" }}
        />
        <circle cx={28} cy={28} r={14} fill="none" stroke="rgba(212,119,90,0.28)" strokeWidth={0.6} />
        <text x={28} y={32} textAnchor="middle" fontSize={9} fill="#E09D5C" fontFamily="ui-monospace">
          {pct}%
        </text>
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="text-[#D4775A]">● core sync</span>
        <span className="text-[#FAF8F4]/35">v1.0.0 · jarvis-engine</span>
      </div>
    </div>
  );
}

function CornerDataStreamTR({ phase }: { phase: Phase }) {
  const visible = phase === "boot" || phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  const lines = [
    "0x4f1a · solver mounted",
    "0x5b03 · memory store online",
    "0x71e2 · psych frameworks ok",
    "0x88c7 · doc index built (12)",
    "0x9d44 · loop engaged",
    "0xae21 · ambient watchers · 4",
    "0xbf08 · constraint set · 0 conflicts",
  ];
  return (
    <div
      className="absolute top-5 right-5 hidden md:block font-mono text-[9.5px] tracking-[1px] text-[#FAF8F4]/40 text-right max-w-[280px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease-out" }}
    >
      <div className="text-[#D4775A] mb-1.5 uppercase tracking-[1.5px]">● bootlog · stream</div>
      <div className="flex flex-col gap-0.5">
        {lines.map((l, i) => (
          <div
            key={l}
            style={{
              animation: `boot-stream-in 0.5s ease-out ${0.2 + i * 0.18}s both`,
              opacity: 0,
            }}
          >
            <span className="text-[#FAF8F4]/25">{l.split(" · ")[0]}</span>{" "}
            <span className="text-[#FAF8F4]/55">·</span>{" "}
            <span className="text-[#FAF8F4]/65">{l.split(" · ")[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CornerSignalBL({ phase }: { phase: Phase }) {
  const visible = phase === "boot" || phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  return (
    <div
      className="absolute bottom-16 left-5 hidden md:flex items-center gap-3 font-mono text-[9.5px] tracking-[1.5px] uppercase text-[#FAF8F4]/60"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease-out" }}
    >
      <div className="flex items-end gap-[3px] h-7">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 8 + (i % 4) * 4,
              background: "#D4775A",
              opacity: 0.4 + (i % 4) * 0.15,
              borderRadius: 1,
              animation: `boot-bar ${1 + (i % 3) * 0.4}s ease-in-out ${i * 0.08}s infinite`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[#4A7B6B]">● signal · stable</span>
        <span className="text-[#FAF8F4]/35">latency 4ms · ambient · 4 ch</span>
      </div>
    </div>
  );
}

function CornerGeometricBR({ phase }: { phase: Phase }) {
  const visible = phase === "orb" || phase === "name" || phase === "ready" || phase === "fade";
  return (
    <div
      className="absolute bottom-16 right-5 hidden md:flex items-center gap-3 font-mono text-[9.5px] tracking-[1.5px] uppercase text-[#FAF8F4]/60"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease-out" }}
    >
      <div className="flex flex-col gap-0.5 text-right">
        <span className="text-[#E09D5C]">● topology · ok</span>
        <span className="text-[#FAF8F4]/35">nodes 5 · edges 12 · loop closed</span>
      </div>
      <svg
        width={48}
        height={48}
        viewBox="0 0 48 48"
        style={{ animation: "boot-spin-rev 6s linear infinite" }}
      >
        <polygon
          points="24,4 42,16 38,38 10,38 6,16"
          fill="none"
          stroke="#E09D5C"
          strokeWidth={1.2}
          opacity={0.7}
        />
        <polygon
          points="24,12 36,20 33,33 15,33 12,20"
          fill="none"
          stroke="#E09D5C"
          strokeWidth={0.6}
          opacity={0.45}
        />
        <circle cx={24} cy={24} r={2} fill="#E09D5C" opacity={0.85} />
      </svg>
    </div>
  );
}

/* --------------------- Component -------------------- */
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
      className="fixed inset-0 z-[100] bg-[#080605] flex items-center justify-center overflow-hidden"
      style={{
        opacity: isFading ? 0 : 1,
        transform: isFading ? "scale(1.06)" : "scale(1)",
        transition: "opacity 0.7s ease-out, transform 0.9s ease-out",
      }}
      aria-label="Jarvis booting"
      role="status"
    >
      {/* film grain */}
      <div className="landing-grain" style={{ position: "absolute" }} aria-hidden />

      {/* universe layers */}
      <Nebula phase={phase} />
      <StarField phase={phase} />
      <PerspectiveGrid phase={phase} />
      <GadgetField phase={phase} />

      {/* corner HUD diagnostics */}
      <CornerDiagnosticTL phase={phase} />
      <CornerDataStreamTR phase={phase} />
      <CornerSignalBL phase={phase} />
      <CornerGeometricBR phase={phase} />

      {/* faint vignette to focus center */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.65) 90%)",
        }}
      />

      {/* center stack */}
      <div className="relative z-10 flex flex-col items-center gap-10 max-w-md px-6 text-center">
        {/* halo around orb */}
        <div className="relative">
          {orbVisible ? (
            <div
              aria-hidden
              className="absolute -inset-16 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,119,90,0.35) 0%, rgba(212,119,90,0.10) 30%, transparent 60%)",
                filter: "blur(8px)",
                animation: "boot-halo 3.4s ease-in-out infinite",
              }}
            />
          ) : null}

          {/* concentric scanning ring */}
          {orbVisible ? (
            <div
              aria-hidden
              className="absolute -inset-8 rounded-full pointer-events-none"
              style={{
                border: "1px dashed rgba(212,119,90,0.4)",
                animation: "boot-spin 12s linear infinite",
              }}
            />
          ) : null}

          <div
            style={{
              transform: orbVisible ? "scale(1)" : "scale(0.05)",
              opacity: orbVisible ? 1 : 0,
              transition:
                "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out, filter 1.2s ease-out",
              filter: orbVisible ? "blur(0)" : "blur(6px)",
            }}
          >
            <JarvisLogo size="xl" wordmark={false} animated={orbVisible} />
          </div>
        </div>

        {/* wordmark + tagline */}
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
              textShadow: nameVisible ? "0 0 30px rgba(212,119,90,0.35)" : "none",
              transition: "text-shadow 1s ease-out",
            }}
          >
            jarvis
          </h1>
          <p className="text-[#D4775A] text-[11px] md:text-[12px] tracking-[3px] uppercase font-mono">
            super-intelligence · applied to real life
          </p>
          <p
            className="text-[#FAF8F4]/55 text-[12px] md:text-[13px] font-light italic max-w-sm"
            style={{
              opacity: readyVisible ? 1 : 0,
              transition: "opacity 0.6s ease-out 0.2s",
            }}
          >
            I&apos;m awake. I already know what your day looks like.
          </p>
        </div>
      </div>

      {/* boot status — bottom center */}
      {phase !== "black" ? (
        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-1.5 font-mono text-[10px] tracking-[1.5px] uppercase">
          {BOOT_LINES.slice(0, bootLine).map((line) => {
            const isReady = line.text === "ready";
            return (
              <div
                key={line.text}
                className="flex items-center gap-2"
                style={{
                  color: isReady ? "#4A7B6B" : "rgba(250,248,244,0.55)",
                  animation: "boot-line-in 0.45s ease-out",
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

      {/* skip hint */}
      <p className="absolute bottom-4 right-6 text-[#FAF8F4]/30 text-[9.5px] font-mono tracking-[1.5px] uppercase z-10">
        any key skips
      </p>

      <style>{`
        @keyframes boot-line-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes boot-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50%      { opacity: 0.95; transform: scale(1.15); }
        }
        @keyframes boot-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes boot-spin-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes boot-float {
          0%, 100% { transform-origin: center; translate: 0 0; }
          50%      { translate: 0 -10px; }
        }
        @keyframes boot-nebula-rotate {
          from { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.04); }
          to   { transform: rotate(360deg) scale(1); }
        }
        @keyframes boot-grid-move {
          from { background-position: 0 0; }
          to   { background-position: 0 60px; }
        }
        @keyframes boot-halo {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.08); }
        }
        @keyframes boot-bar {
          0%, 100% { transform: scaleY(0.4); }
          50%      { transform: scaleY(1); }
        }
        @keyframes boot-stream-in {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 0.7; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
