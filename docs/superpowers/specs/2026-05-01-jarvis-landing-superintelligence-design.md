# Jarvis Landing — Superintelligence Redesign

**Date:** 2026-05-01
**Scope:** `jarvis-frontend` landing page (`app/page.tsx` + `components/landing/*`) and shared logo. Frontend only.
**Pitch source:** `~/Downloads/jarvis_vc_pitch  -  Repaired.pptx` (14-slide VC deck) + supporting PDFs (Psychological Factors, Productivity Engine Spec, Backend Blueprint, Day-1 Behavior, Recurring Habits Logic, Architecture diagram).
**Why this exists:** the current landing reads as "another productivity SaaS" — orange "J" tile, feature bento, brain-orb hero. The deck argues Jarvis is a *superintelligence applied to real life*. The landing must feel like meeting one, not buying software.

---

## Goals

1. **Read as a superintelligence, not a SaaS pitch.** First-person Jarvis voice. The page demonstrates intelligence; it does not describe it.
2. **Embody the deck's central insight:** Jarvis is a third tier above calendars and schedulers — it *prepares*. Vision → Category → Action ordering.
3. **Make psychology the differentiator** that no competitor can copy. Surface real frameworks (Decision Fatigue, Cognitive Load, Implementation Intentions, Mastery Orientation, Spaced Repetition) without selling them.
4. **A logo that signals "engine running,"** not "app in the App Store." Replace the orange "J" tile.
5. **Animation language that conveys aliveness** — traveling pulses, breathing, ambient signals — without crossing into noise.
6. **Same color system, same fonts, same Tailwind tokens.** No brand reset.

## Non-goals

- Backend changes (engine API, SSE, persistence). Out of scope.
- App interior (`/dashboard`, `/chat`, `/schedule`, `/workspace`, `/documents`, `/habits`). Untouched.
- Authentication / real onboarding. The brain-dump demo on the landing is a frontend mock that routes to existing `/dashboard`.
- Light-mode landing. Landing is dark-only. The app's existing light/dark theme system is preserved for the interior.
- New Tailwind tokens, new fonts, new shadcn migration — not now.

---

## Voice principles

The whole page speaks as **Jarvis, in first person.** Iron-Man-Jarvis dry: confident, slightly amused, never sappy, never cute.

| Principle | Yes | No |
|---|---|---|
| Subject | "I capture once, so you decide once." | "Jarvis captures once…" |
| Section headers | `how i think` (lowercase, mono, label-style) | `THE INTELLIGENT LOOP` |
| Asides | Parenthetical *(yes, I know about that)* | "We added [feature]…" |
| Closers | A thought: *"or so my training data assures me."* | A CTA: *"Start your free trial today!"* |
| Stats | One quiet line: *"~87 decisions before noon."* | A 4-stat strip with big numbers |
| Citations | Dim margin notes that brighten on hover | Boxed "Frameworks We Use" credentials |
| Wit examples | *"mine just doesn't crash for snacks"* / *"specific intentions live to be done"* / *"there's always a curve"* | Emojis. Exclamation points. "We're so excited…" |

Apply across every section. If a sentence could appear on a typical SaaS landing, rewrite it.

---

## Logo

**Mark:** "Loop + signal" — a J-as-loop glyph with the descender curling into a closed circle and a small entry gap at the top. Stroke is a linear gradient of the brand palette: terra `#D4775A` → gold `#E09D5C` → dusk `#6B7FB5`. A luminous signal dot (gold, with `box-shadow` glow) orbits the loop.

**Wordmark:** lowercase **`jarvis`** in the existing Inter family, weight `300`, letter-spacing `-0.3px`. Replaces the current bold "Jarvis."

**Sizes & motion:**

| Use | Size | Motion |
|---|---|---|
| Favicon | 20×20 | Static |
| Nav | 26×26 (mark) + wordmark | Signal orbit at 4s linear loop |
| Footer | 22×22 (mark) + wordmark | Signal orbit at 4s linear loop |
| Hero moment (section 9 vision close) | 96×96 | Breathing scale (1.0↔1.04 over 3.5s) + signal orbit at 4s |

**Implementation:** new component `components/landing/JarvisLogo.tsx` exporting `<JarvisLogo size="sm|md|lg" wordmark={true|false} animated={true|false} />`. SVG-based; signal dot animated via SVG `<animate>` along the loop path (no JS overhead). Used in `LandingNav`, `Footer`, and the hero — and replaces every instance of the orange "J" tile in the existing landing components.

