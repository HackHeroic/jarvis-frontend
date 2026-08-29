# Jarvis Landing Superintelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `jarvis-frontend` landing page into a superintelligence-voiced, motion-rich experience that mirrors the VC pitch deck — vision-led, psychology-anchored, with a redesigned logo.

**Architecture:** All changes confined to `app/page.tsx`, `components/landing/*`, and two new helpers in `lib/landing/`. No backend touch, no new dependencies, no changes to color tokens. Each section is its own React component composed by `app/page.tsx`. Animation uses the already-installed `motion@12.38` (most sections) and `gsap@3.14` + `@gsap/react@2.1` (only the AmbientIntelligence pinned scroll). Logo is a self-contained SVG component shared by nav, footer, and hero.

**Tech Stack:** Next.js 14.2.35 · React 18 · Tailwind 3.4 · `motion` 12.38 · `gsap` 3.14 + `@gsap/react` 2.1 · TypeScript (strict).

**Verification model:** TypeScript strict + `npm run lint` + `npm run build` catch contract errors. Each section gets a manual visual check via `npm run dev` against the spec's copy and motion timings — there is no test framework in this repo (out of scope per spec). Commits happen frequently to keep the working tree small.

**Spec:** `docs/superpowers/specs/2026-05-01-jarvis-landing-superintelligence-design.md`

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `components/landing/JarvisLogo.tsx` | New SVG logo (loop + traveling signal). Sizes: `sm` `md` `lg`. Optional wordmark + animation. Reused by nav, footer, hero. |
| Create | `components/landing/HeroLivingPlan.tsx` | Section 1: hero with chat input + ambient signals → live schedule rewrite. |
| Create | `components/landing/ProblemNotice.tsx` | Section 2: single-line "i notice." quiet stat. |
| Create | `components/landing/ThreeLevels.tsx` | Section 3: three-tier category framing with live mini-plan on tier 3. |
| Create | `components/landing/EngineScience.tsx` | Section 4: merged loop + science. Live status bar, traveling left-rail pulse, 5 stage rows, science marginalia. |
| Create | `components/landing/AmbientIntelligence.tsx` | Section 5: GSAP scroll-pinned 4-scene cycle of life signals → schedule rewrite. |
| Create | `components/landing/Capabilities.tsx` | Section 6: 5 plain sentences. |
| Create | `components/landing/BrainDumpDemo.tsx` | Section 7: real textarea → live schedule via `dumpParser`. |
| Create | `components/landing/Compounding.tsx` | Section 8: Day 1 / Month 3 / Year 1 timeline with traveling hairline. |
| Create | `components/landing/VisionClose.tsx` | Section 9: cinematic full-bleed Iron-Man-Jarvis closer. |
| Create | `lib/landing/scenes.ts` | Typed `AmbientScene[]` data for AmbientIntelligence. |
| Create | `lib/landing/dumpParser.ts` | Frontend-only regex parser: brain-dump string → schedule blocks. |
| Modify | `app/page.tsx` | Compose new section list. |
| Modify | `components/landing/LandingNav.tsx` | Replace orange J tile with `<JarvisLogo>`, lowercase wordmark, refreshed link copy. |
| Modify | `components/landing/Pricing.tsx` | Refreshed copy in Jarvis voice (structure preserved). |
| Modify | `components/landing/Footer.tsx` | Replace J tile with `<JarvisLogo>`, refreshed copy. |
| Delete | `components/landing/Hero.tsx` | Replaced by HeroLivingPlan. |
| Delete | `components/landing/FeatureBento.tsx` | Responsibility split between EngineScience + Capabilities + AmbientIntelligence. |
| Delete | `components/landing/Philosophy.tsx` | Quote folded into EngineScience and VisionClose. |

---

## Task 0: Setup — branch + baseline build

**Files:**
- Modify: working git state

- [ ] **Step 1: Verify clean working tree**

```bash
cd /Users/kartikmehra/Desktop/Projects/Jarvis/jarvis-frontend
git status
```
Expected: `nothing to commit, working tree clean` (the spec was committed earlier on `main`).

- [ ] **Step 2: Create feature branch off main**

```bash
git checkout -b feat/landing-superintelligence
```
Expected: `Switched to a new branch 'feat/landing-superintelligence'`

- [ ] **Step 3: Confirm baseline build passes**

```bash
npm run build
```
Expected: build succeeds. If it fails, stop and fix the baseline before any new work — we need a clean starting point.

- [ ] **Step 4: Confirm dev server starts**

```bash
npm run dev
```
Expected: `Local: http://localhost:3000` or similar. Open in browser, see existing landing render. Stop the dev server with Ctrl-C.

- [ ] **Step 5: Commit branch baseline (no changes — just record start)**

No commit needed at this step; the branch is at the same SHA as main. Move on.

---

## Task 1: JarvisLogo component

**Files:**
- Create: `components/landing/JarvisLogo.tsx`

**Why first:** the logo is reused by nav, footer, hero, and vision close. Building it first lets later tasks import it without rework.

- [ ] **Step 1: Create the file**

Create `components/landing/JarvisLogo.tsx` with the full content below.

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```
Expected: build succeeds. If TS errors mention `clsx` not found, run `npm ls clsx` — it's already a dep per `package.json:13`.

- [ ] **Step 3: Smoke-render in dev (use existing landing temporarily)**

Replace `<div>J</div>` block at `components/landing/LandingNav.tsx:23-26` with `<JarvisLogo size="md" wordmark={true} />` *temporarily* just to eyeball the logo. Run `npm run dev` and confirm:
- Logo appears at the nav, gradient stroke visible
- Signal dot animates around the loop
- Wordmark `jarvis` reads in lowercase, weight 300

```tsx
// temporarily replace in LandingNav.tsx
import JarvisLogo from "./JarvisLogo";
// ...
<JarvisLogo size="md" wordmark={true} />
```

After visual confirmation, **revert** the temporary edit (full LandingNav rewrite happens in Task 11). Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add components/landing/JarvisLogo.tsx
git commit -m "feat(landing): JarvisLogo — loop + traveling signal mark"
```

---

## Task 2: ProblemNotice section

**Files:**
- Create: `components/landing/ProblemNotice.tsx`

**Why simple second:** smallest section, single sentence. Validates motion/react import pattern + section frame conventions before bigger components.

- [ ] **Step 1: Create the file**

Create `components/landing/ProblemNotice.tsx`:

```tsx
"use client";

import { motion } from "motion/react";

export default function ProblemNotice() {
  return (
    <section className="relative bg-[#1C1A17] py-40 md:py-48">
      <div className="max-w-[680px] mx-auto px-6 md:px-12 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-[#D4775A]/80 text-[11px] tracking-[2px] font-mono uppercase lowercase mb-10"
          style={{ textTransform: "lowercase" }}
        >
          i notice.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="text-[#FAF8F4] text-[28px] md:text-[32px] font-light leading-snug tracking-[-0.4px] mb-6"
        >
          You make about{" "}
          <span className="text-[#D4775A] font-medium">87 decisions</span>{" "}
          before noon. Most are tiny. All cost you.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.55 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
          className="text-[#FAF8F4]/55 text-[15px] italic font-light"
        >
          (That&apos;s why your big ones feel hard by 4 p.m.)
        </motion.p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page temporarily and verify**

Edit `app/page.tsx` to import and place ProblemNotice between Hero and FeatureBento (just for visual check):

```tsx
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import ProblemNotice from "@/components/landing/ProblemNotice";
import FeatureBento from "@/components/landing/FeatureBento";
// ...
<Hero />
<ProblemNotice />
<FeatureBento />
```

Run `npm run dev`, scroll to the new section, confirm:
- Header `i notice.` lowercase mono terra
- "87 decisions" highlighted terra
- Aside in italic at lower opacity
- Fade-in motion on scroll

Leave it wired (we'll keep building the page in order).

- [ ] **Step 3: Verify build + lint**

```bash
npm run build && npm run lint
```
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add components/landing/ProblemNotice.tsx app/page.tsx
git commit -m "feat(landing): ProblemNotice — the quiet 87-decisions line"
```

---

## Task 3: ThreeLevels section

**Files:**
- Create: `components/landing/ThreeLevels.tsx`

- [ ] **Step 1: Create the file**

Create `components/landing/ThreeLevels.tsx`:

```tsx
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
```

- [ ] **Step 2: Wire into page**

In `app/page.tsx`, add `import ThreeLevels` and place it between `<ProblemNotice />` and `<FeatureBento />`.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Confirm:
- Three rows stack with growing tick-mark intensity
- Mini-plan in tier 3 shuffles every 5s with smooth layout animation
- Closer line at the bottom

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/ThreeLevels.tsx app/page.tsx
git commit -m "feat(landing): ThreeLevels — calendar/scheduler/jarvis tiers"
```

---

## Task 4: EngineScience section

**Files:**
- Create: `components/landing/EngineScience.tsx`

**This is the densest section.** It implements the v3 prototype from brainstorming. Live status bar, traveling left-rail pulse, 5 stage rows, science marginalia.

- [ ] **Step 1: Create the file**

Create `components/landing/EngineScience.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
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
```

- [ ] **Step 2: Wire into page**

In `app/page.tsx`, add `import EngineScience` and place it between `<ThreeLevels />` and `<FeatureBento />`.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Confirm:
- Status bar shows green pulse + iteration counter that visibly increments
- Headline reads "I think in loops. So does your brain — mine just doesn't crash for snacks."
- Traveling orange pulse animates down the left rail in 8s loop
- All 5 stage rows present with correct copy and asides
- Hover on any row brightens the science margin and lights the orange edge
- Closing line ends with "or so my training data assures me."

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/EngineScience.tsx app/page.tsx
git commit -m "feat(landing): EngineScience — loop+psychology merged section"
```

---

## Task 5: AmbientIntelligence scenes data

**Files:**
- Create: `lib/landing/scenes.ts`

**Why before the component:** the component is large; isolating data keeps the component focused on layout and motion.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p lib/landing
```

Create `lib/landing/scenes.ts`:

```ts
export type ScheduleBlock = {
  time: string;
  label: string;
  color: string; // brand hex
  state: "stable" | "moved" | "added" | "expanded";
  badge?: string; // e.g. "moved", "+30m", "extracted from PDF"
};

export type AmbientScene = {
  id: string;
  channel: "imessage" | "slack" | "gmail" | "calendar";
  sender: string;
  channelLabel: string;
  message: string;
  attachment?: string;
  blocks: ScheduleBlock[];
};

const STUDY = "#D4775A";
const GYM = "#4A7B6B";
const MEET = "#6B7FB5";
const MOVED = "#E09D5C";

export const SCENES: AmbientScene[] = [
  {
    id: "dinner",
    channel: "imessage",
    sender: "Sara",
    channelLabel: "iMessage",
    message: "Surprise dinner tonight @ 8?",
    blocks: [
      { time: "9:00", label: "Deep work · CNNs", color: STUDY, state: "stable" },
      { time: "11:30", label: "Gym (45m)", color: GYM, state: "stable" },
      { time: "13:00", label: "Lunch w/ Mira", color: MEET, state: "stable" },
      { time: "tomorrow 10:00", label: "Study block (was 7-9 PM today)", color: MOVED, state: "moved", badge: "moved" },
      { time: "20:00", label: "Dinner with Sara", color: MEET, state: "added", badge: "added" },
    ],
  },
  {
    id: "deadline",
    channel: "slack",
    sender: "Priya",
    channelLabel: "#ml-team",
    message: "Deadline pushed to Wed",
    blocks: [
      { time: "Mon 9:00", label: "ML project · part 1", color: STUDY, state: "stable" },
      { time: "Tue 9:00", label: "ML project · part 2", color: STUDY, state: "stable" },
      { time: "Wed 9:00", label: "ML project · finalize", color: STUDY, state: "stable" },
      { time: "Wed 14:00", label: "Exam prep (freed window)", color: MOVED, state: "expanded", badge: "+30m" },
    ],
  },
  {
    id: "exam",
    channel: "gmail",
    sender: "University Registrar",
    channelLabel: "Email",
    message: "Exam schedule released",
    attachment: "schedule.pdf",
    blocks: [
      { time: "Week 1 · Mon", label: "Linear algebra review", color: STUDY, state: "added", badge: "from PDF" },
      { time: "Week 1 · Wed", label: "Probability problems", color: STUDY, state: "added", badge: "from PDF" },
      { time: "Week 2 · Tue", label: "Mock exam (timed)", color: STUDY, state: "added", badge: "from PDF" },
      { time: "Week 3 · Fri", label: "Final review", color: STUDY, state: "added", badge: "from PDF" },
    ],
  },
  {
    id: "meeting",
    channel: "calendar",
    sender: "Prof Singh",
    channelLabel: "Calendar",
    message: "Office Hours moved to 3 PM",
    blocks: [
      { time: "10:00", label: "Deep work · backprop", color: STUDY, state: "stable" },
      { time: "13:00", label: "Quick review (filler)", color: GYM, state: "added", badge: "filled gap" },
      { time: "15:00", label: "Office hours", color: MEET, state: "moved", badge: "moved" },
      { time: "16:30", label: "Deep work (shifted)", color: MOVED, state: "moved", badge: "moved" },
    ],
  },
];
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: build succeeds (this file is unused at this point — no exports being imported).

