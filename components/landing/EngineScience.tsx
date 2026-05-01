"use client";

import { useEffect, useState } from "react";

const STAGES = [
  {
    num: "01",
    glyph: "◴",
    name: "capture",
    speech: (
      <>
        I read your brain dump <em className="not-italic text-[#E09D5C] font-normal">once</em> — so you can stop rehearsing it in the shower{" "}
        <span className="text-[#FAF8F4]/45 italic text-[18px]">(yes, I know about that).</span>
      </>
    ),
    ref: "Decision Fatigue · Baumeister, 2003",
    note: "Every choice depletes self-regulation. Capture compresses a hundred small choices into one.",
  },
  {
    num: "02",
    glyph: "⌗",
    name: "shape",
    speech: (
      <>
        I cut it into <em className="not-italic text-[#E09D5C] font-normal">25-minute pieces</em>. Your working memory holds about four chunks. Bigger pieces?{" "}
        <span className="text-[#FAF8F4]/45 italic text-[18px]">They land on the floor. I checked.</span>
      </>
    ),
    ref: "Cognitive Load Theory · Sweller, 1988",
    note: "~4 chunks at a time. Anything heavier overflows working memory and stops being learned.",
  },
  {
    num: "03",
    glyph: "⌲",
    name: "place",
    speech: (
      <>
        I park each piece somewhere <em className="not-italic text-[#E09D5C] font-normal">specific</em> — when, where, after what. Vague intentions die alone.{" "}
        <span className="text-[#FAF8F4]/45 italic text-[18px]">Specific ones live to be done.</span>
      </>
    ),
    ref: "Implementation Intentions · Gollwitzer, 1999",
    note: "\"When-X-then-Y\" plans roughly triple action rates over abstract intent.",
  },
  {
    num: "04",
    glyph: "⊜",
    name: "listen",
    speech: (
      <>
        Skip something? Nothing breaks. No streak ruined, no eyebrow raised{" "}
        <span className="text-[#FAF8F4]/45 italic text-[18px]">— I don&apos;t have eyebrows.</span> I take the{" "}
        <em className="not-italic text-[#E09D5C] font-normal">data</em> and rebuild the day around you.
      </>
    ),
    ref: "Mastery Orientation · Dweck, 1986",
    note: "Failure as feedback (not verdict) sustains effort. Anti-guilt is structural here, not copy.",
  },
  {
    num: "05",
    glyph: "⌬",
    name: "remember",
    speech: (
      <>
        I bring things back <em className="not-italic text-[#E09D5C] font-normal">right before you&apos;d forget them</em> — not on a streak you&apos;ll resent, on the curve memory actually follows.{" "}
        <span className="text-[#FAF8F4]/45 italic text-[18px]">There&apos;s always a curve.</span>
      </>
    ),
    ref: "Spaced Repetition · Wozniak (SM-2), 1990",
    note: "Memory decays exponentially. Reviews at the inflection points minimize total time, maximize retention.",
  },
];

function useIterationCounter() {
  const [n, setN] = useState<number>(() => Math.floor(Date.now() / 1000) % 1_000_000);
  useEffect(() => {
    const id = setInterval(() => {
      setN((p) => p + Math.floor(Math.random() * 7) + 1);
    }, 1200);
    return () => clearInterval(id);
  }, []);
  return n;
}