**Reduced motion:** when `prefers-reduced-motion: reduce`, signal dot is static at the entry-gap position; breathing is disabled. (Globals.css already handles `animation-duration` reset; SVG `<animate>` honors via the wrapping `<g>` having a media query in CSS.)

---

## Page architecture

11 sections + footer, in fixed order. Each section is its own React component under `components/landing/`. The page composition lives in `app/page.tsx`.

```
LandingNav (fixed, z-50)
─────────
1.  HeroLivingPlan          — vision: "I think about your day before you do."
2.  ProblemNotice            — "i notice." — one quiet line
3.  ThreeLevels              — "calendars say when. schedulers say what. i prepare."
4.  EngineScience            — "how i think" — 5-stage loop + science marginalia
5.  AmbientIntelligence     — "i see your life happening." — scroll-pinned scenes
6.  Capabilities             — "what i can do." — 5 plain sentences
7.  BrainDumpDemo           — "try me." — interactive input → live plan
8.  Compounding              — "i get better every day." — Day 1 / Month 3 / Year 1
9.  VisionClose              — "we're building the jarvis from iron man — for real life."
10. Pricing                  — "pick a tier." (refreshed)
─────────
11. Footer                   — minimal, refreshed
```

Each section maps deliberately to a deck slide and a clear job.

---

## Section specs

### 1 · HeroLivingPlan

**Slide:** 1 (vision)
**Job:** First contact. Show, in 3 seconds, that Jarvis sees life and rewrites the plan.

**Layout:** Two columns on `md+`, stacked on mobile.
- **Left:**
  - Status eyebrow: `● jarvis · running` (mono 11px, tracking 1.5px, terra)
  - Headline: *"I think about your day **before** you do. Then I handle it before you ask."* (48–56px, weight 300, letter-spacing -1.2px, terra accent on the bold word)
  - Sub: *"Tell me what's on your mind."* — rendered as an actual `<input>` styled as a chat field with a subtle focus ring (terra/30%) and an enter-arrow button. Placeholder cycles every 4s through real prompts: *"Prepare for ML competition by Friday…"* / *"Cram for finals next week…"* / *"Set up a workout habit again…"* On submit/enter, route to `/dashboard` with the typed text encoded in the URL (frontend mock — no backend write).
- **Right:**
  - **Living Plan composition.** Two stacked layers:
    - **Layer A — incoming signals (left of right column):** 3 floating cards (iMessage, Slack, Calendar). Each card has its own native chrome (rounded edges, blurred translucent background), brand-color border. One is "active" (terra glow + scaled 1.02), others 0.55 opacity. The active card cycles every 6s.
    - **Layer B — schedule (right of right column):** a real-looking schedule card titled `TODAY · WED` with a green pulse "LIVE" indicator. Inside: 5 timeline rows with start times, color-coded blocks (study terra, gym sage, meeting dusk, "moved" gold). When a signal becomes "active" on layer A, one schedule block animates: it slides ~16px right, recolors to gold, gets a "moved" tag. After 4s it returns. The cycle is in sync with layer A's signal cycle.

**Background:** existing aurora drift (`Hero.tsx` keyframes) preserved. Add a 1px ticking grid (faint terra dots, 24px spacing) under the layout for "console feel."

**Motion timings:**
- Headline fade+rise stagger: 0.6s, easeOut, delay 0.15s × index
- Aurora drift: 15s ease-in-out (existing)
- Signal card cycle: 6s
- Schedule rewrite micro-animation: 0.45s easeOut for slide+recolor, 0.3s for "moved" tag fade-in
- Reduced motion: signals are statically positioned, schedule rewrite skipped, "moved" tag visible by default.

**Files:** new `components/landing/HeroLivingPlan.tsx` replacing existing `Hero.tsx`. Existing brain-orb logic deleted.

---

### 2 · ProblemNotice

**Slide:** 2 (problem)
**Job:** One quiet line that hits. Sets up the psychology arc without a stat avalanche.

**Layout:** centered, max-w 680px, vertical center alignment, 160px top/bottom padding.
- Header: `i notice.` (mono lowercase, 11px, terra)
- Body: *"You make about **87 decisions** before noon. Most are tiny. All cost you."* (28–32px, weight 300)
- Aside: *"(That's why your big ones feel hard by 4 p.m.)"* (15px, weight 300, muted, italic)