- [ ] **Step 3: Commit**

```bash
git add lib/landing/scenes.ts
git commit -m "feat(landing): AmbientIntelligence scene data"
```

---

## Task 6: AmbientIntelligence section

**Files:**
- Create: `components/landing/AmbientIntelligence.tsx`

**Note on GSAP:** ScrollTrigger pinning has known mobile-Safari quirks. The implementation gracefully degrades on `< md` breakpoints by stacking scenes vertically without pinning.

- [ ] **Step 1: Create the file**

Create `components/landing/AmbientIntelligence.tsx`:

```tsx
"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SCENES, type AmbientScene } from "@/lib/landing/scenes";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function ChannelCard({ scene }: { scene: AmbientScene }) {
  const accent =
    scene.channel === "imessage" ? "#6B7FB5" :
    scene.channel === "slack" ? "#4A7B6B" :
    scene.channel === "gmail" ? "#E09D5C" :
    "#D4775A";

  return (
    <motion.div
      key={scene.id}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-xl p-5 backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent}66`,
        boxShadow: `0 0 24px ${accent}22`,
      }}
    >
      <div className="text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/40 mb-2 font-mono">
        {scene.channelLabel} · {scene.sender}
      </div>
      <div className="text-[#FAF8F4] text-[16px] leading-snug font-light">
        {scene.message}
      </div>
      {scene.attachment ? (
        <div
          className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md text-[11px] text-[#FAF8F4]/70"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
        >
          📎 {scene.attachment}
        </div>
      ) : null}
    </motion.div>
  );
}