export default function EngineScience() {
  const iter = useIterationCounter();

  return (
    <section className="relative bg-[#1C1A17] py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div
          className="relative rounded-[14px] overflow-hidden"
          style={{
            background: "#1A1815",
            padding: "80px 72px 64px",
            boxShadow: "inset 0 0 200px rgba(0,0,0,0.5)",
          }}
        >
          {/* radial glows */}
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              left: "-10%",
              bottom: "-30%",
              width: "60%",
              height: "80%",
              background: "radial-gradient(ellipse, rgba(212,119,90,0.07), transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              right: "-10%",
              top: "-20%",
              width: "50%",
              height: "60%",
              background: "radial-gradient(ellipse, rgba(107,127,181,0.04), transparent 70%)",
            }}
          />

          {/* corner crops */}
          {(["tl", "tr", "bl", "br"] as const).map((c) => {
            const isTop = c[0] === "t";
            const isLeft = c[1] === "l";
            return (
              <span
                key={c}
                aria-hidden
                className="absolute w-3.5 h-3.5"
                style={{
                  borderColor: "rgba(212,119,90,0.4)",
                  ...(isTop ? { top: 18, borderTopWidth: 1 } : { bottom: 18, borderBottomWidth: 1 }),
                  ...(isLeft ? { left: 18, borderLeftWidth: 1 } : { right: 18, borderRightWidth: 1 }),
                  borderStyle: "solid",
                }}
              />
            );
          })}

          {/* status bar */}
          <div className="flex justify-between items-center mb-12 font-mono text-[10.5px] tracking-[1.5px]">
            <span className="flex items-center gap-2 uppercase text-[#4A7B6B]/90">
              <span
                className="block w-[7px] h-[7px] rounded-full bg-[#4A7B6B]"
                style={{ boxShadow: "0 0 10px #4A7B6B", animation: "es-livepulse 1.6s ease-in-out infinite" }}
              />
              jarvis · running
            </span>
            <span className="uppercase text-[#FAF8F4]/35">
              iteration{" "}
              <strong className="text-[#D4775A]/85 font-medium tabular-nums">
                #{iter.toLocaleString()}
              </strong>{" "}
              · loop alive since day one
            </span>
          </div>

          {/* head */}
          <div className="block max-w-[820px] mb-16 relative z-10">
            <span className="block text-[#D4775A]/85 font-mono text-[11px] tracking-[3px] mb-6">
              ❮ how i think ❯
            </span>
            <h3 className="text-[#FAF8F4] text-[40px] md:text-[48px] font-light leading-[1.1] tracking-[-1.2px] mb-6 max-w-[780px]">
              I think in loops. <em className="not-italic text-[#D4775A] font-medium">So does your brain</em> — mine just doesn&apos;t crash for snacks.
            </h3>
            <p className="text-[#FAF8F4]/50 text-[15px] leading-[1.7] font-light max-w-[540px]">
              Five stages. Each one borrowed from a real paper. Hover a stage if you want the receipts.{" "}
              <em className="text-[#E09D5C]/70 not-italic">(I keep receipts.)</em>
            </p>
          </div>

          {/* stages with left rail */}
          <div className="relative pl-9">
            {/* rail line */}
            <span
              aria-hidden
              className="absolute"
              style={{
                left: 14,
                top: 30,
                bottom: 30,
                width: 1,
                background: "linear-gradient(to bottom, transparent, rgba(212,119,90,0.3) 8%, rgba(212,119,90,0.3) 92%, transparent)",
              }}
            />
            {/* traveling pulse */}
            <span
              aria-hidden
              className="absolute"
              style={{
                left: 11,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#D4775A",
                boxShadow: "0 0 12px #D4775A",
                animation: "es-travel 8s ease-in-out infinite",
              }}
            />

            {STAGES.map((s, i) => (
              <div
                key={s.num}
                className="es-row grid grid-cols-[96px_minmax(0,1.4fr)_minmax(0,1fr)] gap-12 py-7 transition-colors duration-300 relative"
                style={{
                  borderTop: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="flex items-center gap-3 font-mono text-[11px] text-[#FAF8F4]/35 tracking-[1.5px] pt-1.5">
                  <span
                    className="es-glyph inline-flex items-center justify-center w-7 h-7 rounded-full text-[#D4775A] text-[13px] transition-all"
                    style={{
                      background: "rgba(212,119,90,0.08)",
                      border: "1px solid rgba(212,119,90,0.25)",
                    }}
                  >
                    {s.glyph}
                  </span>
                  <span>
                    <span className="block text-[#D4775A] text-[24px] font-extralight leading-none">{s.num}</span>
                    <span className="block mt-1">{s.name}</span>
                  </span>
                </span>

                <p className="text-[#FAF8F4] text-[22px] md:text-[23px] leading-[1.5] font-light tracking-[-0.2px]">
                  {s.speech}
                </p>

                <span className="es-marg block font-mono text-[11.5px] text-[#FAF8F4]/40 leading-[1.75] pt-1.5 transition-colors">
                  <span
                    className="es-ref block mb-1.5 tracking-[0.4px] transition-colors"
                    style={{ color: "rgba(74,123,107,0.7)" }}
                  >
                    ⌬ &nbsp;{s.ref}
                  </span>
                  <span className="block text-[#FAF8F4]/45 italic">{s.note}</span>
                </span>
              </div>
            ))}
          </div>

          {/* closing */}
          <div className="flex items-center gap-5 mt-12 pt-7 border-t border-white/[0.07] relative z-10">
            <span
              className="block w-[9px] h-[9px] rounded-full bg-[#D4775A] flex-shrink-0"
              style={{ boxShadow: "0 0 18px #D4775A", animation: "es-livepulse 2.4s ease-in-out infinite" }}
            />
            <p className="text-[16px] leading-[1.6] text-[#FAF8F4]/65 font-light max-w-[720px]">
              Then I close the loop. Tomorrow, I&apos;m a little more like you. Day 1, useful. Month 3, yours. Year 1, <span className="text-[#FAF8F4] font-normal">irreplaceable</span> — <span className="text-[#FAF8F4]/45 italic">or so my training data assures me.</span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes es-livepulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes es-travel {
          0% { top: 30px; opacity: 0.2; }
          10% { opacity: 1; }
          20% { top: 18%; }
          40% { top: 38%; }
          60% { top: 58%; }
          80% { top: 78%; }
          90% { opacity: 1; }
          100% { top: calc(100% - 30px); opacity: 0.2; }
        }
        .es-row:hover { background: rgba(212,119,90,0.04); }
        .es-row:hover .es-marg { color: rgba(250,248,244,0.72); }
        .es-row:hover .es-ref { color: rgba(74,123,107,1) !important; }
        .es-row:hover .es-glyph {
          background: rgba(212,119,90,0.18) !important;
          border-color: rgba(212,119,90,0.5) !important;
        }
      `}</style>
    </section>
  );
}