**Motion:** scroll-into-view fade+rise (motion/react) on the body; aside stays at 0.4 opacity until the body is fully visible, then crossfades to 0.7 opacity.

**Files:** new `components/landing/ProblemNotice.tsx`. (Note: no four-stat strip from slide 2 — single sentence by design.)

---

### 3 · ThreeLevels

**Slide:** 3 (category)
**Job:** Define the category. Three tiers, ascending. The third is *me* — and it visibly works while the others sit still.

**Layout:** Three rows, vertically stacked, generous spacing (96px between).
- Header: `there's me, and there's everything before me.`
- Row 1 — Calendar
  - Label: *"a calendar tells you when."*
  - Right column: a static row `9:00  meeting with prof`
- Row 2 — Scheduler
  - Label: *"a scheduler tells you what."*
  - Right column: a static row `10:00  work on physics`
- Row 3 — Jarvis
  - Label: *"i prepare."*
  - Right column: a tiny live mini-plan that quietly recomposes (3 blocks, every 5s one block re-orders or recolors with a soft transition).
- Closer below: *"Same words on the calendar. Different relationship to your day."*

Each row has a left-edge tick mark (1px, dimmer for tier 1, brighter for tier 3). The third row's tick is full-bright terra; rows 1–2 are sage at 0.4 opacity.

**No competitor names anywhere.** The third tier is just "Jarvis."

**Motion:** scroll-triggered, each row reveals 0.3s after the previous. Mini-plan animation runs idle once the row is in view. Reduced motion: mini-plan is static.

**Files:** new `components/landing/ThreeLevels.tsx`.

---

### 4 · EngineScience

**Slide:** 5 (loop) + slide 6 (decomposition) + psychology theme. Merged.
**Job:** The page's most VC-credible moment. Show how Jarvis thinks; quietly cite the science behind each stage.

**Already prototyped:** see `engine-science-v3.html` in `.superpowers/brainstorm/` for the locked design.

**Section frame:**
- Background: `#1A1815`, inset shadow, two radial glows (warm bottom-left, cool top-right), 4 corner crops (1px terra @ 0.4 opacity).
- Top status bar: live green pulse `jarvis · running` (left) + iteration counter `iteration #<N> · loop alive since day one` (right), where `<N>` is seeded on mount from `Math.floor(Date.now() / 1000) % 1_000_000` and increments by a random value in `[1, 7]` every 1.2s. Effect: the number is always advancing and never repeats across visits.

**Header block:**
- Label: `❮ how i think ❯`
- H3: *"I think in loops. **So does your brain** — mine just doesn't crash for snacks."*
- Preamble: *"Five stages. Each one borrowed from a real paper. Hover a stage if you want the receipts. *(I keep receipts.)*"*

**Stages (left rail with traveling pulse + 5 rows):**

The left rail is a 1px vertical line in terra at 0.3 opacity. A 7px terra dot with a 12px box-shadow glow travels down the rail in an 8s ease-in-out loop, pausing briefly at each stage's vertical position.

| # | Glyph | Stage | Speech | Science (margin) |
|---|---|---|---|---|
| 01 | ◴ | capture | *"I read your brain dump **once** — so you can stop rehearsing it in the shower (yes, I know about that)."* | Decision Fatigue · Baumeister, 2003 — *"Every choice depletes self-regulation. Capture compresses a hundred small choices into one."* |
| 02 | ⌗ | shape | *"I cut it into **25-minute pieces**. Your working memory holds about four chunks. Bigger pieces? They land on the floor. I checked."* | Cognitive Load Theory · Sweller, 1988 — *"~4 chunks at a time. Anything heavier overflows working memory and stops being learned."* |
| 03 | ⌲ | place | *"I park each piece somewhere **specific** — when, where, after what. Vague intentions die alone. Specific ones live to be done."* | Implementation Intentions · Gollwitzer, 1999 — *"'When-X-then-Y' plans roughly triple action rates over abstract intent."* |
| 04 | ⊜ | listen | *"Skip something? Nothing breaks. No streak ruined, no eyebrow raised — I don't have eyebrows. I take the **data** and rebuild the day around you."* | Mastery Orientation · Dweck, 1986 — *"Failure as feedback (not verdict) sustains effort. Anti-guilt is structural here, not copy."* |
| 05 | ⌬ | remember | *"I bring things back **right before you'd forget them** — not on a streak you'll resent, on the curve memory actually follows. There's always a curve."* | Spaced Repetition · Wozniak (SM-2), 1990 — *"Memory decays exponentially. Reviews at the inflection points minimize total time, maximize retention."* |

