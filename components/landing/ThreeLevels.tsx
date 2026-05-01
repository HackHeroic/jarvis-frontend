"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const MINI_PLAN = [
  { time: "9:00", label: "Deep work · CNNs", color: "#D4775A" },
  { time: "11:00", label: "Gym (45m)", color: "#4A7B6B" },
  { time: "13:00", label: "Backprop study", color: "#6B7FB5" },
];

function MiniPlan() {
  const [order, setOrder] = useState([0, 1, 2]);

  useEffect(() => {
    const id = setInterval(() => {
      setOrder((prev) => {
        const next = [...prev];
        const a = Math.floor(Math.random() * 3);
        const b = (a + 1) % 3;
        [next[a], next[b]] = [next[b], next[a]];
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      {order.map((idx) => {
        const block = MINI_PLAN[idx];
        return (
          <motion.div
            key={block.label}
            layout
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-[12px]"
            style={{
              borderLeft: `2px solid ${block.color}`,
              background: `${block.color}1A`,
              color: "#FAF8F4",
            }}
          >
            <span className="text-[#FAF8F4]/50 font-mono w-12">{block.time}</span>
            <span>{block.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

const TIERS = [
  {
    label: "a calendar tells you when.",
    right: <span className="font-mono text-[12px] text-[#FAF8F4]/55">9:00 &nbsp; meeting with prof</span>,
    tickOpacity: 0.4,
    tickColor: "#4A7B6B",
  },
  {
    label: "a scheduler tells you what.",
    right: <span className="font-mono text-[12px] text-[#FAF8F4]/55">10:00 &nbsp; work on physics</span>,
    tickOpacity: 0.6,
    tickColor: "#4A7B6B",
  },
  {
    label: "i prepare.",
    right: <MiniPlan />,
    tickOpacity: 1,
    tickColor: "#D4775A",
  },
];

export default function ThreeLevels() {
  return (
    <section className="relative bg-[#1C1A17] py-32 md:py-40">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-16"
        >
          there&apos;s me, and there&apos;s everything before me.
        </motion.p>

        <div className="flex flex-col gap-24 md:gap-28">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center"
            >
              <div className="flex items-start gap-4">
                <span
                  className="block w-px h-12 mt-1"
                  style={{ backgroundColor: tier.tickColor, opacity: tier.tickOpacity }}
                />
                <p
                  className="text-[#FAF8F4] text-[24px] md:text-[28px] font-light leading-snug tracking-[-0.4px]"
                  style={{ opacity: i === 2 ? 1 : 0.75 }}
                >
                  {tier.label}
                </p>
              </div>
              <div>{tier.right}</div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.55 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-[#FAF8F4]/55 text-[14px] italic font-light text-center mt-24"
        >
          Same words on the calendar. Different relationship to your day.
        </motion.p>
      </div>
    </section>
  );
}
