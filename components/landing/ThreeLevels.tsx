"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Progressive intelligence flow.
 *  - vertical connector line on the left (terra gradient, opacity ramps with scroll)
 *  - a glowing node travels down the connector as the user scrolls through
 *  - tiers visually escalate: T1 minimal → T2 slight motion → T3 full activation
 *  - on T3 ("i prepare") the mini-plan reorders gently every ~6s with breathing glow
 */

const MINI_PLAN = [
  { time: "9:00", label: "Deep work · CNNs", color: "#D4775A" },
  { time: "11:00", label: "Gym (45m)", color: "#4A7B6B" },
  { time: "13:00", label: "Backprop study", color: "#6B7FB5" },
];

function MiniPlan({ active }: { active: boolean }) {
  const [order, setOrder] = useState([0, 1, 2]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setOrder((prev) => {
        const next = [...prev];
        const a = Math.floor(Math.random() * 3);
        const b = (a + 1) % 3;
        [next[a], next[b]] = [next[b], next[a]];
        return next;
      });
    }, 6000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="relative flex flex-col gap-1.5">
      {/* breathing halo when this tier is active */}
      {active ? (
        <div
          aria-hidden
          className="absolute -inset-3 rounded-xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(212,119,90,0.16), transparent 70%)",
            animation: "tl-breathe 4.5s ease-in-out infinite",
          }}
        />
      ) : null}
      {order.map((idx) => {
        const block = MINI_PLAN[idx];
        return (
          <motion.div
            key={block.label}
            layout
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative flex items-center gap-3 rounded-md px-3 py-2 text-[12px] backdrop-blur-sm"
            style={{
              borderLeft: `2px solid ${block.color}`,
              background: `linear-gradient(90deg, ${block.color}26, ${block.color}10 60%, transparent)`,
              color: "#FAF8F4",
              boxShadow: active ? `0 0 18px ${block.color}22` : "none",
            }}
          >
            <span className="text-[#FAF8F4]/55 font-mono w-12">{block.time}</span>
            <span className="flex-1">{block.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

const TIERS = [
  {
    eyebrow: "tier 01",
    label: "a calendar tells you when.",
    note: "You provide the structure. It just records.",
    rightStatic: (
      <span className="font-mono text-[12px] text-[#FAF8F4]/45">9:00 &nbsp; meeting with prof</span>
    ),
  },
  {
    eyebrow: "tier 02",
    label: "a scheduler tells you what.",
    note: "It assigns work. You still drive.",
    rightStatic: (
      <span className="font-mono text-[12px] text-[#FAF8F4]/65">10:00 &nbsp; work on physics</span>
    ),
  },
  {
    eyebrow: "tier 03",
    label: "i prepare.",
    note: "I read your day before it begins. I move pieces while you sleep.",
    rightStatic: null,
  },
];

export default function ThreeLevels() {
  const sectionRef = useRef<HTMLElement>(null);
  const tierRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const t1InView = useInView(tierRefs[0], { once: true, amount: 0.5 });
  const t2InView = useInView(tierRefs[1], { once: true, amount: 0.5 });
  const t3InView = useInView(tierRefs[2], { once: true, amount: 0.5 });

  // Scroll progress for the section drives a glowing node down the connector.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 30%"],
  });
  const nodeY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const nodeOpacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 1, 1, 0]);

  return (
    <section ref={sectionRef} className="relative bg-[#1C1A17] py-32 md:py-40 overflow-hidden">
      {/* faint warm vignette behind the third tier */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: "-10%",
          bottom: "0%",
          width: "60%",
          height: "55%",
          background: "radial-gradient(ellipse, rgba(212,119,90,0.08), transparent 70%)",
        }}
      />

      <div className="max-w-5xl mx-auto px-6 md:px-12 relative">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.95, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[#D4775A]/95 text-[11px] tracking-[2.5px] font-mono mb-16 uppercase"
        >
          there&apos;s me, and there&apos;s everything before me.
        </motion.p>

        {/* Vertical connector + scroll-driven traveling node (desktop) */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute hidden md:block top-2 bottom-2 w-px"
            style={{
              left: 9,
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(212,119,90,0.15) 8%, rgba(212,119,90,0.45) 50%, rgba(212,119,90,0.85) 92%, transparent 100%)",
            }}
          />
          <motion.span
            aria-hidden
            className="absolute hidden md:block w-[9px] h-[9px] rounded-full"
            style={{
              left: 5,
              top: nodeY,
              background: "#D4775A",
              boxShadow: "0 0 16px #D4775A, 0 0 4px #D4775A",
              opacity: nodeOpacity,
              translateY: "-50%",
            }}
          />

          <div className="flex flex-col gap-24 md:gap-32 pl-0 md:pl-12">
            {TIERS.map((tier, i) => {
              const inView = [t1InView, t2InView, t3InView][i];
              const isThird = i === 2;
              return (
                <motion.div
                  key={tier.label}
                  ref={tierRefs[i]}
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                  className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-10 md:gap-16 items-center"
                >
                  <div className="relative">
                    <p
                      className="font-mono text-[10px] tracking-[2px] uppercase mb-3"
                      style={{
                        color:
                          i === 0
                            ? "rgba(250,248,244,0.35)"
                            : i === 1
                            ? "rgba(250,248,244,0.55)"
                            : "rgba(212,119,90,0.95)",
                      }}
                    >
                      {tier.eyebrow}
                    </p>
                    <p
                      className="text-[#FAF8F4] font-light leading-[1.15] tracking-[-0.4px] mb-3"
                      style={{
                        fontSize: i === 2 ? 38 : i === 1 ? 30 : 26,
                        opacity: i === 0 ? 0.55 : i === 1 ? 0.78 : 1,
                      }}
                    >
                      {isThird ? (
                        <motion.span
                          animate={
                            inView
                              ? {
                                  textShadow: [
                                    "0 0 0 rgba(212,119,90,0)",
                                    "0 0 24px rgba(212,119,90,0.5)",
                                    "0 0 12px rgba(212,119,90,0.25)",
                                  ],
                                }
                              : {}
                          }
                          transition={{ duration: 2.6, delay: 0.4 }}
                          className="text-[#D4775A] font-medium"
                        >
                          {tier.label}
                        </motion.span>
                      ) : (
                        tier.label
                      )}
                    </p>
                    <p
                      className="font-light italic"
                      style={{
                        fontSize: 13,
                        color:
                          i === 0
                            ? "rgba(250,248,244,0.30)"
                            : i === 1
                            ? "rgba(250,248,244,0.45)"
                            : "rgba(250,248,244,0.65)",
                      }}
                    >
                      {tier.note}
                    </p>
                  </div>

                  <div>
                    {tier.rightStatic ? (
                      <div className="rounded-md px-3 py-2 inline-block">
                        {tier.rightStatic}
                      </div>
                    ) : (
                      <MiniPlan active={inView} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.55 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-[#FAF8F4]/55 text-[14px] italic font-light text-center mt-28"
        >
          You&apos;re not late. You just don&apos;t have me yet.
        </motion.p>
      </div>

      <style>{`
        @keyframes tl-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>
    </section>
  );
}