Each row is a 3-column grid: `96px stage-num+glyph | 1.4fr speech | 1fr science`. Speech text 22–23px weight 300 with the bold-callout in gold. Science is 11.5px monospace at 0.4 opacity, brightening to 0.7 on hover; the framework `ref` line uses sage `#4A7B6B`.

**Hover row:**
- Orange edge appears to the left (-36px), 2px wide with a glow.
- Glyph bezel intensifies (background opacity 0.08 → 0.18, border opacity 0.25 → 0.5).
- Science marg color brightens.

**Closing line:**
*"Then I close the loop. Tomorrow, I'm a little more like you. Day 1, useful. Month 3, yours. Year 1, **irreplaceable** — *or so my training data assures me.*"*
Preceded by a 9px terra pulse dot (2.4s breathing).

**Motion library:** mostly CSS keyframes (already in scope of `globals.css`); the iteration counter uses a React `useEffect` interval; the traveling rail pulse uses pure CSS `@keyframes travel`. No GSAP needed here.

**Files:** new `components/landing/EngineScience.tsx`. Replaces the existing `FeatureBento.tsx` and `Philosophy.tsx` together.

---

### 5 · AmbientIntelligence

**Slide:** 7 (ambient)
**Job:** The most emotional moment on the page. Show Jarvis silently rewriting plans in response to *life,* not calendar events.

**Layout:** scroll-pinned section (GSAP `ScrollTrigger`, `pin: true`, `scrub: 0.5`). The section pins for ~400vh of scroll, during which 4 scenes cycle through.

**Header (sticky at top during pin):**
- Label: `i see your life happening.`
- H3: *"You don't open me. I'm already there."* (32px, weight 300)

**Scene structure (left signal · right schedule):**
- **Left column (40% width):** the inbound signal in its native chrome.
  - **Scene 1 — iMessage bubble:** sender "Sara", message *"Surprise dinner tonight @ 8?"* — bubble in iMessage blue/grey aesthetic
  - **Scene 2 — Slack message:** channel `#ml-team`, sender "Priya", *"Deadline pushed to Wed"*
  - **Scene 3 — Gmail card:** sender "University Registrar", *"Exam schedule released"*, with a `📎 attached: schedule.pdf` chip
  - **Scene 4 — Calendar card:** *"Prof Singh: Office Hours moved to 3 PM"*
- **Right column (60% width):** the same schedule template throughout, recomposing per scene.
  - Scene 1: 7-9 PM study block visibly slides up to "tomorrow 10 AM" with a "moved" tag.
  - Scene 2: 3 project task blocks redistribute across days; ML exam-prep block expands with a "+30m" tag.
  - Scene 3: 3 weeks of new study blocks fade in across the calendar with an "extracted from PDF" tag.
  - Scene 4: deep-work blocks shift to next focus window; quick-review block fills the gap.

**Bottom of section (sticky during pin, lower-third):**
- Tagline: *"Most apps reschedule when your **calendar** changes. I reschedule when your **life** changes."* (italic on "calendar" and "life", terra accent on "I reschedule")

**Motion:**
- GSAP `ScrollTrigger` pins the section. As scroll progresses 0→1, the active scene index advances 0→4 (each scene gets ~25% of the pinned range).
- Scene transitions: 0.5s crossfade for the inbound card; 0.6s easeOut for schedule blocks (translate + color).
- Reduced motion: `pin: false`, scenes shown stacked vertically, no animations.

**Files:** new `components/landing/AmbientIntelligence.tsx`. New helper `lib/landing/scenes.ts` with the scene data (typed `AmbientScene[]`).

---

### 6 · Capabilities

**Slide:** 4 + 10 (selected feature points)
**Job:** Five plain sentences about what Jarvis does, no bento, no badges.

