# Jarvis Frontend — Complete Design Specification

**Date:** 2026-03-29
**Purpose:** VC pitch (April 1, 2026) + production-ready frontend
**Project:** `/Users/madhav/Jarvis-cursor/jarvis-frontend/` (new Next.js project)
**Backend:** `/Users/madhav/Jarvis-cursor/Jarvis-Engine/` (FastAPI, port 8000)
**Reference:** `/Users/madhav/Jarvis-cursor/jarvis-demo/` (existing prototype — port features, not code)

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Design System](#2-design-system)
3. [Landing Page](#3-landing-page)
4. [Onboarding Flow](#4-onboarding-flow)
5. [App Interior — Command Center](#5-app-interior--command-center)
6. [All 8 Pages](#6-all-8-pages)
7. [Micro-Interactions & Animations](#7-micro-interactions--animations)
8. [Responsive Design](#8-responsive-design)
9. [Features Ported from jarvis-demo](#9-features-ported-from-jarvis-demo)
10. [Spline 3D Scene Guides](#10-spline-3d-scene-guides)
11. [Logo & Animated Mark](#11-logo--animated-mark)
12. [Implementation Priority Tiers](#12-implementation-priority-tiers) ⭐ NEW
13. [Empty States](#13-empty-states) ⭐ NEW
14. [Error States & Graceful Degradation](#14-error-states--graceful-degradation) ⭐ NEW
15. [Accessibility](#15-accessibility) ⭐ NEW
16. [SEO (Landing Page)](#16-seo-landing-page) ⭐ NEW
17. [API Contract Map](#17-api-contract-map) ⭐ NEW
18. [VC Demo Script](#18-vc-demo-script-2-minutes) ⭐ NEW

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 14 (App Router)** | SSR, file-based routing, existing familiarity |
| Language | **TypeScript** | Type safety across components |
| Styling | **Tailwind CSS 3.4** | Utility-first, CSS variables for theming. v3.4 (not v4) for Aceternity UI compatibility. |
| Animation (scroll) | **GSAP 3 + ScrollTrigger** | Pinned scroll sections, timeline control |
| Animation (UI) | **Motion (framer-motion)** | Spring physics, layout animations, micro-interactions |
| 3D | **@splinetool/react-spline** | Spline 3D embeds (hero brain, architecture) |
| Components | **Aceternity UI** (cherry-picked) | Aurora Background, Text Generate, Moving Border, Bento Grid, Spotlight, Infinite Cards |
| Calendar | **FullCalendar 6** | Day/week/month views, drag-and-drop |
| Markdown | **react-markdown + remark-gfm** | Jarvis response rendering |
| Icons | **Lucide React** | Clean, consistent icon set |
| State | **React Context (global) + hook-local state** | Theme & mode in Context. Chat streaming state local to `useJarvisChat` hook (avoids re-render cascade). Schedule data in dedicated `useSchedule` hook. localStorage for persistence. Zustand if Context perf becomes an issue. |
| Charts | **Recharts** | React-native charting for Analytics page. Lightweight, composable, Tailwind-friendly. |
| API | **Fetch + SSE** | Streaming responses from FastAPI backend |

**Not using:** Heavy component libraries (shadcn, MUI, Chakra). We build our own design system components to maintain full control over the warm palette and animations.

---

## 2. Design System

### 2.1 Color Palette — "Jarvis Warm Spectrum"

All colors are CSS custom properties AND Tailwind theme tokens. Change one file, the entire app updates.

#### Semantic Colors

| Name | Hex | CSS Variable | Tailwind | Role |
|------|-----|-------------|----------|------|
| **Terra** | `#D4775A` | `--color-terra` | `terra` | Brand accent, CTAs, Jarvis's voice, primary buttons |
| **Sage** | `#4A7B6B` | `--color-sage` | `sage` | Success, completion, "done" state, checkmarks |
| **Dusk** | `#6B7FB5` | `--color-dusk` | `dusk` | Focus, active/in-progress tasks, links |
| **Warm Gold** | `#E09D5C` | `--color-gold` | `gold` | Warnings, deadlines approaching, streaks, gentle urgency |
| **Ink** | `#2C2924` | `--color-ink` | `ink` | Primary text (light mode), nav rail, dark surfaces |

#### Surface Colors — Light Mode

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| **Canvas** | `#FAF8F4` | `--surface-canvas` | Page background |
| **Card** | `#FFFFFF` | `--surface-card` | Cards, schedule blocks, panels |
| **Subtle** | `#F5F0E8` | `--surface-subtle` | AI chat panel bg, secondary surfaces |
| **Muted** | `#F0EBE3` | `--surface-muted` | Input backgrounds, hover states |
| **Border** | `#EDE9E1` | `--border-default` | Card borders, dividers |
| **Border Strong** | `#D8D0C4` | `--border-strong` | Active borders, focus rings |

#### Surface Colors — Dark Mode

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| **Canvas** | `#1C1A17` | `--surface-canvas` | Page background |
| **Card** | `#252320` | `--surface-card` | Cards, panels |
| **Subtle** | `#201E1B` | `--surface-subtle` | AI panel bg |
| **Muted** | `#2C2924` | `--surface-muted` | Inputs, hover |
| **Border** | `#3A3632` | `--border-default` | Borders |
| **Border Strong** | `#4A4640` | `--border-strong` | Active borders |

#### Text Colors

| Name | Light Hex | Dark Hex | Usage |
|------|----------|---------|-------|
| **Primary** | `#2C2924` | `#FAF8F4` | Headings, body text |
| **Secondary** | `#6B6560` | `#9C9488` | Subtitles, timestamps |
| **Muted** | `#9C9488` | `#6B6560` | Placeholders, disabled |

### 2.2 Typography

| Element | Font | Weight | Size | Tracking |
|---------|------|--------|------|----------|
| **H1 (hero)** | Inter Display | 800 | 56px / 3.5rem | -2px |
| **H2 (section)** | Inter Display | 700 | 32px / 2rem | -1px |
| **H3 (card title)** | Inter | 600 | 18px / 1.125rem | -0.5px |
| **Body** | Inter | 400 | 14px / 0.875rem | 0 |
| **Small** | Inter | 400 | 12px / 0.75rem | 0 |
| **Label** | Inter | 600 | 10px / 0.625rem | 1px (uppercase) |
| **Code** | JetBrains Mono | 400 | 13px | 0 |

**Font sourcing:** Download Inter v4.0+ from [rsms.me/inter](https://rsms.me/inter) which includes the Display optical size variant. Use `next/font/local` for self-hosting (not Google Fonts, which lacks Inter Display). JetBrains Mono from Google Fonts is fine.

### 2.3 Spacing & Layout

- **Base unit:** 4px
- **Component padding:** 12px, 16px, 20px, 24px
- **Card border-radius:** 12px
- **Button border-radius:** 8px
- **Pill border-radius:** 20px (tags, badges)
- **Nav rail width:** 56px
- **AI chat panel width:** 280px (collapsible)
- **Max content width:** 1440px (landing page)
- **Grid:** 12-column on desktop, 8 on tablet, 4 on mobile

### 2.4 Shadows & Elevation

| Level | CSS | Usage |
|-------|-----|-------|
| **sm** | `0 1px 2px rgba(44,41,36,0.06)` | Cards at rest |
| **md** | `0 2px 8px rgba(44,41,36,0.08)` | Active task, hover cards |
| **lg** | `0 8px 24px rgba(44,41,36,0.12)` | Modals, command palette |
| **glow-terra** | `0 0 20px rgba(212,119,90,0.15)` | CTA hover, Jarvis avatar |
| **glow-dusk** | `0 0 12px rgba(107,127,181,0.12)` | Active task highlight |

---

## 3. Landing Page

**Theme:** Always dark (`#1C1A17` base). Cinematic. Scroll-driven narrative.

### 3.1 Navigation Bar (sticky)

- Fixed at top, transparent initially → solid dark on scroll
- Left: Jarvis logo (animated J mark) + "Jarvis" wordmark
- Right: Features | How it works | Pricing | **Get Started** (Terra CTA button)
- Height: 64px
- Blur backdrop on scroll: `backdrop-filter: blur(12px)`

### 3.2 Section 1 — Hero (100vh)

**Layout:** Two columns. Text left (55%), Spline 3D right (45%).

**Left column:**
- Kicker: "AI-Powered Preparation Engine" (Terra, uppercase, letter-spacing 2px)
- Headline: "Your brain dump **becomes your plan.**" (FAF8F4, the bold part in Terra)
  - Uses Aceternity **Text Generate Effect** — types out letter by letter on load (1.5s)
- Subtitle: "Stop managing your productivity. Just tell Jarvis what's on your mind — exams, deadlines, goals — and watch it transform chaos into an optimized schedule. No guilt. No pressure. Just progress." (60% opacity, 14px — Body size)
  - Fades up 0.3s after headline completes
- CTAs (stagger fade 0.5s after subtitle):
  - Primary: "Start for Free →" (Terra bg, Ink text, rounded 8px)
  - Secondary: "Watch Demo" (transparent, border 1px FAF8F4/20%, rounded 8px)
- Social proof (fade 0.7s): "Built for students, by a student." + university logo badges or "Featured in [X]" if applicable. No fabricated user counts.

**Right column:**
- **Tier 1 fallback (ship first):** Animated CSS/SVG hero — Aurora gradient orb with an animated SVG brain outline (stroke-draw animation via GSAP). Floating particles via CSS keyframes. Looks premium, zero external dependency, loads instantly.
- **Tier 3 upgrade:** Replace with **Spline 3D scene** (floating neural-network brain, see Section 10.1). Responds to mouse movement, warm particles. Only after core app is working.
- **Loading state:** While either version loads, show static Terra gradient circle with subtle pulse.

**Background:**
- Aceternity **Aurora Background** — slowly shifting warm gradients:
  - `radial-gradient` at 25% 50% → `rgba(212,119,90,0.12)` (Terra glow)
  - `radial-gradient` at 75% 30% → `rgba(107,127,181,0.08)` (Dusk glow)
  - `radial-gradient` at 50% 80% → `rgba(74,123,107,0.06)` (Sage glow)
- 15s CSS animation loop, subtle drift

**Bottom:** Scroll indicator (animated chevron, pulses)

### 3.3 Section 2 — Pipeline Story (GSAP Pinned, ~300vh)

**Concept:** A floating macOS-style window against ambient dark background. As the user scrolls, the window tells the brain-dump → schedule story.

**The Window:**
- macOS chrome (3 dots, title bar "Jarvis — Brain Dump")
- Background: `#252320`, border: `1px solid #3A3632`, border-radius 12px
- Floating with subtle glow: `radial-gradient` behind it
- Centered, max-width 720px

**Scroll Timeline (GSAP ScrollTrigger, pin: true):**

| Scroll % | What Animates |
|----------|--------------|
| 0-5% | Window fades in from depth blur (scale 0.95 → 1, blur 8px → 0) |
| 5-25% | Brain dump text types character by character in the input area. Blinking cursor. Stress keywords highlight in Terra. |
| 25-30% | Divider line draws across. "Jarvis is thinking..." appears with glowing Dusk dot. |
| 30-45% | Intent tags fly in one by one from left with spring physics: "📅 PLAN_DAY detected", "📝 2 goals extracted", "⚠️ Stress signal → priority boost", "🏐 Hard blocks: MWF 4-6pm" |
| 45-55% | Flow pipeline: Parse → Chunk → OR-Tools → Schedule. Each step lights up L→R with a particle trail connecting them. |
| 55-85% | Schedule blocks slide up one by one with staggered spring animations. Time labels appear. Duration pills pop in. Color-coded by subject (Dusk = math, Sage = essay, Terra = physics). |
| 85-95% | Summary bar fades in: "✨ 6 micro-tasks · 2h 30m · Volleyball blocks respected". "Accept Plan" button glows with pulse. |
| 95-100% | Very subtle confetti/particles at edges. Section unpins. |

**Simpler fallback (if full GSAP timeline not ready by pitch):**
- Same floating window, but 3 static steps with fade-in on scroll (IntersectionObserver)
- Step 1: brain dump text visible. Step 2: intent tags visible. Step 3: schedule visible.
- Still looks great, just not scroll-driven. Can upgrade to full GSAP post-pitch.

**Header (above window):**
- "HOW IT WORKS" (Terra, uppercase, letter-spacing 3px)
- "Watch chaos become clarity" (FAF8F4, 28px, 700 weight)

### 3.4 Section 3 — Feature Bento Grid

**Layout:** 3-column bento grid (CSS grid, asymmetric)

| Card | Grid Span | Color | Content |
|------|----------|-------|---------|
| AI Smart Schedule | 2 cols | Dusk | OR-Tools constraint solver, 25-min micro-tasks, energy-aware |
| Anti-Guilt Engine | 1 col | Terra | "Missed a task? Jarvis recalibrates, never shames." |
| Document Intelligence | 1 col | Sage | PDF/notes ingestion → auto-linked to tasks |
| Smart Workspace | 2 cols | Ink/Subtle | RAG-powered study materials, YouTube, quizzes, spaced repetition |
| Behavioral Habits | 1 col | Gold | "I can't study past 10pm" → Jarvis respects it |
| 9-Layer Architecture | 1 col | Dusk | "Real engineering, not a GPT wrapper" → links to Spline viz |

**Animations:**
- Each card fades up with 0.1s stagger on scroll-enter (IntersectionObserver or GSAP)
- Aceternity **Moving Border** effect on hover (animated gradient border)
- Inner content has subtle parallax on mouse move
- Inner demo elements animate on card hover (schedule bars fill, particles move)

### 3.5 Section 4 — Philosophy Statement (~60vh)

**Full-width centered text:**

> "Every other productivity app makes you feel guilty for falling behind.
>
> **Jarvis makes falling behind impossible.**"

- Aceternity **Spotlight** effect: radial gradient follows cursor
- Text reveals word-by-word on scroll (GSAP SplitText or manual span wrapping)
- Below: "Missed a task? Jarvis recalibrates your schedule instantly. No red warnings. No shame metrics. Just a new plan that works with where you are *right now*."
- 13px, 40% opacity, fades in after main quote

### 3.6 Section 5 — Interactive Demo

**Embedded live brain dump input** (runs in demo mode against the real API):

- Dark card with rounded corners, centered (max-width 500px)
- Large text input: "Tell Jarvis what's on your mind..."
- Below: 3 clickable prompt pills:
  - "I have 3 exams next week" (Terra border)
  - "Essay due Thursday, haven't started" (Dusk border)
  - "Need to study 5 chapters by Friday" (Sage border)
- User types or clicks a pill → Jarvis streams a schedule response in real-time
- Uses the demo mode API (hardcoded responses for reliability during VC pitch)
- The generated schedule renders as a mini version of the app's schedule blocks

### 3.7 Section 6 — Technical Credibility

- "ENGINEERED, NOT HACKED TOGETHER" (Terra, uppercase)
- Aceternity **Infinite Moving Cards** — horizontally scrolling tech badges:
  - "🧠 9-Layer AI Stack" | "⚡ OR-Tools Constraint Solver" | "🔒 Local-First AI" | "📊 SM-2 Spaced Repetition" | "🎯 PEARL Behavioral Insights" | "📄 IBM Docling Pipeline" | "🏗️ FastAPI + Pydantic" | "🍎 Apple Silicon Optimized"
- "Explore the live architecture →" link (goes to Spline 3D architecture page)

### 3.8 Section 7 — Pricing + Final CTA

**Two pricing cards side by side:**

| | Free | Student Pro |
|-|------|------------|
| Price | $0 | $9.99/mo ($89/yr) |
| Features | Basic AI scheduling, 3 documents, limited brain dumps | Unlimited everything, advanced AI + RAG, spaced repetition, priority support |
| CTA | "Get Started" (outline button) | "Start Free Trial" (Terra solid button) |
| Badge | — | "POPULAR" (Terra pill, positioned top-right) |

- Below: "No credit card required · Cancel anytime · 14-day free trial"
- Background gradient: `#1A1814` → `#0F0D0A` (fade to deepest dark)

### 3.9 Footer

- Minimal: Logo | Links (Features, Pricing, Privacy, Terms) | Social links
- "Built with 🧠 by Madhav" or similar founder note
- Background: `#0F0D0A`

---

## 4. Onboarding Flow

**Trigger:** First-time user only. Stored in user profile / localStorage flag `jarvis_onboarded`.
**Demo override:** `?onboarding=true` URL param forces it (for VC demos).

### Flow:

1. **Cinematic Intro (10 seconds):**
   - Dark background fades in
   - Jarvis "J" logo draws itself (SVG stroke animation, GSAP, 1.5s)
   - Warm glow expands from the J
   - Text fades in: "Hey, [Name]." (if available from auth, else "Hey there.")
   - Pause 1s

2. **The Question:**
   - Text transitions to: **"What's stressing you out right now?"**
   - Large, inviting textarea fades in below (auto-focused)
   - Placeholder: "Exams, deadlines, that project you've been avoiding... just let it out."
   - Below textarea: example pills (same as landing page demo section)
   - No "step 1 of 3" — this feels like a conversation, not a form

3. **The Transformation:**
   - User types and hits Enter (or clicks "Let Jarvis handle it")
   - **Theme transition:** The dark onboarding background smoothly crossfades (600ms) to the user's system-preferred theme (light or dark). Uses CSS `transition: background-color 0.6s ease` on the body.
   - The text area gracefully morphs/transitions into the Command Center layout
   - Brain dump slides to the AI chat panel (right side)
   - Schedule blocks animate into the main area as Jarvis processes
   - Stats strip populates (1/1 brain dump, 0 tasks done, Day 1)
   - PEARL insight appears: "Welcome! I've set up your first day. You can always adjust by dragging tasks or telling me."

4. **Post-onboarding:**
   - User is now in the full Command Center
   - `jarvis_onboarded = true` persisted
   - Subsequent visits go straight to Command Center with daily greeting

---

## 5. App Interior — Command Center

### 5.1 Layout Structure

```
┌─────────────────────────────────────────────────┐
│ [Nav Rail 56px] [Main Content flex-1] [AI Panel 280px] │
└─────────────────────────────────────────────────┘
```

**Nav Rail (56px, left, always visible on desktop):**
- Top: Jarvis "J" logo (36x36, Terra bg, rounded 10px)
- Nav items (36x36 each, rounded 8px, icon only):
  - 🏠 Dashboard (default active)
  - 💬 Chat
  - 📅 Schedule
  - 📚 Workspace
  - 📄 Documents
  - 🎯 Habits
  - 🧬 Architecture
  - 📊 Analytics
- Bottom: ⌘K command palette trigger + user avatar (32x32, Terra bg, initials)
- Active state: `bg rgba(250,248,244,0.12)` (light on dark rail)
- Hover: `bg rgba(250,248,244,0.08)` + tooltip showing page name
- Nav rail background: `Ink #2C2924`

**Main Content (flex-1):**
- Padding: 24px 28px
- Background: `--surface-canvas`
- Content depends on active page (see Section 6)

**AI Chat Panel (280px, right, collapsible):**
- Background: `--surface-subtle`
- Border-left: `1px solid --border-default`
- Toggle: ◀ button or `Cmd+J` keyboard shortcut
- Collapsed state: 4px Terra-colored edge strip + floating "J" icon button
- Expanded: full chat interface with PEARL insight banner at top

### 5.2 Dashboard (Home) Content

**Header:**
- "Good morning/afternoon/evening, [Name]" (22px, 700 weight)
- Subtitle: "[Day], [Date] · [X] tasks today · [Y]h [Z]m estimated" (13px, secondary color)
- Right side: Today | Week | Month toggle (pill buttons)

**Stats Strip (3 cards, horizontal):**
| Card | Icon | Value | Label | Color |
|------|------|-------|-------|-------|
| Tasks | 📋 | "2 / 5" | "Tasks completed" | Dusk + circular progress ring |
| Focus | ⏱️ | "1h 45m" | "Focus time today" | Sage |
| Streak | 🔥 | "7 days" | "Current streak" | Gold |

**Schedule Timeline (main area):**
- Vertical timeline with time labels on left (52px wide)
- "NOW" indicator: Terra colored line with dot, positioned by current time
- Task blocks:
  - **Completed:** 50% opacity, Sage left-border, strikethrough text, green checkmark circle. Subtitle: "25 min · Completed at [time]" (e.g., "Completed at 9:23 AM").
  - **Active (in progress):** Dusk left-border, shadow-md, "IN PROGRESS" Dusk pill badge, mini progress bar (Dusk fill), "Open Workspace" Dusk button. Subtitle: "25 min · [X] min remaining" (calculated from start time + duration vs. current time, updates every minute).
  - **Upcoming:** colored left-border (by subject), full opacity, duration pill on right. Subtitle: "25 min · [contextual deadline hint]" (e.g., "Essay due Thursday", "Exam Friday").
  - **Deadline warning:** Gold left-border if due within 24h
- Block height: ~56px (padding 12px 16px)
- Block border-radius: 0 10px 10px 0 (flat left for the colored border)
- "View full calendar →" link (Terra) at section header

---

## 6. All 8 Pages

### 6.1 Dashboard
See Section 5.2 above.

### 6.2 Chat (Full-Width Brain Dump)

When navigated to directly, the AI chat panel expands to fill the main content area (full width minus nav rail).

**Layout:**
- Chat history scrolls vertically
- User messages: right-aligned, Terra bg, light text, rounded 14px 14px 4px 14px
- Jarvis messages: left-aligned, `--surface-muted` bg, primary text, rounded 14px 14px 14px 4px
  - Can contain: markdown, schedule previews, file cards, PEARL insights
- **Thinking process:** Collapsible section within Jarvis messages
  - Header: "🧠 Thinking..." with animated dots (when streaming) or "🧠 Thought for X seconds" (when complete)
  - Content: step-by-step reasoning in muted text, slightly indented
  - Default: collapsed (click to expand)
  - Shows: intent detection, constraint extraction, scheduling decisions
- **Pipeline trace (post-completion):** Collapsible section below Jarvis messages showing completed pipeline steps with checkmarks, model names, and per-step timing (e.g., "3 pipeline steps, 4.2s total"). Distinct from the live streaming indicator.
- **Generation metrics bar:** After each response, small muted bar showing: model name, tokens/sec, total tokens, total time, TTFT. Uses `response.generation_metrics`. Subtle (10px, secondary color) — technical credibility for demo.
- **Clarification quick-replies:** When `response.clarification_options` is present, render a row of pill buttons below the Jarvis message. Each pill is clickable and sends that option as the user's next message. Terra border, 12px, rounded-full. Disappear after one is clicked.
- **Replan banner:** When `response.suggested_action === "replan"`, show a Gold notification bar above the chat input: "Your schedule may need updating. [Replan Schedule]" button. On click, triggers `triggerReplan` which re-sends the last goal. Shows spinner during replanning, then the new schedule appears.
- **Model mode selector:** 3-button toggle in chat header: Auto (4B→27B pipeline) | 4B SLM | 27B Direct. Each has a tooltip describing the routing. Maps to `model_mode` field in the API request. Live indicator during streaming shows which model is active.

**Input area (bottom, sticky):**
- Large textarea with auto-resize
- Left: 📎 file upload button (drag-and-drop zone activates on drag-over of entire page)
- Right: ↑ send button (Terra bg when text present, muted when empty)
- Above textarea: file attachment indicators if files are queued (type icon + filename + X to remove)
- Placeholder: "Tell Jarvis what's on your mind..." (full-width chat page) or "Ask Jarvis anything..." (sidebar AI panel)

**File upload:**
- Drag-and-drop zone (entire page, overlay with dashed Terra border)
- Supports: PDF, images, .txt, .md, .docx
- Shows upload progress → classification toast (via DocumentClassificationToast)
- After upload: file card appears in chat with type, name, and status

**Model display:**
- Small badge in Jarvis message header showing which model responded
- E.g., "Gemini 2.5 Flash" or "Qwen-27B (Local)" — subtle, 10px, secondary color

**Draft review flow (two-stage confirmation):**

When `confirm_before_schedule: true` is set (or by default), Jarvis uses a two-stage confirmation before persisting tasks:

- **Stage 1 — Task Preview:** When `response.awaiting_task_confirmation === true`, render a `TaskPreview` component showing decomposed tasks as editable cards. Each card allows: edit title (inline), adjust duration (slider 1-25 min), adjust difficulty (slider 0-1), remove task (X button). User can also "Add Task" (inline text input) or "Regenerate All" (re-decomposes from scratch). Bottom: "Accept & Schedule" (Terra button) or "Suggest Changes" (text input for modification prompt).
- **Stage 2 — Schedule Preview:** After accepting tasks, Jarvis runs OR-Tools and returns a draft schedule (`schedule_status: "draft"`, `draft_id` present). Render the schedule timeline with a "DRAFT" Dusk pill badge. Each task block shows edit/remove inline controls. Bottom bar: "Accept Plan" (Terra, triggers `POST /drafts/{draftId}/accept`) | "Suggest Changes" (text input for modification). Accept animation: idle → accepting (spinner) → accepted (checkmark scale-bounce).
- **Draft persistence:** Active drafts saved to localStorage via `saveDraftSchedule`/`loadDraftSchedule`. If the user closes and returns, the draft is restored with a "You have an unfinished plan. [Continue] [Discard]" prompt.

**Memory panel (within AI chat panel):**
- Accessible via a "🧠 Memories" tab/toggle at the top of the AI chat panel (alongside the default chat view)
- Shows extracted memories grouped by type: facts, preferences, behavioral patterns, goals, constraints, temporal events, feedback
- Each memory card: type badge (colored pill), memory text, confidence indicator (high/medium/low), age ("2 days ago")
- User can delete memories (X button) — calls backend to remove
- Strength/stability values are hidden from UI (internal to SM-2 decay) — only confidence level shown as a simple label
- Memory extraction happens asynchronously after each chat turn; new memories appear with a subtle slide-in animation

**Chat message persistence:**
- Messages persisted to localStorage (key: `jarvis-chat-messages-{conversationId}`), capped at 50 messages
- Heavy fields (`thinking_process` full text) stripped before storage to save space
- Conversation ID stored in localStorage for session continuity across page refreshes

**Session sidebar (left edge within chat page):**
- Collapsible list of past conversations
- Each: title (auto-generated from first brain dump) + date
- Click to load previous session
- "New Chat" button at top

### 6.3 Schedule (FullCalendar)

**FullCalendar integration** with Jarvis theming:

- **Views:** Day (default) | Week | Month — toggle in header
- **Color coding:** Each subject/goal gets a consistent color from the palette
- **Task blocks as events:** Show title + duration + completion status
- **Drag-and-drop:** Grab events to reschedule. On drop, Jarvis re-optimizes remaining tasks via API call.
- **Click event:** Slide-over panel showing: task details (title, duration, difficulty, goal, dependencies), Implementation Intention If-Then plan (if present), workspace link, notes, constraint badges
- **Per-task actions (inline or slide-over):**
  - **Mark Done:** Checkbox → quality rating popup (1-5 stars, maps to SM-2 quality 0-5). Calls `POST /tasks/{taskId}/complete` with quality. Triggers replan if needed (`replan_triggered` in response).
  - **Skip:** "Skip" button → calls `POST /tasks/{taskId}/skip`. Task grays out, Jarvis may replan.
  - **Edit inline:** Click task title → editable text field. Duration slider (1-25 min). Calls `PATCH /tasks/{taskId}`.
  - **Remove:** X button with confirmation. Calls `DELETE /tasks/{taskId}`.
  - **Add subtask:** "+" button → inline text input. Subtasks render as indented items below parent with their own remove button.
  - **Constraint badge:** If `constraint_applied` field present on task, show a small Dusk badge (e.g., "🏐 Volleyball respected").
- **Task decomposition walkthrough (TaskAssignmentViz):** A 5-step animated educational component showing how scheduling works: (1) Goal → (2) Decompose into micro-tasks → (3) Show time blocks (sleep/soft/available) → (4) CP-SAT assignment → (5) Calendar result. Step indicators with prev/next navigation. Animated block diagrams. Triggered from a "How does this work?" link. Great for VC demo.
- **"Add brain dump" FAB:** Floating Terra button, opens quick brain dump input overlay
- **Breaks:** Shown as subtle dashed-border blocks
- **Hard blocks:** Shown as solid opaque blocks (volleyball, classes, etc.)
- **FullCalendar theme:** Import `@fullcalendar/core/main.css` base styles first, then override with `styles/calendar.css` using Jarvis CSS variables (replace FullCalendar's default blues with our palette)

### 6.4 Workspace (Per-Task Study Materials)

**Accessed via:** Clicking "Open Workspace" on a task, or navigating from sidebar

**Layout:**
- Left: Task details (title, description, deadline, progress, status)
  - **Implementation Intention (WOOP):** If the task has `implementation_intention`, show an expandable "If-Then Plan" section:
    - "**If** [obstacle_trigger]" (e.g., "If I feel overwhelmed by the proof")
    - "**Then** [behavioral_response]" (e.g., "Then open the textbook to example 4.3 and work through it step by step")
    - Styled with a Dusk left-border, muted background, italic text. This is a key psychological differentiator — highlight it during VC demos.
- Right: RAG-powered study materials panel
  - YouTube video links (relevant to task topic)
  - Practice quiz suggestions
  - Extracted notes from uploaded documents
  - Spaced repetition status (SM-2 interval, next review date)
  - **Task-scoped mini-chat (WorkspaceChatPanel):** A dedicated chat panel within the workspace that passes task context (title, objective, surfaced assets) to the API for RAG-grounded answers. Has its own message history (separate from main chat), loading states, and Terra-tinted input. API call prepends task context to the user's prompt for scoped responses.

**Material cards:**
- Each linked resource is a card with: type icon, title, source, relevance score
- Clickable → opens in new tab or inline viewer (for PDFs)

### 6.5 Documents

**Layout:**
- Top: Large drop zone ("Drag PDFs, notes, or slides here" + click to browse)
- Below: List/grid of uploaded documents
  - Each: file icon, filename, upload date, classification status, linked tasks count
  - Classification states: "Processing..." (animated) | "Classified: [type]" | "Error"
  - Click: expand to see extracted content, linked tasks, RAG chunks

**Classification toast:**
- When a document finishes processing, a toast notification slides in from bottom-right
- Shows: document name, classification type, number of tasks auto-linked
- Auto-dismisses in 5 seconds, includes "View" action

### 6.6 Habits (Behavioral Constraints)

**Layout:**
- Card-based list of habits/constraints
- Each card: habit text, type (Hard Block / Soft Preference / Behavioral Pattern), schedule impact
- "Add Habit" input at top: natural language ("I can't study past 10pm", "I need breaks every 45 min")
- Jarvis translates natural language → constraint parameters → shows confirmation
- **PEARL-detected patterns section** (3 pattern types from the backend):
  - **Skip time window** (e.g., "You tend to skip tasks between 8-9 PM") — display as a time range badge
  - **Duration preference** (e.g., "You complete 15-min tasks more reliably than 25-min tasks") — display as a comparison indicator
  - **Deadline buffer** (e.g., "You typically need 2 extra days before deadlines") — display as a buffer indicator
  - Each pattern shows: observation count (e.g., "Based on 5 observations"), confidence rate, and the constraint it became in OR-Tools
  - Detection thresholds: 3+ observations, 70%+ rate

**Visual:**
- Hard blocks: Gold border (non-negotiable)
- Soft preferences: Dusk border (Jarvis tries to respect)
- Detected patterns: Terra border with "PEARL" badge

### 6.7 Architecture (Spline 3D)

**The VC demo killer page.**

**Layout:**
- Full-width Spline 3D embed of the 9-layer stack (see Section 10.2)
- Interactive: click/hover on layers to see descriptions
- Side panel or overlay: when a layer is selected, shows:
  - Layer name (L0-L9)
  - Technology used
  - What it does
  - Data flow in/out
  - Status (Implemented / Planned / Stub)

**Fallback (and Tier 1/2 default):** Render the Mermaid diagram viewer from jarvis-demo. Features to port: zoom controls (buttons + scroll-to-zoom), drag-to-pan, fullscreen mode (portal-based overlay), theme-aware rendering (warm palette), "Copy code & open Mermaid Live" button, error fallback for malformed diagrams. This is the default architecture visualization until Spline scenes are built (Tier 3).

### 6.8 Analytics / Progress

**Layout:** Dashboard-style cards and charts.

**Cards:**
- Weekly summary: tasks completed, focus hours, streak, best day
- Subject mastery: per-subject progress bar (Dusk for math, Sage for essay, etc.)
- Study pattern heatmap: 7-day × 24-hour grid showing when user actually studied (inspired by GitHub contribution graph)
- Spaced repetition stats: items due for review, mastery curve

**Charts:** Use **Recharts** (React-native, composable) with Jarvis palette colors applied via CSS variables.

---

## 7. Micro-Interactions & Animations

### 7.1 Task Completion
- Click checkbox → circle fills with Sage green (scale 0→1, 200ms spring)
- Checkmark draws itself inside (SVG stroke, 150ms)
- Task text: strikethrough slides across L→R (200ms)
- Progress ring in stats strip animates up
- If last task of the day: very subtle confetti particles from viewport edges (800ms, then fade)

### 7.2 Drag to Reschedule
- Grab task block → ghost element at 90% opacity follows cursor
- Original position shows dashed outline placeholder
- Time slots highlight with Dusk tint on hover
- Drop: ghost snaps to slot with spring physics (damping: 0.8, stiffness: 300)
- Toast: "Rescheduled. Jarvis is re-optimizing..." (auto-dismiss 3s)

### 7.3 Chat Panel Toggle
- `Cmd+J` or click ◀ button
- Panel slides out: 300ms ease-out, main content expands simultaneously (layout animation)
- Collapsed: 4px Terra edge + floating "J" circle button (40px)
- Expand: click "J" or `Cmd+J` again

### 7.4 Command Palette (Cmd+K)
- Centered overlay, max-width 520px, shadow-lg
- Blurred backdrop
- Search input at top, fuzzy-matched results below
- Actions: navigate pages, search tasks, quick brain dump, toggle dark mode, keyboard shortcuts
- Each result: icon + title + keyboard shortcut (if applicable)
- Navigate with arrow keys, Enter to select, Escape to close

### 7.5 Streaks & Rewards
- Streak counter: number + 🔥 emoji
- Milestone streaks (7, 14, 30 days): Gold glow pulse on the streak card
- All tasks done: Jarvis sends a celebratory message in the AI panel + subtle confetti
- No punishment for broken streaks — anti-guilt: "You took a break. Here's a fresh start."

### 7.6 Loading & Streaming States
- Jarvis "thinking" indicator: 3 dots with wave animation (Terra colored)
- Schedule generation: skeleton blocks pulse in the timeline area
- Phase updates (SSE): small status text below thinking indicator ("Parsing brain dump...", "Running constraint solver...", "Generating schedule...")
- File upload: progress bar inside the file card (Terra fill)

### 7.7 Page Transitions
- Route changes: main content area does a subtle fade + slide-up (150ms, Motion `AnimatePresence`)
- No full-page reloads — nav rail and AI panel stay stable
- Active nav item: background animates with `layoutId` (Motion shared layout)

---

## 8. Responsive Design

### 8.1 Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|---------------|
| **Desktop XL** | ≥1440px | Full layout as designed, max-width container |
| **Desktop** | 1280-1439px | Full layout, slightly tighter padding |
| **Tablet Landscape** | 1024-1279px | Nav rail icons-only (48px), AI panel auto-collapsed |
| **Tablet Portrait** | 768-1023px | Nav rail → top hamburger, AI panel → slide-over, stats 2×2 grid |
| **Mobile** | < 768px | Bottom tab bar, AI → bottom sheet, single-column |

### 8.2 Mobile Layout (< 768px)

**Bottom tab bar (56px height):**
- 5 items: 🏠 Home | 💬 Chat | 📅 Schedule | 📚 Workspace | •• More
- "More" opens a bottom sheet with: Documents, Habits, Architecture, Analytics
  - Settings is a modal/sheet (not a page) accessible from user avatar — contains: theme toggle, demo/live mode, keyboard shortcuts reference, logout
- Active item: Terra-colored icon + label
- Inactive: muted icon, no label

**AI Chat (mobile):**
- Floating Action Button (FAB): 56px, Terra bg, "J" icon, bottom-right (above tab bar)
- Tap FAB → bottom sheet slides up (85vh height)
- Full chat interface inside the bottom sheet
- Swipe down to dismiss

**Schedule (mobile):**
- Day view default (not week)
- Vertical timeline, full width
- Swipe left/right to navigate days
- Task blocks: full-width cards (no time column, time shown inline)

**Stats (mobile):**
- Horizontal scroll strip (snap scrolling)
- Each stat card: minimum 140px wide

**Dashboard (mobile):**
- Single column stack: Stats strip → Schedule timeline
- No sidebar, no split views
- "Brain dump" CTA at top (prominent)

### 8.3 Tablet Layout (768-1279px)

- Nav rail → hamburger menu (top-left) that opens a full sidebar overlay
- Main content takes full width
- AI panel → slide-over panel from right edge (triggered by "J" FAB or Cmd+J)
- Stats strip: 2×2 grid instead of horizontal
- FullCalendar: week view shows 5 days instead of 7

### 8.4 Touch Interactions

- **Swipe left on task:** Quick actions (complete, reschedule, skip)
- **Swipe right on task:** Open workspace
- **Long-press task:** Enter drag-to-reschedule mode
- **Pull-to-refresh:** Sync schedule with backend
- **Swipe between days** on calendar (mobile)
- **Pinch-to-zoom** on week/month calendar views

---

## 9. Features Ported from jarvis-demo

These features exist in the current `jarvis-demo/` prototype and MUST be carried over to `jarvis-frontend/`:

### 9.1 Core Chat Features
- **Streaming responses** with SSE (Server-Sent Events) from FastAPI
- **Thinking process display** — collapsible "thinking" section showing Jarvis's reasoning steps, intent detection, constraint extraction
- **Model indicator** — shows which LLM model handled the response (Gemini 2.5 Flash, Qwen-27B local, etc.)
- **Chat session history** — sidebar with past conversations, load/switch sessions
- **File upload** — drag-and-drop PDFs/images, attachment indicators with type icons
- **Mode toggle** — Demo (mock data) vs Live (real API) mode, persisted in context

### 9.2 Schedule Features
- **FullCalendar integration** — day/week/month views with task events
- **Task decomposition visualization** — animated flow showing how goals break into micro-tasks
- **Interactive task preview cards** — click for details, status, workspace link

### 9.3 Pipeline Visualization
- **Response Layers** — shows all pipeline phases (parse, chunk, solve, synthesize)
- **Phase-by-phase streaming** — SSE sends phase updates as they complete
- **Document classification toast** — notification when uploaded docs are processed

### 9.4 AI/ML Features
- **PEARL Insight Banner** — behavioral pattern insights from the PEARL system
- **Memory Panel** — shows extracted memories from conversations
- **Prompt Selector** — preset prompt templates for common brain dump types
- **Chat Mode Selector** — Demo vs Live mode with visual indicator

### 9.5 Reference Files to Port (adapt, don't copy)

| Source (jarvis-demo) | Purpose | Port Strategy |
|---------------------|---------|--------------|
| `lib/useJarvisChat.ts` | Chat hook (700+ lines) — streaming, SSE, message handling | Rewrite with new types, keep core SSE logic |
| `lib/api.ts` | API client + hybrid routing (450+ lines) | Simplify, keep demo/live routing |
| `lib/jarvis-types.ts` | TypeScript interfaces (160+ lines) | Review and carry over relevant types |
| `lib/demoData.ts` | Hardcoded demo responses | Update with new design's data format |
| `lib/scheduleStore.ts` | localStorage persistence | Port as-is, lightweight |
| `lib/modeContext.tsx` | Demo/Live mode context | Port as-is |
| `lib/themeContext.tsx` | Dark/Light theme context | Extend with: (a) `prefers-color-scheme` detection as default when no localStorage value exists, (b) keep the inline `<script>` in `layout.tsx` that reads theme before React hydration (prevents flash of wrong theme), (c) store in localStorage key `jarvis-theme` |
| `components/ThinkingProcess.tsx` | LLM reasoning display | Redesign UI, keep logic |
| `components/ResponseLayers.tsx` | Pipeline phase display | Redesign to match new aesthetic |
| `components/DocumentClassificationToast.tsx` | Doc processing notification | Redesign, keep trigger logic |
| `components/PearlInsightBanner.tsx` | PEARL behavioral insights | Redesign for AI panel context |
| `components/MemoryPanel.tsx` | Extracted memories display | Redesign |
| `components/PromptSelector.tsx` | Preset prompts | Redesign as pills/chips |
| `components/ChatModeSelector.tsx` | Demo/Live toggle | Redesign into header or settings |

---

## 10. Spline 3D Scene Guides

### 10.1 Scene 1: Hero Brain (Landing Page)

**What to build in Spline:**

A floating **neural network brain** — abstract, geometric, warm.

**Step-by-step guide:**

1. **Open Spline** (spline.design, free account)
2. **Create a new scene** → set background to transparent (for embed)
3. **Build the brain shape:**
   - Start with an **icosphere** (Spline primitive). Set subdivisions to 3-4 for enough vertices.
   - Scale it to roughly 300x300x300
   - Apply a **glass/translucent material**: color `#D4775A` (Terra) at 30% opacity, roughness 0.2, metalness 0.1
   - Or use a **gradient material**: Terra to Dusk (`#D4775A` → `#6B7FB5`)
4. **Add neural connections:**
   - Create small **spheres** (nodes, 8-12px) positioned on the icosphere surface
   - Connect them with **cylinders** (very thin, 1-2px) to form network edges
   - Color nodes: mix of Terra, Dusk, and Sage (randomly)
   - Material: subtle emissive glow (bloom effect)
5. **Orbiting particles:**
   - Add 20-30 tiny spheres (3-4px each) orbiting the main shape
   - Use Spline's **orbit** interaction or animation timeline
   - Color: Terra with emissive glow
   - Speed: slow, 8-12 seconds per orbit
6. **Interactions:**
   - **Mouse hover:** Tilt the brain slightly toward cursor (Spline's "Look At" interaction)
   - **Scroll:** Subtle rotation (connect to scroll via react-spline events)
7. **Lighting:**
   - One warm directional light (Terra-tinted, 45° from top-left)
   - One cool fill light (Dusk-tinted, opposite side, 30% intensity)
   - Ambient: very low, warm
8. **Export:**
   - Publish scene → get public URL
   - Embed in React: `<Spline scene="https://prod.spline.design/YOUR_ID/scene.splinecode" />`
9. **Performance:**
   - Keep polygon count under 50k for smooth loading
   - Enable lazy loading in the React component
   - Add a fallback: static Terra gradient circle while Spline loads

### 10.2 Scene 2: 9-Layer Architecture (Architecture Page)

**What to build in Spline:**

A **vertical stack of 10 floating layers** (L0-L9), each a rounded slab, with animated data flow between them.

**Step-by-step guide:**

1. **Create 10 rounded rectangles** (Spline box primitive, border-radius ~20):
   - Each: 400x60x200 (width x height x depth)
   - Stack vertically with 30px gaps
   - Slight perspective tilt (rotate X ~15° for depth)

2. **Color each layer** (note: light variants below are Spline-scene-only, derived by lightening base semantic colors. Not part of the CSS variable system):

   | Layer | Name | Color | Hex |
   |-------|------|-------|-----|
   | L9 | LLM Router | Dusk | `#6B7FB5` |
   | L8 | PII Filter | Gold | `#E09D5C` |
   | L7 | Strategy Hub | Terra | `#D4775A` |
   | L6 | Doc Pipeline | Sage | `#4A7B6B` |
   | L5 | Embeddings | Dusk (light) | `#8B9FCC` |
   | L4 | Vector DB | Sage (light) | `#6A9B8B` |
   | L3 | FastAPI | Ink | `#2C2924` |
   | L2 | Local LLMs | Terra (light) | `#E89B80` |
   | L1 | Evaluation | Gold (light) | `#EABB82` |
   | L0 | Apple Silicon | Gradient | Terra→Dusk |

3. **Add labels:** Use Spline's 3D text on each slab face: layer name + tech name

4. **Data flow animation:**
   - Small glowing spheres (4-5px) that travel vertically from L0 → L9
   - Path: follow a slight sine wave (not straight) for visual interest
   - Speed: 3-4 seconds per full traversal
   - 3-4 particles active at once, staggered
   - Color: transitions from Terra (bottom) to Sage (top) as data moves up

5. **Interactions:**
   - **Hover on a layer:** Layer glows, pushes slightly forward (Z-axis), connected particles speed up
   - **Click on a layer:** Zooms in, other layers blur/fade, detail panel appears (handled in React)
   - **Scroll/drag:** Rotate the entire stack slightly for 3D exploration

6. **Lighting:**
   - Key light: warm (Terra), from top-left
   - Rim light: cool (Dusk), from behind — creates edge glow
   - Ambient: subtle warm fill

7. **Performance:**
   - Simple geometry (boxes + spheres) = low poly count
   - Should run smoothly even on integrated GPUs
   - Lazy load with Spline's built-in loading state

---

## 11. Logo & Animated Mark

### 11.1 Static Logo Design

**Concept:** A minimal geometric "J" letterform where the stroke is made of connected nodes — like a neural pathway / data flowing through a pipeline.

**Design in Figma (free):**
1. Create new file, 1024x1024 artboard
2. Draw a "J" using the pen tool — clean, geometric, slightly rounded terminals
3. Stroke width: 80-100px
4. Add 4-5 small circles (nodes, 20px) along the J path
5. Export as SVG (outline strokes, optimize)

**Variants needed:**
- **Favicon (32x32):** Simplified — just the J curve, no nodes
- **Nav rail mark (36x36):** J on Terra (#D4775A) rounded square background
- **Full lockup:** J mark + "Jarvis" wordmark (Inter Display, 700 weight)

### 11.2 Animated Logo (GSAP)

**Load animation (landing page, onboarding):**
1. SVG path is initially `stroke-dashoffset: 100%` (invisible)
2. GSAP `DrawSVG` or manual `stroke-dasharray`/`stroke-dashoffset` animation
3. Stroke draws itself over 1.5s (ease: "power2.inOut")
4. Node circles pop in with stagger (0.1s each, scale 0→1, spring bounce)
5. On completion: subtle glow pulse (box-shadow animation, 1 cycle)

**Implementation:**
```
// In React component with GSAP
useGSAP(() => {
  const tl = gsap.timeline()
  tl.fromTo('.j-path', { strokeDashoffset: pathLength }, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' })
  tl.fromTo('.j-nodes', { scale: 0 }, { scale: 1, stagger: 0.1, ease: 'back.out(2)' }, '-=0.5')
  tl.fromTo('.j-glow', { opacity: 0 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1 })
})
```

### 11.3 Tools Summary

| Task | Tool | Cost |
|------|------|------|
| Design static SVG | Figma | Free |
| Animate stroke draw | GSAP (already installed) | Free |
| Complex particles (if desired) | Rive (rive.app) | Free tier |
| 3D version for hero | Spline (alongside brain scene) | Free tier |

---

## 12. Implementation Priority Tiers

Given the VC pitch is April 1 (3 days), features are tiered by criticality.

### Tier 1 — Must Ship for VC Pitch (Day 1-2)
- [ ] Project setup (Next.js 14, Tailwind 3.4, CSS variables, fonts)
- [ ] Design system primitives (Button, Card, Input, Badge, Toast)
- [ ] Landing page: Hero (with CSS/SVG fallback, no Spline yet) + Nav bar
- [ ] Landing page: Feature Bento + Philosophy + Pricing + Footer
- [ ] App shell: Nav rail + main content area + collapsible AI chat panel
- [ ] Dashboard page: greeting, stats strip, schedule timeline
- [ ] Chat page: full-width chat with streaming, thinking process, model display
- [ ] Demo mode: hardcoded responses that show the perfect flow
- [ ] Dark/light theme with CSS variables (system preference detection)
- [ ] Desktop layout only (≥1280px)

### Tier 2 — Nice for Demo (Day 2-3)
- [ ] Onboarding flow (cinematic intro → "What's stressing you?")
- [ ] Schedule page (FullCalendar with Jarvis theming)
- [ ] Landing page: Pipeline Story (GSAP scroll — use simpler fallback if full timeline not ready)
- [ ] Command palette (Cmd+K)
- [ ] Landing page: Interactive demo section (live brain dump)
- [ ] Task completion animation (checkbox spring bounce)
- [ ] Architecture page (animated HTML/CSS layer diagram, no Spline)
- [ ] Landing page: GSAP full scroll timeline (upgrade from simple fallback)

### Tier 3 — Post-Pitch Polish (Week 2+)
- [ ] Spline 3D hero brain scene
- [ ] Spline 3D architecture scene
- [ ] Workspace page (RAG materials per task)
- [ ] Documents page (upload + classification)
- [ ] Habits page (behavioral constraints)
- [ ] Analytics page (Recharts, heatmap, mastery)
- [ ] Full responsive (tablet + mobile layouts)
- [ ] Touch interactions (swipe, long-press, gesture nav)
- [ ] Drag-to-reschedule on calendar
- [ ] Session sidebar (chat history)
- [ ] Logo animation (Figma → SVG → GSAP stroke draw)
- [ ] `prefers-reduced-motion` handling

---

## 13. Empty States

Every page needs a first-visit / no-data state. Reusable `<EmptyState />` component: centered icon + headline + subtitle + CTA button.

| Page | Icon | Headline | Subtitle | CTA |
|------|------|----------|----------|-----|
| **Dashboard** | 🧠 | "Your day starts here" | "Tell Jarvis what's on your plate and watch your schedule appear." | "Start a brain dump →" (opens AI panel) |
| **Chat** | 💬 | "What's on your mind?" | "Type anything — exams, deadlines, projects. Jarvis will figure out the rest." | Auto-focused textarea |
| **Schedule** | 📅 | "Nothing scheduled yet" | "Once you brain dump, your schedule will appear here. Drag tasks to reschedule." | "Plan my day →" (opens chat) |
| **Workspace** | 📚 | "Pick a task to study" | "Click 'Open Workspace' on any scheduled task to see study materials." | "Go to schedule →" |
| **Documents** | 📄 | "Drop your study materials" | "Upload PDFs, notes, or slides. Jarvis will extract content and link it to your tasks." | Drop zone is the CTA |
| **Habits** | 🎯 | "Teach Jarvis your patterns" | "Tell Jarvis things like 'I can't study past 10pm' or 'I need breaks every 45 min.'" | "Add a habit" input |
| **Architecture** | 🧬 | N/A | Always has content (static diagram) | N/A |
| **Analytics** | 📊 | "Complete a few tasks first" | "Your progress charts, streaks, and study patterns will appear after your first day." | "Start planning →" |

**Design:** Use the warm palette. Icon at 48px. Headline in H3 (18px, 600). Subtitle in Body (14px, secondary color). CTA is a Terra button or text link. Max-width 400px centered. Subtle fade-in animation (Motion).

---

## 14. Error States & Graceful Degradation

### 14.1 Connection Errors
- **API unreachable (backend not running):** Banner at top of app: "Can't connect to Jarvis. Check your connection." (Gold bg, Ink text). Auto-retry every 10s. In demo mode, this should never happen (all data is local).
- **SSE stream disconnected mid-response:** Jarvis message shows: "Connection lost. [Retry]" button. Partial content preserved. Clicking retry re-sends the same request.

### 14.2 Component Failures
- **Spline 3D fails to load:** Falls back to the CSS/SVG animation (hero) or animated Mermaid diagram (architecture). Wrapped in `<Suspense>` with fallback. Error boundary catches runtime failures.
- **FullCalendar fails:** Show simple HTML table-based weekly view as fallback.

### 14.3 User Action Errors
- **File upload fails:** Toast notification (bottom-right): "Upload failed: [reason]. [Try again]" (Gold border). File card shows error state with retry button.
- **Schedule generation fails (INFEASIBLE):** Jarvis AI panel shows warm message: "That's a lot to fit in! Want me to suggest what to prioritize, or extend the deadline?" — anti-guilt, never "error."
- **Empty brain dump submitted:** Input shakes subtly (CSS animation, 300ms). Placeholder text briefly highlights.

### 14.4 Demo Mode Safety
- In demo mode, **all API calls return hardcoded mock data** — no network requests. This ensures the VC demo never fails regardless of backend status.
- Demo mode indicator: small "DEMO" pill badge in the nav rail (Dusk bg), removable for clean recordings.

---

## 15. Accessibility

### 15.1 Semantic HTML
- `<nav>` for nav rail and landing page navigation
- `<main>` for main content area
- `<aside>` for AI chat panel
- `<header>` for page headers and landing nav
- `<section>` for landing page sections with `aria-label`
- Heading hierarchy: one `<h1>` per page, proper `<h2>`/`<h3>` nesting

### 15.2 Keyboard Navigation
- **Tab order:** Nav rail items → main content → AI panel (logical flow)
- **Nav rail:** Arrow keys to move between items, Enter to activate
- **Cmd+K:** Command palette (all actions keyboard-accessible)
- **Cmd+J:** Toggle AI chat panel
- **Escape:** Close modals, command palette, overlays
- **Focus ring:** 2px `--border-strong` outline with 2px offset on all interactive elements
- **Skip to main content:** Hidden link, visible on focus

### 15.3 Screen Readers
- `aria-label` on icon-only nav rail items (e.g., `aria-label="Dashboard"`)
- `aria-live="polite"` on AI chat panel for new messages
- `aria-expanded` on collapsible sections (thinking process, AI panel)
- `role="status"` on loading indicators
- Alt text on all meaningful images/icons

### 15.4 Motion & Reduced Motion
- All GSAP and Motion animations wrapped in `prefers-reduced-motion` check:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- In JS: `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → skip GSAP timelines, use instant transitions
- Landing page: scroll-driven sections still work but without pinning/animation (content is all visible statically)

### 15.5 Color Contrast
- All text meets WCAG AA (4.5:1 for body text, 3:1 for large text):
  - `#2C2924` on `#FAF8F4` → 12.8:1 ✅
  - `#9C9488` on `#FAF8F4` → 3.2:1 ⚠️ (muted text — acceptable for non-essential labels, use `#7A756E` for AA compliance where needed)
  - `#FAF8F4` on `#1C1A17` → 14.2:1 ✅
  - `#E09D5C` on `#FAF8F4` → 2.4:1 ⚠️ (Gold on light — use only for decorative/large text, not small body copy. Use `#B87D3E` for AA-compliant gold text.)
- Semantic colors on cards have sufficient contrast: Dusk/Sage/Terra text on white cards all pass.

---

## 16. SEO (Landing Page)

### 16.1 Meta Tags
```html
<title>Jarvis — Your Brain Dump Becomes Your Plan | AI Study Scheduler</title>
<meta name="description" content="Stop managing your productivity. Tell Jarvis what's stressing you and watch it create an optimized study schedule. AI-powered, anti-guilt, built for students." />
```

### 16.2 Open Graph
```html
<meta property="og:title" content="Jarvis — AI-Powered Study Scheduler" />
<meta property="og:description" content="Your brain dump becomes your plan. AI scheduling that adapts to you." />
<meta property="og:image" content="/og-image.png" /> <!-- 1200x630 branded card -->
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

### 16.3 SSR Content
- All landing page text content must be in the **initial HTML render** (Next.js SSR), not solely JS-animated into existence
- GSAP Text Generate Effect should animate text that's already in the DOM (opacity/transform), not inject it
- This ensures search engines index the full content even without JS execution

---

## 17. API Contract Map

All endpoints are under `http://localhost:8000/api/v1/`. Configure via env var:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1  # development default
```

### 17.1 Frontend Action → Backend Endpoint

| Frontend Action | Method | Endpoint | SSE? | Request Key Fields | Response Key Fields |
|----------------|--------|----------|------|-------------------|-------------------|
| Brain dump (chat) | POST | `/chat` | No | `user_prompt`, `user_id`, `conversation_id` | `intent`, `message`, `schedule`, `thinking_process`, `draft_id` |
| Brain dump (streaming) | POST | `/chat/stream` | **Yes** | Same as `/chat` | SSE events: `step`, `thinking`, `message`, `complete` |
| File upload + classify | POST | `/ingestion/process` | No | `file_base64`, `media_type`, `user_id` | `intent`, `classification_summary`, `knowledge_result` |
| Generate schedule | POST | `/schedule/generate-schedule` | No | `graph` (ExecutionGraph), `daily_context`, `horizon_minutes` | `status`, `schedule` (task_id→time map), `horizon_start` |
| Get task workspace | GET | `/tasks/{taskId}/workspace` | No | Query: `user_id`, `prompt` (optional) | `task_title`, `surfaced_assets[]` |
| Complete task | POST | `/tasks/{taskId}/complete` | No | `user_id`, `quality` (0-5) | `status`, `replan_triggered` |
| Update task | PATCH | `/tasks/{taskId}` | No | `user_id`, `title?`, `duration_minutes?`, `status?` | `status: "updated"` |
| Delete task | DELETE | `/tasks/{taskId}` | No | Query: `user_id` | `status: "deleted"` |
| Skip task | POST | `/tasks/{taskId}/skip` | No | `user_id` | `status`, `replan_triggered` |
| List tasks | GET | `/tasks` | No | Query: `user_id`, `status?` | `tasks[]` |
| List documents | GET | `/documents` | No | Query: `user_id` | `documents[]` |
| Delete document | DELETE | `/documents/{sourceId}` | No | Query: `user_id` | `status: "deleted"` |
| Complete habit (SM-2) | POST | `/habits/tracker/{trackerId}/complete` | No | `quality` (0-5), Query: `user_id` | `next_review_date`, `next_interval_days` |
| List due habits | GET | `/habits/tracker/due` | No | Query: `user_id` | `due_trackers[]` |
| Get draft | GET | `/drafts/{draftId}` | No | Query: `user_id` | `components` (habits, tasks, schedule, etc.) |
| Accept draft | POST | `/drafts/{draftId}/accept` | No | `user_id`, `components[]` | `components_accepted[]` |
| List sessions | GET | `/sessions` | No | Query: `user_id`, `limit?` | `sessions[]` |
| Get session messages | GET | `/sessions/{sessionId}` | No | Query: `user_id` | `session`, `messages[]` |

### 17.2 SSE Event Format (POST /chat/stream)

```
event: step
data: {"phase": "parsing", "message": "Analyzing your brain dump..."}

event: thinking
data: {"token": "The user has two goals: calculus midterm and history essay..."}

event: message
data: {"token": "I've broken this into "}

event: complete
data: {"intent": "PLAN_DAY", "message": "...", "schedule": {...}, "thinking_process": "...", "draft_id": "..."}
```

**Frontend handling:** Use `fetch()` with `response.body.getReader()` to consume SSE stream. Parse each `event:` + `data:` pair. Display `thinking` tokens in collapsible section, `message` tokens in main response, `complete` finalizes with full ChatResponse object.

### 17.3 Demo Mode
- When `mode === 'demo'`, **no network requests are made**
- All responses come from `lib/demoData.ts`
- Mock data mirrors the exact response shapes above

**4 demo scenarios (port from jarvis-demo, update for new design):**
1. **DEMO_RESPONSE_DIJKSTRA** — Concept learning: "Teach me Dijkstra's algorithm" → decomposition into learning steps + workspace materials
2. **DEMO_RESPONSE_PLAN_WEEK** — Multi-deadline planning: "I have a calc midterm Friday, history essay Thursday" → 8 tasks, schedule with hard blocks, stress-adjusted priority
3. **DEMO_RESPONSE_CONTRADICT_HABIT** — Constraint conflict: "I can't study past 10pm" when existing schedule has late tasks → recalibration + PEARL insight banner
4. **DEMO_RESPONSE_UPLOAD_PDF** — Document ingestion: Upload a PDF → classification, chunk extraction, auto-linking to tasks

**PromptSelector cards:** Guided demo flow with 4 preset cards shown above the chat input: Learn → Plan → Add Habit → Upload. Each card has a title, description, and pre-filled prompt. Cards show dependency hints (e.g., habit card shows "After: Plan a Complex Task"). Cards disappear once used. This creates a smooth VC demo narrative.

### 17.4 Intentionally Not Ported
- **LM Studio Direct Chat Mode** (`LMStudioChatPanel.tsx`, `ChatModeSelector.tsx` pipeline/LMStudio toggle): Removed. The model mode selector (Auto/4B/27B) replaces this with a simpler UX. LM Studio is still accessible via the backend's routing, just not as a separate chat mode.

---

## 18. VC Demo Script (2 minutes)

A suggested walkthrough for the pitch:

1. **Open landing page** (10s): Let the hero animation play. Scroll slowly through the pipeline story section — this IS the product explanation.
2. **Click "Get Started"** (5s): Onboarding cinematic plays. "What's stressing you?"
3. **Type the brain dump** (15s): "I have a calculus midterm on Friday worth 30% of my grade. Also need to finish my history essay by Thursday — 2000 words and I haven't started. Volleyball practice Mon/Wed/Fri 4-6pm. I'm stressed about the math."
4. **Watch the transformation** (15s): Schedule animates into the Command Center. Point out: "See how it broke the calc into 25-minute micro-tasks? It detected the stress signal and prioritized math in the morning when focus is highest."
5. **Show the dashboard** (10s): Point at stats strip. "Day 1. Zero guilt. Just a plan."
6. **Demo the AI** (15s): In the chat panel, type "push the last math task to after lunch, I need a break." Watch Jarvis reschedule.
7. **Open Architecture page** (10s): "And this isn't a GPT wrapper — here's our 9-layer stack. Local-first AI on Apple Silicon, OR-Tools constraint solver, PEARL behavioral insights."
8. **Return to landing page pricing** (5s): "Free tier to start, $9.99/mo for students. We're targeting 10M US college students."

**Pre-demo checklist:**
- [ ] `?onboarding=true` param ready
- [ ] Demo mode ON (no backend dependency)
- [ ] Light mode for daytime presentations (or match room lighting)
- [ ] Browser zoom at 100%, no bookmarks bar
- [ ] Practice the brain dump text so it flows naturally

---

## Appendix: Auth Strategy (VC Demo)

For the VC pitch, auth is **mocked**:
- Landing page "Get Started" → redirect to `/onboarding` or `/dashboard` directly
- No real auth provider integrated yet
- `(auth)/login` and `(auth)/signup` pages exist as shells with the Jarvis design system
- A `?onboarding=true` URL param forces the first-time experience for demo purposes
- Post-MVP: integrate Supabase Auth or NextAuth

---

## Appendix A: CSS Variables Template

```css
:root {
  /* Semantic */
  --color-terra: #D4775A;
  --color-sage: #4A7B6B;
  --color-dusk: #6B7FB5;
  --color-gold: #E09D5C;
  --color-ink: #2C2924;

  /* Surfaces — Light */
  --surface-canvas: #FAF8F4;
  --surface-card: #FFFFFF;
  --surface-subtle: #F5F0E8;
  --surface-muted: #F0EBE3;
  --border-default: #EDE9E1;
  --border-strong: #D8D0C4;

  /* Text — Light */
  --text-primary: #2C2924;
  --text-secondary: #6B6560;
  --text-muted: #9C9488;
}

[data-theme="dark"] {
  --surface-canvas: #1C1A17;
  --surface-card: #252320;
  --surface-subtle: #201E1B;
  --surface-muted: #2C2924;
  --border-default: #3A3632;
  --border-strong: #4A4640;

  --text-primary: #FAF8F4;
  --text-secondary: #9C9488;
  --text-muted: #6B6560;
}
```

## Appendix B: Tailwind Config Additions

```js
// tailwind.config.ts
{
  theme: {
    extend: {
      colors: {
        terra: 'var(--color-terra)',
        sage: 'var(--color-sage)',
        dusk: 'var(--color-dusk)',
        gold: 'var(--color-gold)',
        ink: 'var(--color-ink)',
        surface: {
          canvas: 'var(--surface-canvas)',
          card: 'var(--surface-card)',
          subtle: 'var(--surface-subtle)',
          muted: 'var(--surface-muted)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
      },
      fontFamily: {
        display: ['Inter Display', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(44,41,36,0.06)',
        md: '0 2px 8px rgba(44,41,36,0.08)',
        lg: '0 8px 24px rgba(44,41,36,0.12)',
        'glow-terra': '0 0 20px rgba(212,119,90,0.15)',
        'glow-dusk': '0 0 12px rgba(107,127,181,0.12)',
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        pill: '20px',
      },
    },
  },
}
```

## Appendix C: Key Component File Structure

```
jarvis-frontend/
├── app/
│   ├── layout.tsx                 # Root layout, theme provider, fonts
│   ├── page.tsx                   # Landing page (dark, cinematic)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                     # Authenticated app routes
│   │   ├── layout.tsx             # Command Center shell (nav rail + AI panel)
│   │   ├── dashboard/page.tsx     # Home/dashboard
│   │   ├── chat/page.tsx          # Full-width chat
│   │   ├── schedule/page.tsx      # FullCalendar view
│   │   ├── workspace/[taskId]/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── habits/page.tsx
│   │   ├── architecture/page.tsx  # Spline 3D
│   │   └── analytics/page.tsx
│   └── onboarding/page.tsx        # First-time experience
├── components/
│   ├── landing/                   # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── PipelineStory.tsx
│   │   ├── FeatureBento.tsx
│   │   ├── Philosophy.tsx
│   │   ├── LiveDemo.tsx
│   │   ├── TechCredibility.tsx
│   │   ├── Pricing.tsx
│   │   ├── Footer.tsx
│   │   └── LandingNav.tsx
│   ├── app/                       # App interior components
│   │   ├── NavRail.tsx
│   │   ├── AIChatPanel.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── StatsStrip.tsx
│   │   ├── ScheduleTimeline.tsx
│   │   ├── TaskBlock.tsx
│   │   ├── ThinkingProcess.tsx
│   │   ├── ResponseLayers.tsx
│   │   ├── PearlInsightBanner.tsx
│   │   ├── MemoryPanel.tsx
│   │   ├── DocumentDropZone.tsx
│   │   ├── HabitCard.tsx
│   │   ├── DailyGreeting.tsx
│   │   ├── SessionSidebar.tsx
│   │   ├── FileCard.tsx
│   │   ├── BrainDumpOverlay.tsx
│   │   ├── ScheduleCalendar.tsx    # FullCalendar wrapper with Jarvis theming
│   │   ├── SettingsModal.tsx
│   │   ├── EmptyState.tsx          # Reusable empty state component
│   │   ├── ReplanBanner.tsx         # Gold replan notification bar
│   │   ├── ClarificationCard.tsx    # Quick-reply pill buttons
│   │   ├── TaskPreview.tsx          # Draft Stage 1: editable task cards
│   │   ├── DraftScheduleView.tsx    # Draft Stage 2: accept/modify schedule
│   │   ├── TaskAssignmentViz.tsx    # 5-step scheduling walkthrough
│   │   ├── PipelineTrace.tsx        # Post-completion pipeline step trace
│   │   ├── GenerationMetrics.tsx    # Model/tokens/timing bar
│   │   ├── ModelModeSelector.tsx    # Auto/4B/27B toggle
│   │   ├── WorkspaceChatPanel.tsx   # Task-scoped mini-chat
│   │   ├── MermaidDiagram.tsx       # Mermaid viewer with zoom/pan/fullscreen
│   │   ├── PromptSelector.tsx       # Demo prompt cards (Learn/Plan/Habit/Upload)
│   │   ├── QualityRatingPopup.tsx   # 1-5 star rating for task completion
│   │   └── DocumentClassificationToast.tsx  # Specialized toast for doc processing results
│   ├── ui/                        # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Toggle.tsx
│   │   ├── Toast.tsx
│   │   ├── ProgressRing.tsx
│   │   └── Tooltip.tsx
│   └── aceternity/                # Cherry-picked Aceternity components
│       ├── AuroraBackground.tsx
│       ├── TextGenerateEffect.tsx
│       ├── MovingBorder.tsx
│       ├── BentoGrid.tsx
│       ├── Spotlight.tsx
│       └── InfiniteMovingCards.tsx
├── lib/
│   ├── hooks/
│   │   ├── useJarvisChat.ts       # Core chat hook (rewritten)
│   │   ├── useTheme.ts            # Auto dark/light with system preference
│   │   ├── useCommandPalette.ts
│   │   ├── useMediaQuery.ts       # Responsive breakpoint hook
│   │   ├── useSchedule.ts         # Schedule data fetching + local state
│   │   └── useSessions.ts         # Chat session history management
│   ├── api.ts                     # API client (demo/live routing)
│   ├── types.ts                   # TypeScript interfaces
│   ├── demoData.ts                # Demo mode mock responses
│   ├── constants.ts               # Color tokens, breakpoints, animation configs
│   └── store.ts                   # localStorage persistence
├── styles/
│   ├── globals.css                # CSS variables, base styles, theme
│   └── calendar.css               # FullCalendar theme overrides
├── public/
│   ├── fonts/                     # Inter, Inter Display, JetBrains Mono
│   └── logo.svg                   # Animated J mark
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```