function SchedulePanel({ scene }: { scene: AmbientScene }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex justify-between items-center mb-3 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/50">
        <span>schedule · live</span>
        <span className="flex items-center gap-1.5 text-[#4A7B6B]">
          <span
            className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
            style={{ animation: "ai-livepulse 1.6s ease-in-out infinite" }}
          />
          rewriting
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {scene.blocks.map((b) => (
          <motion.div
            key={`${scene.id}-${b.label}`}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center gap-3 mb-1.5 rounded-md px-3 py-2 text-[12px] relative"
            style={{
              borderLeft: `2px solid ${b.color}`,
              background: `${b.color}22`,
              color: "#FAF8F4",
            }}
          >
            <span className="text-[#FAF8F4]/55 font-mono w-24 shrink-0">{b.time}</span>
            <span className="flex-1">{b.label}</span>
            {b.badge ? (
              <span
                className="text-[9px] uppercase tracking-[0.5px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: `${b.color}33`, color: b.color }}
              >
                {b.badge}
              </span>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function AmbientIntelligence() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useGSAP(
    () => {
      if (isMobile || !sectionRef.current) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=400%",
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const idx = Math.min(SCENES.length - 1, Math.floor(self.progress * SCENES.length));
          setActiveIdx(idx);
        },
      });
      return () => {
        trigger.kill();
      };
    },
    { dependencies: [isMobile], scope: sectionRef }
  );

  // Mobile: stacked render of all scenes
  if (isMobile) {
    return (
      <section ref={sectionRef} className="bg-[#1C1A17] py-32">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHead />
          <div className="flex flex-col gap-16 mt-16">
            {SCENES.map((s) => (
              <div key={s.id} className="grid grid-cols-1 gap-4">
                <ChannelCard scene={s} />
                <SchedulePanel scene={s} />
              </div>
            ))}
          </div>
          <Closer />
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="bg-[#1C1A17] relative">
      <div className="h-screen w-full flex flex-col justify-between max-w-7xl mx-auto px-12 py-24">
        <SectionHead />
        <div className="grid grid-cols-2 gap-12 items-start flex-1 mt-12">
          <div className="flex items-center justify-center min-h-[280px]">
            <AnimatePresence mode="wait">
              <ChannelCard key={SCENES[activeIdx].id} scene={SCENES[activeIdx]} />
            </AnimatePresence>
          </div>
          <SchedulePanel scene={SCENES[activeIdx]} />
        </div>
        <Closer />
      </div>
      <style>{`@keyframes ai-livepulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </section>
  );
}

function SectionHead() {
  return (
    <div className="max-w-2xl">
      <p className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-6">
        i see your life happening.
      </p>
      <h3 className="text-[#FAF8F4] text-[28px] md:text-[32px] font-light leading-tight tracking-[-0.4px]">
        You don&apos;t open me. <em className="not-italic text-[#D4775A] font-medium">I&apos;m already there.</em>
      </h3>
    </div>
  );
}

function Closer() {
  return (
    <p className="text-[#FAF8F4]/55 text-[14px] md:text-[15px] italic font-light text-center mt-16 max-w-3xl mx-auto">
      Most apps reschedule when your <span className="not-italic">calendar</span> changes. <span className="text-[#D4775A] font-medium not-italic">I reschedule when your <em className="italic">life</em> changes.</span>
    </p>
  );
}
```

- [ ] **Step 2: Wire into page**

In `app/page.tsx`, add `import AmbientIntelligence` and place it between `<EngineScience />` and `<FeatureBento />`.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Confirm:
- Section pins on desktop, scrolling advances through 4 scenes
- Each scene shows channel-card on left, schedule on right
- Schedule blocks animate in/out with AnimatePresence (slide + fade)
- "moved" / "added" / "from PDF" badges show on appropriate blocks
- Closing line: *"Most apps reschedule when your calendar changes. I reschedule when your life changes."*
- On mobile (responsive < 768px), scenes stack vertically without pinning

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/AmbientIntelligence.tsx app/page.tsx
git commit -m "feat(landing): AmbientIntelligence — pinned scene cycle"
```

---

## Task 7: Capabilities section

**Files:**
- Create: `components/landing/Capabilities.tsx`

- [ ] **Step 1: Create the file**

Create `components/landing/Capabilities.tsx`:

```tsx
"use client";

import { motion } from "motion/react";

const SENTENCES: Array<{ text: React.ReactNode }> = [
  { text: <>I read your <em className="not-italic text-[#D4775A] font-medium">documents</em> — syllabi, PDFs, slides — and pin the right pieces to the right work.</> },
  { text: <>I <em className="not-italic text-[#D4775A] font-medium">remember</em> what matters and forget what doesn&apos;t, on the curve memory follows.</> },
  { text: <>I do the <em className="not-italic text-[#D4775A] font-medium">math</em> on your constraints. Conflicts aren&apos;t possible.</> },
  { text: <>I <em className="not-italic text-[#D4775A] font-medium">learn</em> how you actually work — when you focus, when you skip, when you lie about it.</> },
  { text: <>I run on <em className="not-italic text-[#D4775A] font-medium">your machine.</em> Your data stays where you sleep.</> },
];

export default function Capabilities() {
  return (
    <section className="relative bg-[#1C1A17] py-32">
      <div className="max-w-[720px] mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-12"
        >
          what i can do.
        </motion.p>

        <div className="flex flex-col">
          {SENTENCES.map((s, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.12 }}
              className="text-[#FAF8F4] text-[20px] md:text-[22px] font-light leading-[1.6] py-6 border-b border-white/5 last:border-b-0"
            >
              {s.text}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page**

Add `import Capabilities` and place it between `<AmbientIntelligence />` and `<FeatureBento />`.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm: 5 sentences with hairline dividers, terra accents on the key noun, fade-in on scroll with stagger.

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/Capabilities.tsx app/page.tsx
git commit -m "feat(landing): Capabilities — 5 plain sentences"
```

---

## Task 8: dumpParser helper

**Files:**
- Create: `lib/landing/dumpParser.ts`

**Note:** This is a frontend visual mock. It does not produce backend-quality scheduling. Comment in code makes that explicit.

- [ ] **Step 1: Create the file**

Create `lib/landing/dumpParser.ts`:

```ts
/**
 * Frontend-only mock parser for the BrainDumpDemo section.
 * Does NOT produce real scheduling — its job is visual believability.
 * Real parsing happens server-side via the Jarvis Engine; this is a UI demo.
 */

export type ParsedBlock = {
  id: string;
  time: string;
  label: string;
  color: string;
  durationMin: number;
};

const STUDY = "#D4775A";
const GYM = "#4A7B6B";
const MEET = "#6B7FB5";
const HABIT = "#E09D5C";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pickStudySlots(count: number): string[] {
  const slots = ["9:00", "11:00", "14:00", "16:00", "19:00", "Tue 10:00", "Wed 14:00", "Thu 11:00", "Fri 9:00"];
  return slots.slice(0, count);
}

let seq = 0;
const id = () => `dump-${++seq}`;

export function parseDump(text: string): ParsedBlock[] {
  if (!text.trim()) return [];

  const lower = text.toLowerCase();
  const blocks: ParsedBlock[] = [];

  // Detect prep-for-X by Y deadlines → 4 study blocks
  const prepMatch = lower.match(/(?:prep(?:are)? for|study(?: for)?|cram for|finish)\s+([a-z0-9 -]{2,40}?)(?:\s+by\s+([a-z]+))?/i);
  if (prepMatch) {
    const subject = prepMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const slots = pickStudySlots(4);
    slots.forEach((t, i) =>
      blocks.push({
        id: id(),
        time: t,
        label: `Study · ${subject} (part ${i + 1})`,
        color: STUDY,
        durationMin: 25,
      })
    );
  }

  // Recurring habits like "gym 3x" or "meditate every morning"
  const habitMatch = lower.match(/(\w+)\s+(\d)x|every\s+(morning|evening|day|night)/i);
  if (habitMatch) {
    const name = (habitMatch[1] || habitMatch[3] || "habit").replace(/\b\w/g, (c) => c.toUpperCase());
    const isMorning = /morning/.test(lower);
    blocks.push({
      id: id(),
      time: isMorning ? "Mon 7:00" : "Mon 18:00",
      label: `${name} (recurring)`,
      color: HABIT,
      durationMin: 30,
    });
    blocks.push({
      id: id(),
      time: isMorning ? "Wed 7:00" : "Wed 18:00",
      label: `${name} (recurring)`,
      color: HABIT,
      durationMin: 30,
    });
    blocks.push({
      id: id(),
      time: isMorning ? "Fri 7:00" : "Fri 18:00",
      label: `${name} (recurring)`,
      color: HABIT,
      durationMin: 30,
    });
  }

  // "call X" or "meet X"
  const callMatch = lower.match(/(?:call|meet(?:ing)? with|chat with|catch up with)\s+([a-z]{2,20})/i);
  if (callMatch) {
    const who = callMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());
    blocks.push({
      id: id(),
      time: "Sun 16:00",
      label: `Call ${who}`,
      color: MEET,
      durationMin: 25,
    });
  }

  // Fallback: at least one block so the demo never looks empty
  if (blocks.length === 0) {
    blocks.push({
      id: id(),
      time: "9:00",
      label: "Focus block",
      color: STUDY,
      durationMin: 25,
    });
  }

  // Limit to 6 blocks for visual cleanliness
  return blocks.slice(0, 6);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/landing/dumpParser.ts
git commit -m "feat(landing): dumpParser — frontend mock for BrainDumpDemo"
```

---

## Task 9: BrainDumpDemo section

**Files:**
- Create: `components/landing/BrainDumpDemo.tsx`

- [ ] **Step 1: Create the file**

Create `components/landing/BrainDumpDemo.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseDump, type ParsedBlock } from "@/lib/landing/dumpParser";

const PREFILL = "Prepare for ML competition by Friday. Gym 3x. Call mom Sunday.";

export default function BrainDumpDemo() {
  const [text, setText] = useState(PREFILL);
  const [blocks, setBlocks] = useState<ParsedBlock[]>(() => parseDump(PREFILL));
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Re-parse on text change with a small debounce to feel alive but not jittery
  useEffect(() => {
    const t = setTimeout(() => setBlocks(parseDump(text)), 600);
    return () => clearTimeout(t);
  }, [text]);

  const seedHref = useMemo(() => `/dashboard?seed=${encodeURIComponent(text)}`, [text]);

  return (
    <section className="relative bg-[#1C1A17] py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-12"
        >
          try me.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Brain dump pad */}
          <div>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell me what's on your mind..."
              rows={8}
              className="w-full bg-[#252320] border border-white/10 rounded-xl p-5 text-[#FAF8F4] text-[16px] font-light leading-relaxed resize-none focus:outline-none focus:border-[#D4775A]/50 focus:ring-1 focus:ring-[#D4775A]/30 transition-colors placeholder:text-[#FAF8F4]/30"
            />
            <div className="mt-3 text-[11px] font-mono text-[#FAF8F4]/40 tracking-[0.5px]">
              {blocks.length} block{blocks.length === 1 ? "" : "s"} · live preview →
            </div>
          </div>

          {/* Live schedule preview */}
          <div
            className="rounded-xl p-5 min-h-[280px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex justify-between items-center mb-4 font-mono text-[10px] uppercase tracking-[1.5px] text-[#FAF8F4]/50">
              <span>today · mock · demo</span>
              <span className="flex items-center gap-1.5 text-[#4A7B6B]">
                <span
                  className="block w-[6px] h-[6px] rounded-full bg-[#4A7B6B]"
                  style={{ animation: "bd-pulse 1.6s ease-in-out infinite" }}
                />
                live
              </span>
            </div>
            <AnimatePresence mode="popLayout">
              {blocks.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex items-center gap-3 mb-1.5 rounded-md px-3 py-2.5 text-[13px]"
                  style={{
                    borderLeft: `2px solid ${b.color}`,
                    background: `${b.color}1A`,
                    color: "#FAF8F4",
                  }}
                >
                  <span className="text-[#FAF8F4]/55 font-mono w-24 shrink-0">{b.time}</span>
                  <span className="flex-1">{b.label}</span>
                  <span className="text-[#FAF8F4]/40 text-[10px] font-mono">{b.durationMin}m</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-[#FAF8F4]/55 text-[14px] italic font-light text-center mt-16 max-w-2xl mx-auto">
          That&apos;s it. That&apos;s the demo. The rest is just running it for years.
        </p>

        <div className="text-center mt-8">
          <Link
            href={seedHref}
            className="inline-block text-[#D4775A] hover:text-[#E09D5C] text-[14px] font-medium tracking-[0.5px] transition-colors"
          >
            begin →
          </Link>
        </div>
      </div>

      <style>{`@keyframes bd-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page**

Add `import BrainDumpDemo` and place it between `<Capabilities />` and `<FeatureBento />`.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm:
- Textarea is prefilled with the demo prompt
- Right side shows ~5 schedule blocks parsed from the prefill (study x4, gym recurring, call mom)
- Editing the textarea triggers re-parse after ~600ms with smooth layout animation
- "begin →" link routes to `/dashboard?seed=<encoded>`

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/BrainDumpDemo.tsx app/page.tsx
git commit -m "feat(landing): BrainDumpDemo — interactive try-it-now section"
```

---

## Task 10: Compounding section

**Files:**
- Create: `components/landing/Compounding.tsx`

- [ ] **Step 1: Create the file**

Create `components/landing/Compounding.tsx`:

```tsx
"use client";

import { motion } from "motion/react";

const MILESTONES = [
  {
    label: "Day 1",
    quote: "I'm useful out of the box.",
    sub: "(architecture — integrated engine on day one)",
  },
  {
    label: "Month 3",
    quote: "I know your energy. Your habits. The mornings you skip and don't admit. I'm yours.",
    sub: "(data — personalization compounds)",
  },
  {
    label: "Year 1",
    quote: "Switching feels like starting over with a stranger.",
    sub: "(compounding — psychology + ambient layered)",
  },
];

export default function Compounding() {
  return (
    <section className="relative bg-[#1C1A17] py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 0.85, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-3 text-center"
        >
          i get better every day.
        </motion.p>

        <motion.h3
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[#FAF8F4] text-[24px] md:text-[28px] font-light text-center max-w-2xl mx-auto mb-20"
        >
          Day one is good. <em className="not-italic text-[#D4775A] font-medium">By month three I&apos;m yours.</em>
        </motion.h3>

        {/* Hairline with traveling pulse */}
        <div className="relative mb-12 hidden md:block">
          <div
            className="h-px w-full"
            style={{
              background: "linear-gradient(to right, transparent, rgba(212,119,90,0.4) 10%, rgba(212,119,90,0.4) 90%, transparent)",
            }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full"
            style={{
              background: "#D4775A",
              boxShadow: "0 0 12px #D4775A",
              animation: "comp-travel 12s linear infinite",
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.3 }}
              className="text-center"
            >
              <p className="text-[#D4775A] text-[13px] font-mono tracking-[2px] uppercase mb-4">
                {m.label}
              </p>
              <p className="text-[#FAF8F4] text-[18px] md:text-[20px] font-light leading-relaxed mb-3">
                &ldquo;{m.quote}&rdquo;
              </p>
              <p className="text-[#FAF8F4]/35 text-[11px] italic font-light">
                {m.sub}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes comp-travel {
          0% { left: 0%; opacity: 0.2; }
          5% { opacity: 1; }
          50% { left: 100%; opacity: 1; }
          55% { opacity: 0.2; }
          100% { left: 0%; opacity: 0.2; }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page**

Add `import Compounding` and place it between `<BrainDumpDemo />` and `<FeatureBento />`.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm:
- Header `i get better every day.` mono terra
- Subhead `Day one is good. By month three I'm yours.`
- Hairline line with traveling terra pulse (12s cycle)
- 3 columns: Day 1 / Month 3 / Year 1 with quotes and faint subtitles

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/Compounding.tsx app/page.tsx
git commit -m "feat(landing): Compounding — Day1/Month3/Year1 timeline"
```

---

## Task 11: VisionClose section

**Files:**
- Create: `components/landing/VisionClose.tsx`

- [ ] **Step 1: Create the file**

Create `components/landing/VisionClose.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import Link from "next/link";
import JarvisLogo from "./JarvisLogo";

export default function VisionClose() {
  return (
    <section className="relative bg-[#0F0D0A] min-h-[80vh] flex items-center overflow-hidden">
      {/* film grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* aurora horizon */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[180px] pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(212,119,90,0.18), transparent)",
          filter: "blur(8px)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-10"
        >
          <JarvisLogo size="xl" wordmark={false} animated />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="text-[#FAF8F4] text-[36px] md:text-[44px] font-light leading-tight tracking-[-0.8px] mb-8"
        >
          We&apos;re building the <em className="not-italic text-[#D4775A] font-medium">Jarvis</em> from Iron Man — for real life.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.65 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-[#FAF8F4]/65 text-[16px] font-light leading-relaxed mb-10 max-w-xl mx-auto"
        >
          A learning loop that compounds daily. Always preparing. Always learning. Always in your corner.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link
            href="/dashboard"
            className="inline-block text-[#D4775A] hover:text-[#E09D5C] text-[16px] font-light tracking-[1px] transition-colors"
          >
            begin.
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page**

Add `import VisionClose` and place it between `<Compounding />` and `<Pricing />`.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm:
- Full-bleed dark section with subtle grain
- Logo at xl size (96px) breathing above the headline
- Headline `We're building the Jarvis from Iron Man — for real life.`
- Body text fades in
- `begin.` link at bottom

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/VisionClose.tsx app/page.tsx
git commit -m "feat(landing): VisionClose — cinematic Iron-Man-Jarvis closer"
```

---

## Task 12: HeroLivingPlan section

**Files:**
- Create: `components/landing/HeroLivingPlan.tsx`

**Why later:** the hero is the most complex composition (signal cards + recomposing schedule, both choreographed). Building it after we've validated motion patterns in simpler sections reduces rework.

- [ ] **Step 1: Create the file**

Create `components/landing/HeroLivingPlan.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const PROMPTS = [
  "Prepare for ML competition by Friday…",
  "Cram for finals next week…",
  "Set up a workout habit again…",
  "Plan a focused thesis week…",
];

const SIGNALS = [
  { id: "txt", from: "iMessage · Sara", body: "Surprise dinner @ 8?", color: "#6B7FB5" },
  { id: "cal", from: "Calendar", body: "Prof meeting → 3pm", color: "#D4775A" },
  { id: "slk", from: "Slack · #ml-team", body: "Deadline → Wed", color: "#4A7B6B" },
];

const BASE_BLOCKS = [
  { time: "9:00", label: "Deep work · CNNs", color: "#D4775A" },
  { time: "11:30", label: "Gym (45m)", color: "#4A7B6B" },
  { time: "13:00", label: "Lunch w/ Mira", color: "#6B7FB5" },
  { time: "15:00", label: "Backprop study", color: "#D4775A" },
];

export default function HeroLivingPlan() {
  const [activeSignal, setActiveSignal] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const id = setInterval(() => setActiveSignal((p) => (p + 1) % SIGNALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPromptIdx((p) => (p + 1) % PROMPTS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center bg-[#1C1A17] overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: [
              "radial-gradient(ellipse 600px 400px at 20% 50%, #D4775A33 0%, transparent 70%)",
              "radial-gradient(ellipse 500px 500px at 70% 30%, #6B7FB533 0%, transparent 70%)",
              "radial-gradient(ellipse 400px 300px at 60% 80%, #4A7B6B33 0%, transparent 70%)",
            ].join(", "),
            animation: "aurora-drift 15s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 pt-24 pb-16 items-center">
        {/* Left column */}
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono mb-6 flex items-center gap-2"
          >
            <span
              className="block w-[7px] h-[7px] rounded-full bg-[#4A7B6B]"
              style={{ boxShadow: "0 0 10px #4A7B6B", animation: "hero-livepulse 1.6s ease-in-out infinite" }}
            />
            jarvis · running
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="text-[#FAF8F4] text-[44px] md:text-[56px] font-light leading-[1.1] tracking-[-1.2px] mb-8"
          >
            I think about your day{" "}
            <em className="not-italic text-[#D4775A] font-medium">before</em> you do.
            <br />
            Then I handle it before you ask.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative mb-8"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={PROMPTS[promptIdx]}
              className="w-full bg-[#252320] border border-white/10 rounded-xl px-5 py-4 text-[#FAF8F4] text-[15px] font-light focus:outline-none focus:border-[#D4775A]/50 focus:ring-1 focus:ring-[#D4775A]/30 transition-colors placeholder:text-[#FAF8F4]/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  window.location.href = `/dashboard?seed=${encodeURIComponent(draft)}`;
                }
              }}
            />
            <Link
              href={draft.trim() ? `/dashboard?seed=${encodeURIComponent(draft)}` : "/dashboard"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4775A] hover:text-[#E09D5C] text-[14px] font-medium px-3 py-1 transition-colors"
              aria-label="begin"
            >
              →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-[#FAF8F4]/40 text-[13px] font-light italic"
          >
            Tell me what&apos;s on your mind.
          </motion.p>
        </div>

        {/* Right column — Living Plan */}
        <div className="grid grid-cols-2 gap-4 items-stretch">
          {/* Signal cards */}
          <div className="relative h-[360px]">
            {SIGNALS.map((s, i) => {
              const isActive = i === activeSignal;
              return (
                <motion.div
                  key={s.id}
                  animate={{
                    opacity: isActive ? 1 : 0.4,
                    scale: isActive ? 1.02 : 0.98,
                    y: i * 110,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute left-0 right-0 rounded-xl p-3 backdrop-blur-md"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${s.color}66`,
                    boxShadow: isActive ? `0 0 24px ${s.color}55` : "none",
                  }}
                >
                  <div className="text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/40 mb-1.5 font-mono">
                    {s.from}
                  </div>
                  <div className="text-[#FAF8F4] text-[13px] font-light leading-snug">
                    {s.body}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Schedule */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex justify-between items-center mb-3 font-mono text-[9px] uppercase tracking-[1.5px] text-[#FAF8F4]/50">
              <span>today · wed</span>
              <span className="flex items-center gap-1.5 text-[#4A7B6B]">
                <span
                  className="block w-[5px] h-[5px] rounded-full bg-[#4A7B6B]"
                  style={{ animation: "hero-livepulse 1.6s ease-in-out infinite" }}
                />
                live
              </span>
            </div>
            {BASE_BLOCKS.map((b, i) => {
              const isMoved = i === activeSignal % BASE_BLOCKS.length;
              return (
                <motion.div
                  key={b.label}
                  animate={{
                    x: isMoved ? 8 : 0,
                    backgroundColor: isMoved ? "#E09D5C22" : `${b.color}1A`,
                    borderLeftColor: isMoved ? "#E09D5C" : b.color,
                  }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="flex items-center gap-2 mb-1.5 rounded-md px-2.5 py-1.5 text-[11px] relative"
                  style={{ borderLeftWidth: "2px", borderLeftStyle: "solid", color: "#FAF8F4" }}
                >
                  <span className="text-[#FAF8F4]/55 font-mono w-12 text-[10px]">{b.time}</span>
                  <span className="flex-1">{b.label}</span>
                  {isMoved ? (
                    <span className="text-[8px] uppercase tracking-[0.5px] font-mono text-[#E09D5C]">
                      moved
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hero-livepulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes aurora-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-5%, 3%) scale(1.02); }
          66% { transform: translate(3%, -2%) scale(0.98); }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page (replace existing Hero)**

In `app/page.tsx`, replace `import Hero from "@/components/landing/Hero";` with `import HeroLivingPlan from "@/components/landing/HeroLivingPlan";` and replace `<Hero />` with `<HeroLivingPlan />`.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm:
- Headline reads `I think about your day before you do. Then I handle it before you ask.`
- Status eyebrow shows live green pulse + `jarvis · running`
- Chat input has cycling placeholder
- Right side: 3 signal cards stacked, one active at a time (cycling every 6s)
- Schedule on right with one block "moved" (highlighted gold) per cycle
- Aurora drift continues on background

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/HeroLivingPlan.tsx app/page.tsx
git commit -m "feat(landing): HeroLivingPlan — vision-led hero with living schedule"
```

---

## Task 13: LandingNav rewrite

**Files:**
- Modify: `components/landing/LandingNav.tsx`

- [ ] **Step 1: Replace the file content**

Replace the entire content of `components/landing/LandingNav.tsx` with:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import JarvisLogo from "./JarvisLogo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${
        scrolled
          ? "bg-[#1C1A17]/90 backdrop-blur-md border-b border-[#FAF8F4]/10"
          : "bg-transparent"
      }`}
    >
      <Link href="/" aria-label="Jarvis home">
        <JarvisLogo size="md" wordmark={true} animated />
      </Link>

      <div className="flex items-center gap-7 font-mono text-[11px] tracking-[1px]">
        <a
          href="#how-it-works"
          className="hidden md:inline text-[#FAF8F4]/55 hover:text-[#FAF8F4] transition-colors"
        >
          how
        </a>
        <a
          href="#why"
          className="hidden md:inline text-[#FAF8F4]/55 hover:text-[#FAF8F4] transition-colors"
        >
          why
        </a>
        <a
          href="#pricing"
          className="hidden md:inline text-[#FAF8F4]/55 hover:text-[#FAF8F4] transition-colors"
        >
          pricing
        </a>
        <Link
          href="/dashboard"
          className="text-[#D4775A] hover:text-[#E09D5C] transition-colors"
        >
          begin →
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update section anchors**

Verify the `id` attributes on sections still match the nav links:
- `#how-it-works` → should anchor to EngineScience or AmbientIntelligence. Add `id="how-it-works"` to the EngineScience section's outer `<section>`.
- `#why` → should anchor to Capabilities. Add `id="why"` to its `<section>`.
- `#pricing` → already exists on Pricing.

Update both:

In `components/landing/EngineScience.tsx`, change `<section className="relative bg-[#1C1A17] py-24">` to `<section id="how-it-works" className="relative bg-[#1C1A17] py-24">`.

In `components/landing/Capabilities.tsx`, change `<section className="relative bg-[#1C1A17] py-32">` to `<section id="why" className="relative bg-[#1C1A17] py-32">`.

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm:
- Nav shows JarvisLogo (mark + lowercase wordmark) on the left
- Right side: `how` `why` `pricing` `begin →` in mono small caps
- Clicking each anchor scrolls to the right section
- Background blurs on scroll past 20px

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/landing/LandingNav.tsx components/landing/EngineScience.tsx components/landing/Capabilities.tsx
git commit -m "feat(landing): LandingNav with new logo + lowercase mono links"
```

---

## Task 14: Pricing rewrite (copy refresh)

**Files:**
- Modify: `components/landing/Pricing.tsx`

- [ ] **Step 1: Replace the file content**

Replace the entire content of `components/landing/Pricing.tsx` with:

```tsx
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    pitch: "Enough to try me. One active goal. The basics.",
    features: [
      "I capture and shape your brain dump.",
      "I build a schedule that won't conflict.",
      "I don't keep your stuff. You can delete me with one click.",
    ],
    cta: "begin →",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    pitch: "Unlimited goals. Documents. Behavior. Memory. The whole loop.",
    features: [
      "Everything in Free.",
      "I read your documents and pin them to your work.",
      "I learn your patterns and adjust the math.",
      "I negotiate when you push back.",
      "I remember on the curve, not the streak.",
    ],
    cta: "begin →",
    popular: true,
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24"
      style={{
        background: "linear-gradient(to bottom, #1C1A17, #0F0D0A)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <p className="text-[#D4775A]/85 text-[11px] tracking-[2px] font-mono text-center mb-3">
          pick a tier.
        </p>
        <h2 className="text-[#FAF8F4] text-[28px] md:text-[32px] font-light text-center mb-16 tracking-[-0.4px]">
          Two ways to begin.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-8 transition-transform hover:-translate-y-1 ${
                plan.popular
                  ? "border-2 border-[#D4775A] bg-[#D4775A]/10"
                  : "border border-[#FAF8F4]/10 bg-[#FAF8F4]/5"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4775A] text-[#1C1A17] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[1.5px]">
                  Popular
                </span>
              )}

              <h3 className="text-[#FAF8F4] font-medium text-[20px] mb-2 tracking-[-0.3px]">
                {plan.name}
              </h3>
              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-[#FAF8F4] text-[40px] font-light tracking-[-1px]">
                    {plan.price}
                  </span>
                  <span className="text-[#FAF8F4]/40 text-[14px]">{plan.period}</span>
                </div>
                {plan.popular && (
                  <span className="text-[#FAF8F4]/40 text-[11px]">($89/yr)</span>
                )}
              </div>

              <p className="text-[#FAF8F4]/65 text-[14px] font-light italic mb-6">
                {plan.pitch}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[#FAF8F4]/75 text-[13px] font-light leading-relaxed"
                  >
                    <svg
                      className="w-3.5 h-3.5 mt-1 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={plan.popular ? "#D4775A" : "#FAF8F4"}
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={`block text-center font-medium text-[14px] px-6 py-3 rounded-lg transition-colors ${
                  plan.popular
                    ? "bg-[#D4775A] text-[#1C1A17] hover:bg-[#E09D5C]"
                    : "border border-[#FAF8F4]/20 text-[#FAF8F4] hover:border-[#FAF8F4]/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[#FAF8F4]/40 text-[12px] italic mt-10 font-light">
          No card. Cancel by saying so.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Confirm:
- Header `pick a tier.` mono terra
- Subhead `Two ways to begin.`
- Free plan + Pro plan cards with refreshed pitch lines and bullets
- "begin →" CTAs
- Footer note: `No card. Cancel by saying so.`

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add components/landing/Pricing.tsx
git commit -m "feat(landing): Pricing — refreshed copy in Jarvis voice"
```

---

## Task 15: Footer rewrite

**Files:**
- Modify: `components/landing/Footer.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import JarvisLogo from "./JarvisLogo";

export default function Footer() {
  return (
    <footer className="bg-[#0F0D0A] py-14">
      <div className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center gap-5">
        <JarvisLogo size="sm" wordmark={true} animated />
        <p className="text-[#FAF8F4]/45 text-[13px] font-light italic">
          Built by a student. Designed for one.
        </p>
        <p className="font-mono text-[10px] tracking-[1.5px] text-[#FAF8F4]/30 uppercase">
          © 2026 jarvis &nbsp;·&nbsp; privacy &nbsp;·&nbsp; terms &nbsp;·&nbsp; contact
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Scroll to bottom. Confirm:
- Logo mark + lowercase `jarvis` wordmark
- Italic tagline `Built by a student. Designed for one.`
- Mono small-caps copyright + privacy/terms/contact line

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add components/landing/Footer.tsx
git commit -m "feat(landing): Footer — refreshed minimal copy"
```

---

## Task 16: Compose final page + delete obsolete components

**Files:**
- Modify: `app/page.tsx`
- Delete: `components/landing/Hero.tsx`, `components/landing/FeatureBento.tsx`, `components/landing/Philosophy.tsx`

- [ ] **Step 1: Rewrite app/page.tsx with the final composition**

```tsx
import LandingNav from "@/components/landing/LandingNav";
import HeroLivingPlan from "@/components/landing/HeroLivingPlan";
import ProblemNotice from "@/components/landing/ProblemNotice";
import ThreeLevels from "@/components/landing/ThreeLevels";
import EngineScience from "@/components/landing/EngineScience";
import AmbientIntelligence from "@/components/landing/AmbientIntelligence";
import Capabilities from "@/components/landing/Capabilities";
import BrainDumpDemo from "@/components/landing/BrainDumpDemo";
import Compounding from "@/components/landing/Compounding";
import VisionClose from "@/components/landing/VisionClose";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="bg-[#1C1A17]">
      <LandingNav />
      <HeroLivingPlan />
      <ProblemNotice />
      <ThreeLevels />
      <EngineScience />
      <AmbientIntelligence />
      <Capabilities />
      <BrainDumpDemo />
      <Compounding />
      <VisionClose />
      <Pricing />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Delete obsolete components**

```bash
rm components/landing/Hero.tsx components/landing/FeatureBento.tsx components/landing/Philosophy.tsx
```

- [ ] **Step 3: Verify build (deleted files should not break anything)**

```bash
npm run build
```
Expected: build succeeds. If TypeScript reports `Module has no exported member` or similar for deleted components, search for stragglers:
```bash
grep -rn "Hero\|FeatureBento\|Philosophy" components/ app/ lib/ 2>/dev/null | grep -v "JarvisLogo\|HeroLivingPlan\|node_modules"
```
Resolve any references found.

- [ ] **Step 4: Verify in browser end-to-end**

```bash
npm run dev
```
Open http://localhost:3000 and scroll the entire page. Verify the order:
1. HeroLivingPlan (vision)
2. ProblemNotice (87 decisions)
3. ThreeLevels (calendar/scheduler/jarvis)
4. EngineScience (how i think — 5 stages)
5. AmbientIntelligence (i see your life happening)
6. Capabilities (what i can do)
7. BrainDumpDemo (try me)
8. Compounding (i get better every day)
9. VisionClose (Iron-Man-Jarvis)
10. Pricing (pick a tier)
11. Footer

Each section's motion runs as designed. No layout overflow. No visible 404s in console.

- [ ] **Step 5: Build + lint + commit**

```bash
npm run build
npm run lint
git add app/page.tsx components/landing/Hero.tsx components/landing/FeatureBento.tsx components/landing/Philosophy.tsx
git commit -m "feat(landing): final composition + remove obsolete components"
```

(`git add` on a deleted file stages the deletion.)

---

## Task 17: Final QA pass + reduced-motion verification

**Files:** none (verification only)

- [ ] **Step 1: Reduced-motion test**

In macOS System Settings → Accessibility → Display → enable "Reduce motion." Or in Chrome DevTools: Cmd+Shift+P → "Show Rendering" → "Emulate CSS media feature prefers-reduced-motion" → "reduce."

Reload the landing. Confirm:
- Aurora drift still applies a static layered gradient (no animation per existing globals.css rule)
- Engine traveling pulse and other infinite animations are disabled
- AmbientIntelligence section does NOT pin (renders all 4 scenes stacked)
- Hero signal cycling and schedule "moved" animations are skipped (final state shown)

- [ ] **Step 2: Mobile viewport test**

In Chrome DevTools, switch to iPhone 14 / Pixel 7 viewport.
- HeroLivingPlan: stacks vertically. Right column (signals + schedule) below the headline. No horizontal scroll.
- AmbientIntelligence: all 4 scenes render stacked, no pinning.
- All sections legible at 375px width.

- [ ] **Step 3: Logo consistency check**

Verify `<JarvisLogo>` appears in: `LandingNav` (md, animated), `Footer` (sm, animated), `VisionClose` (xl, animated). The signal dot orbits in all three. Wordmark is lowercase weight 300 in nav and footer.

The `app/(app)/*` interior is intentionally untouched — the orange "J" tile may still be visible in `NavRail.tsx`. That is **out of scope** per the spec; do not touch it.

- [ ] **Step 4: Production build + manual smoke**

```bash
npm run build
npm run start
```
Open http://localhost:3000 (production build). Re-scroll the page. Confirm everything still works (production minification sometimes reveals issues hot-reload hides).

- [ ] **Step 5: Final commit (if anything was tweaked)**

If Step 4 surfaced fixes, commit them with:

```bash
git add -A
git commit -m "fix(landing): production-build polish"
```

If nothing was tweaked, skip this commit.

- [ ] **Step 6: Push the branch**

```bash
git push -u origin feat/landing-superintelligence
```

The branch is ready for review / merge / preview deploy. **Do NOT merge to main from here** — leave that decision to the user.

---

## Self-review notes (post-write)

**Spec coverage check:**
- Voice principles: applied across all 11 section components. ✓
- Logo (mark + wordmark + sizes + motion): Task 1 + reused in Tasks 11, 13, 15. ✓
- Hero Living Plan with chat input + signal cycle + schedule rewrite: Task 12. ✓
- ProblemNotice single sentence: Task 2. ✓
- ThreeLevels with mini-plan recomposing: Task 3. ✓
- EngineScience with status bar, traveling rail, 5 stages, science marg, hover, closing: Task 4. ✓
- AmbientIntelligence with GSAP pin, 4 scenes, mobile fallback: Tasks 5–6. ✓
- Capabilities 5 sentences: Task 7. ✓
- BrainDumpDemo with parser + textarea + live blocks: Tasks 8–9. ✓
- Compounding 3 milestones with traveling hairline: Task 10. ✓
- VisionClose with grain + horizon + xl logo: Task 11. ✓
- Pricing copy refresh: Task 14. ✓
- Footer refresh: Task 15. ✓
- LandingNav new logo + lowercase: Task 13. ✓
- Final composition + delete: Task 16. ✓
- Reduced-motion + mobile QA: Task 17. ✓

**Type/contract consistency:** `JarvisLogo` size enum `"sm" | "md" | "lg" | "xl"` is consistent across nav (md), footer (sm), vision (xl). `AmbientScene` and `ScheduleBlock` types in `lib/landing/scenes.ts` are imported as named imports in `AmbientIntelligence.tsx`. `ParsedBlock` from `dumpParser.ts` is imported in `BrainDumpDemo.tsx`. No naming drift.

**Placeholder scan:** searched for TODO/TBD/FIXME — none in plan body.

**Scope:** 17 tasks, frontend only, no new deps. Each task produces a self-contained working state. Clean for one implementation run.