**Layout:** centered max-w 720px, vertical, generous line-height. Each sentence is its own row separated by a hairline divider.
- Header: `what i can do.`
- Sentences (all in first person, all in the same 22px weight 300 type, terra accent on the noun):
  1. *"I read your **documents** — syllabi, PDFs, slides — and pin the right pieces to the right work."*
  2. *"I **remember** what matters and forget what doesn't, on the curve memory follows."*
  3. *"I do the **math** on your constraints. Conflicts aren't possible."*
  4. *"I **learn** how you actually work — when you focus, when you skip, when you lie about it."*
  5. *"I run on **your machine.** Your data stays where you sleep."*

**Motion:** each sentence fades in on scroll-into-view, 0.5s easeOut, stagger 0.12s.

**Files:** new `components/landing/Capabilities.tsx`. Existing `FeatureBento.tsx` is removed (its responsibility absorbed by EngineScience + Capabilities + AmbientIntelligence).

---

### 7 · BrainDumpDemo

**Slide:** 4 (action)
**Job:** Let the visitor *try* Jarvis. Highest conversion point on the page.

**Layout:** Two columns.
- **Left:** a real `<textarea>` styled as a brain-dump pad. Placeholder cycles through real-feeling prompts every 5s (when empty/unfocused). Header above: `try me.`
- **Right:** an empty schedule card (`TODAY · MOCK · DEMO`) that animates as the user types. Triggered by:
  - **On any keystroke:** schedule card subtly pulses
  - **After ~600ms of idle typing:** a parser runs (frontend, regex-based, recognizes patterns like *"by Friday"*, *"3x a week"*, *"every morning"*, *"call X"*, *"prep Y"*) and injects 3–6 schedule blocks matching the dump's intent.
  - **Pre-filled prompt** (if the textarea is empty): *"Prepare for ML competition by Friday. Gym 3x. Call mom Sunday."* — and the schedule card pre-shows the matching blocks, so even idle visitors see the magic.

Below both columns:
- Closer: *"That's it. That's the demo. The rest is just running it for years."*
- Single CTA below the closer: a `begin →` link routing to `/dashboard?seed=<encoded-textarea>`.

**Parser (frontend mock):** `lib/landing/dumpParser.ts`. A small regex-based parser that extracts:
- **deadlines:** `by (Mon|Tue|Wed|Thu|Fri|Sat|Sun|next week|tonight|tomorrow|Friday)` → assigns blocks before the deadline
- **recurrences:** `(\d+)x` (weekly default), `every (morning|evening|day|Mon|...)` → recurring habit
- **named tasks:** "call X", "study Y", "prep for Z", "meeting with W" → categorized blocks
- **fallback:** unrecognized phrases → generic `Focus block` 25 min

The parser does **not** produce backend-quality scheduling — it's a visual mock. Marked clearly in code comments.

**Motion:**
- Block appearance: 0.4s easeOut, stagger 0.08s
- Block re-flow when textarea changes: AnimatePresence layout
- Pulse on keystroke: 80ms scale 1→1.01→1
- Reduced motion: parsed blocks appear instantly, no pulsing.

**Files:** new `components/landing/BrainDumpDemo.tsx` + new `lib/landing/dumpParser.ts`.

---

### 8 · Compounding

**Slide:** 12 (moats), reframed as growth-with-time, never defensive.
**Job:** Show that switching cost compounds. Never name competitors, never use the word "moat."

**Layout:** a horizontal 3-column timeline. Each column has a milestone label, a Jarvis-voice quote, and a quiet sub-line that secretly references one of the architectural moats but in growth language.
- Header: `i get better every day.`
- Subhead (above timeline): *"Day one is good. By month three I'm yours."*

| Column | Label | Quote | Sub-line (architectural reference) |
|---|---|---|---|
| 1 | **Day 1** | *"I'm useful out of the box."* | *(architecture — integrated engine on day one)* |
| 2 | **Month 3** | *"I know your energy. Your habits. The mornings you skip and don't admit. I'm yours."* | *(data — personalization compounds)* |
| 3 | **Year 1** | *"Switching feels like starting over with a stranger."* | *(compounding — psychology + ambient layered)* |

A horizontal hairline connects the three columns. As the user scrolls into view, a terra signal travels left → right along it (4s linear).

**Motion:** scroll-triggered reveal column-by-column with stagger 0.3s; signal travels along the hairline once, then loops every 12s.

**Files:** new `components/landing/Compounding.tsx`.

---

### 9 · VisionClose

**Slide:** 14 (vision)
**Job:** Final emotional landing. Quiet, cinematic.

**Layout:** full-bleed dark, 80vh tall. Centered max-w 760px text block.
- Logo (mark only, hero scale 96×96 — matches the logo motion table) breathing above the text.
- H2: *"We're building the **Jarvis** from Iron Man — for real life."* (40–48px, weight 300, terra accent)
- Body: *"A learning loop that compounds daily. Always preparing. Always learning. Always in your corner."* (16px, weight 300, muted)
- Subtle CTA: a single `begin.` lowercase link routing to `/dashboard`.

**Background:**
- Faint film-grain overlay (radial dot pattern, 0.03 opacity).
- Aurora horizon glow at the foot of the section (terra/15%, blurred 80px).

**Motion:**
- Text fades in from below as section enters viewport (0.8s easeOut, stagger 0.2s).
- Logo signal-orbit slows to 6s here for a cinematic feel.

**Files:** new `components/landing/VisionClose.tsx`. Existing `Philosophy.tsx` is removed (its quote absorbed into EngineScience and the vision).

---

### 10 · Pricing

**Slide:** 13 (pricing)
**Job:** Pick a tier. Refresh existing two-card layout to match the new voice.

**Layout:** existing 2-column card layout preserved. Copy refreshed:
- Header: `pick a tier.`
- **Free**
  - Price: $0 / forever
  - Pitch: *"Enough to try me. One active goal. The basics."*
  - Bullets:
    - *I capture and shape your brain dump.*
    - *I build a schedule that won't conflict.*
    - *I don't keep your stuff. You can delete me with one click.*
  - CTA: `begin →`
- **Pro** (popular)
  - Price: $9.99 / mo · $89/yr
  - Pitch: *"Unlimited goals. Documents. Behavior. Memory. The whole loop."*
  - Bullets:
    - *Everything in Free.*
    - *I read your documents and pin them to your work.*
    - *I learn your patterns and adjust the math.*
    - *I negotiate when you push back.*
    - *I remember on the curve, not the streak.*
  - CTA: `begin →` (with terra fill background)
- Footer note: *"No card. Cancel by saying so."*

**Motion:** existing card hover lift retained.

**Files:** rewrite `components/landing/Pricing.tsx` (preserve structure, replace copy + tighten styles to match the rest of the page).

---

### 11 · Footer

**Layout:** simple 3-row centered.
- Row 1: `<JarvisLogo size="sm" wordmark={true} animated={true} />`
- Row 2: *Built by a student. Designed for one.*
- Row 3 (mono 10px, muted, tracking 1.5px): `© 2026 jarvis · privacy · terms · contact`

**Motion:** logo signal-orbit on idle.

**Files:** rewrite `components/landing/Footer.tsx`.

---

## Navigation (LandingNav)

Existing scroll-aware nav. Update:
- Replace orange "J" tile with `<JarvisLogo size="md" wordmark={true} animated={true} />`.
- Wordmark "Jarvis" → lowercase `jarvis`, weight 300.
- Nav links: rename `How it works` → `how`, `Features` → `why`, keep `pricing`. All lowercase, mono-tracking 1px. Remove `Get Started` button — replace with a single `begin →` link in terra (no tile).

**Files:** rewrite `components/landing/LandingNav.tsx`.

---

## Motion language — global rules

| Rule | Value |
|---|---|
| Section entry | `motion/react`, `whileInView`, `easeOut`, 0.5–0.6s, stagger 0.08–0.15s |
| Pinned section | GSAP `ScrollTrigger`, `pin: true`, `scrub: 0.5` (Section 5 only) |
| Idle ambient cycles | 4s, 6s, 8s, 12s — never <2s |
| Hover state | 0.3s ease, orange edge + brightening of secondary content |
| Reduced motion | All keyframes/scrub disabled; final state shown immediately |
| Aurora background | Existing 15s ease-in-out drift, preserved |
| Signal pulse motif | Used in: logo (4s orbit), Engine left rail (8s travel), 3-Levels mini-plan (5s), Compounding hairline (4s + 12s rest) |

---

## Tech notes

- **Stack:** Next.js 14.2.35 · React 18 · Tailwind 3.4 · `motion` 12.38 · `gsap` 3.14 + `@gsap/react` 2.1. All already in `package.json`. No new deps.
- **GSAP ScrollTrigger:** import via `import { ScrollTrigger } from "gsap/ScrollTrigger"; gsap.registerPlugin(ScrollTrigger);` — used **only** in `AmbientIntelligence.tsx` (pinning) and `Compounding.tsx` (hairline travel reset on scroll).
- **Color tokens:** unchanged. All hardcoded HEXes in components reference the same values defined in `globals.css` CSS variables and Tailwind config — no new tokens.
- **Fonts:** Inter (existing). Add `font-feature-settings: "ss01"` to mono labels for stylistic alternates if available.
- **Type weights:** introduce `font-light` (300) usage for headlines (`font-extrabold` only for accents now). No new font import.
- **SVG-first:** logo, glyphs, schedule blocks are all SVG-based. No image assets added.
- **Accessibility:**
  - Headlines remain `<h1>/<h2>/<h3>` semantic; lowercase mono labels are `<span class="label">` not headings.
  - All interactive elements (CTA links, demo input, brain-dump textarea) have keyboard focus rings (existing `:focus-visible` in globals.css).
  - Animation honors `prefers-reduced-motion` per existing globals rule.

---

## Files affected

**Rewrite:**
- `app/page.tsx` (compose new sections)
- `components/landing/LandingNav.tsx`
- `components/landing/Pricing.tsx`
- `components/landing/Footer.tsx`

**Delete:**
- `components/landing/Hero.tsx` (replaced by HeroLivingPlan)
- `components/landing/FeatureBento.tsx` (responsibility split into EngineScience + Capabilities)
- `components/landing/Philosophy.tsx` (folded into EngineScience and VisionClose)

**New:**
- `components/landing/JarvisLogo.tsx`
- `components/landing/HeroLivingPlan.tsx`
- `components/landing/ProblemNotice.tsx`
- `components/landing/ThreeLevels.tsx`
- `components/landing/EngineScience.tsx`
- `components/landing/AmbientIntelligence.tsx`
- `components/landing/Capabilities.tsx`
- `components/landing/BrainDumpDemo.tsx`
- `components/landing/Compounding.tsx`
- `components/landing/VisionClose.tsx`
- `lib/landing/scenes.ts` (Ambient Intelligence scene data)
- `lib/landing/dumpParser.ts` (Brain Dump demo parser)

**Untouched (frontend-only scope):** everything under `app/(app)/*`, `components/app/*`, `lib/api.ts`, `lib/store.ts`, all backend code in the sibling `Jarvis-Engine/` repo.

---

## Risks & open questions

- **GSAP pin interaction with mobile Safari:** ScrollTrigger pinning has known quirks on iOS. Test early; if problematic, fall back to scroll-driven (no pin) on `< md` breakpoints — section degrades to a stacked vertical of all 4 scenes, no scrub.
- **Brain-dump parser scope creep:** the regex parser is intentionally a mock. If it starts to feel "fake" during use, we accept that — the goal is *visual* believability, not real planning. A note in code prevents future drift.
- **Iteration counter realism:** the live `#84,213` counter is set to a starting offset and increments randomly. If a viewer notices the same number across visits, the magic dies. Solution: seed the starting count from `Date.now()` modulo a constant so it's always different and always advancing.
- **Logo file consistency:** the existing dashboard / app interior uses the orange "J" tile in `NavRail.tsx`. **In scope here only for the landing.** App interior keeps the old tile until a separate brand sweep — this is intentional to keep change set bounded.
- **Pre-filled brain-dump prompt vs. blank state:** the prefilled text shows magic immediately but risks looking canned. If the prefilled blocks animate in over the first 1.5s after section enters viewport (rather than on mount), it feels like the page is "thinking for you" — preferred. Captured in motion timing above.

---

## What done looks like

When this lands, a VC scrolling the page should feel:
1. *"This is a different category."* — within 8 seconds (hero + 3 levels)
2. *"They actually thought about the science."* — Engine + Science section
3. *"This is unlike any product I've seen."* — Ambient Intelligence
4. *"I want to type into that input."* — Brain Dump demo
5. *"I trust the founder."* — closing vision

A student should feel:
1. *"This thing actually wants to help me."* — voice
2. *"It won't shame me when I skip."* — psychology section
3. *"I should try it right now."* — brain dump demo

Neither should ever feel: *"Another scheduler."*
