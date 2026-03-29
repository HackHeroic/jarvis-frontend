# Jarvis Frontend — Tier 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demo-ready Jarvis frontend for the VC pitch on April 1 — landing page + Command Center (dashboard + chat) with demo mode.

**Architecture:** New Next.js 14 App Router project with Tailwind 3.4. Warm "Jarvis Warm Spectrum" design system via CSS custom properties. Landing page is always-dark cinematic. App interior is warm light/dark with collapsible AI chat panel. Demo mode uses hardcoded mock data (zero backend dependency).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS 3.4, GSAP 3, Motion (framer-motion), Aceternity UI (cherry-picked), Lucide React, react-markdown + remark-gfm

**Spec:** `docs/superpowers/specs/2026-03-29-jarvis-frontend-design.md`
**Prototype reference:** `/Users/madhav/Jarvis-cursor/jarvis-demo/`
**Backend:** `/Users/madhav/Jarvis-cursor/Jarvis-Engine/` (FastAPI, port 8000)

---

## File Structure (Tier 1 only)

```
jarvis-frontend/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, theme script, providers
│   ├── page.tsx                      # Landing page (dark, cinematic)
│   ├── globals.css                   # CSS variables, Tailwind base, theme
│   ├── (app)/
│   │   ├── layout.tsx                # Command Center shell: nav rail + AI panel
│   │   ├── dashboard/page.tsx        # Dashboard: greeting, stats, timeline
│   │   └── chat/page.tsx             # Full-width chat page
│   └── onboarding/page.tsx           # Placeholder (Tier 2)
├── components/
│   ├── landing/
│   │   ├── LandingNav.tsx            # Sticky dark navbar
│   │   ├── Hero.tsx                  # Hero with CSS/SVG brain + aurora
│   │   ├── FeatureBento.tsx          # 6-card bento grid
│   │   ├── Philosophy.tsx            # Anti-guilt quote section
│   │   ├── Pricing.tsx               # Free vs Pro cards
│   │   └── Footer.tsx                # Minimal footer
│   ├── app/
│   │   ├── NavRail.tsx               # 56px icon navigation rail
│   │   ├── AIChatPanel.tsx           # 280px collapsible right panel
│   │   ├── StatsStrip.tsx            # 3 stat cards (tasks, focus, streak)
│   │   ├── ScheduleTimeline.tsx      # Vertical schedule with task blocks
│   │   ├── TaskBlock.tsx             # Individual task block (4 states)
│   │   ├── DailyGreeting.tsx         # "Good morning, Name" header
│   │   ├── ThinkingProcess.tsx       # Collapsible thinking display
│   │   ├── PromptSelector.tsx        # Demo prompt cards
│   │   └── EmptyState.tsx            # Reusable empty state
│   └── ui/
│       ├── Button.tsx                # Terra/outline/ghost variants
│       ├── Card.tsx                  # Surface card with border
│       ├── Badge.tsx                 # Colored pill badges
│       ├── Toast.tsx                 # Bottom-right notifications
│       ├── ProgressRing.tsx          # SVG circular progress
│       └── Tooltip.tsx               # Hover tooltip
├── lib/
│   ├── hooks/
│   │   ├── useJarvisChat.ts          # Core chat hook: SSE streaming, demo mode
│   │   └── useTheme.ts              # Theme detection + persistence
│   ├── api.ts                        # API client: demo/live routing
│   ├── types.ts                      # TypeScript interfaces
│   ├── demoData.ts                   # 4 demo scenarios
│   ├── constants.ts                  # Design tokens, nav items
│   ├── store.ts                      # localStorage helpers
│   └── providers.tsx                 # ThemeProvider + ModeProvider combined
├── styles/
│   └── globals.css -> app/globals.css (symlink or same)
├── public/
│   └── fonts/                        # Inter variable, JetBrains Mono
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffolding + Dependencies

**Files:**
- Create: `jarvis-frontend/package.json`
- Create: `jarvis-frontend/tsconfig.json`
- Create: `jarvis-frontend/next.config.ts`
- Create: `jarvis-frontend/tailwind.config.ts`
- Create: `jarvis-frontend/.gitignore`

- [ ] **Step 0: Initialize git repo**

```bash
cd /Users/madhav/Jarvis-cursor/jarvis-frontend
git init
```

- [ ] **Step 1: Initialize Next.js project**

Note: The `docs/` folder already exists. Move it temporarily, scaffold, then restore.

```bash
cd /Users/madhav/Jarvis-cursor/jarvis-frontend
mv docs /tmp/jarvis-frontend-docs-backup
npx create-next-app@14 . --typescript --tailwind --eslint --app --import-alias="@/*" --use-npm
mv /tmp/jarvis-frontend-docs-backup docs
```

When prompted: Do NOT use `src/` directory. Select Yes to all other defaults. This creates the base project.

- [ ] **Step 2: Install Tier 1 dependencies**

```bash
cd /Users/madhav/Jarvis-cursor/jarvis-frontend
npm install gsap @gsap/react motion lucide-react react-markdown remark-gfm clsx tailwind-merge
```

- [ ] **Step 3: Pin Tailwind to 3.4 and install dev dependencies**

```bash
npm install tailwindcss@3.4 -D @tailwindcss/typography
```

- [ ] **Step 4: Replace tailwind.config.ts with Jarvis design system**

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        terra: "var(--color-terra)",
        sage: "var(--color-sage)",
        dusk: "var(--color-dusk)",
        gold: "var(--color-gold)",
        ink: "var(--color-ink)",
        surface: {
          canvas: "var(--surface-canvas)",
          card: "var(--surface-card)",
          subtle: "var(--surface-subtle)",
          muted: "var(--surface-muted)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
      fontFamily: {
        display: ["Inter Display", "Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(44,41,36,0.06)",
        md: "0 2px 8px rgba(44,41,36,0.08)",
        lg: "0 8px 24px rgba(44,41,36,0.12)",
        "glow-terra": "0 0 20px rgba(212,119,90,0.15)",
        "glow-dusk": "0 0 12px rgba(107,127,181,0.12)",
      },
      borderRadius: {
        card: "12px",
        button: "8px",
        pill: "20px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
```

- [ ] **Step 5: Replace next.config.ts**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["prod.spline.design"],
  },
};

export default nextConfig;
```

- [ ] **Step 6: Verify project runs**

```bash
cd /Users/madhav/Jarvis-cursor/jarvis-frontend && npm run dev
```

Expected: Dev server starts on localhost:3000 with default Next.js page.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js 14 project with Jarvis Tailwind config"
```

---

## Task 2: CSS Variables + Theme System + Fonts

**Files:**
- Create: `app/globals.css`
- Create: `lib/hooks/useTheme.ts`
- Create: `lib/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Download and place fonts**

Download Inter v4.0+ from https://rsms.me/inter (includes Display optical size). Place the variable font file in `public/fonts/`. Also download JetBrains Mono from Google Fonts.

```bash
mkdir -p public/fonts
# Download Inter variable font (InterVariable.woff2) and place in public/fonts/
# Download JetBrains Mono variable font and place in public/fonts/
```

- [ ] **Step 2: Write globals.css with full CSS variable system**

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: "Inter";
  src: url("/fonts/InterVariable.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}

@font-face {
  font-family: "Inter Display";
  src: url("/fonts/InterVariable.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
  font-variation-settings: "opsz" 32;
}

@font-face {
  font-family: "JetBrains Mono";
  src: url("/fonts/JetBrainsMono-Variable.woff2") format("woff2");
  font-weight: 100 800;
  font-display: swap;
}

:root {
  /* Semantic Colors */
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

@layer base {
  body {
    @apply bg-surface-canvas text-primary font-sans;
    font-feature-settings: "cv11", "ss01";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Focus ring for all interactive elements */
  :focus-visible {
    outline: 2px solid var(--border-strong);
    outline-offset: 2px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 3: Write useTheme hook**

```ts
// lib/hooks/useTheme.ts
"use client";

import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "jarvis-theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    const initial = stored ?? getSystemTheme();
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, mounted };
}
```

- [ ] **Step 4: Write providers**

```tsx
// lib/providers.tsx
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useTheme, type Theme } from "@/lib/hooks/useTheme";
import { ToastProvider } from "@/components/ui/Toast";

// --- Theme Context ---
type ThemeContextType = { theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextType | null>(null);
export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within Providers");
  return ctx;
}

// --- Mode Context ---
export type AppMode = "demo" | "live";
type ModeContextType = { mode: AppMode; setMode: (m: AppMode) => void; isDemoMode: boolean };
const ModeContext = createContext<ModeContextType | null>(null);
export function useModeContext() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useModeContext must be used within Providers");
  return ctx;
}

// --- Combined Provider ---
export function Providers({ children }: { children: ReactNode }) {
  const themeHook = useTheme();
  const [mode, setModeState] = useState<AppMode>("demo");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("jarvis-demo-mode");
    if (stored === "live") setModeState("live");
    setMounted(true);
  }, []);

  const setMode = (m: AppMode) => {
    setModeState(m);
    localStorage.setItem("jarvis-demo-mode", m);
  };

  if (!mounted || !themeHook.mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme: themeHook.theme, setTheme: themeHook.setTheme, toggleTheme: themeHook.toggleTheme }}>
      <ModeContext.Provider value={{ mode, setMode, isDemoMode: mode === "demo" }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ModeContext.Provider>
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 5: Write root layout with theme flash prevention**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jarvis — Your Brain Dump Becomes Your Plan | AI Study Scheduler",
  description:
    "Stop managing your productivity. Tell Jarvis what's stressing you and watch it create an optimized study schedule. AI-powered, anti-guilt, built for students.",
  openGraph: {
    title: "Jarvis — AI-Powered Study Scheduler",
    description: "Your brain dump becomes your plan. AI scheduling that adapts to you.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Inline script to prevent theme flash — runs before React hydration
const themeScript = `(function(){var t=localStorage.getItem('jarvis-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark')}else{document.documentElement.setAttribute('data-theme','light')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify theme switching works**

```bash
npm run dev
```

Open http://localhost:3000. Open DevTools → Application → localStorage. Set `jarvis-theme` to `dark`, refresh. Background should be `#1C1A17`. Set to `light`, refresh. Background should be `#FAF8F4`. No flash.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: CSS variables, theme system with flash prevention, font setup"
```

---

## Task 3: TypeScript Types + API Client + Store

**Files:**
- Create: `lib/types.ts`
- Create: `lib/api.ts`
- Create: `lib/store.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Write core TypeScript types**

```ts
// lib/types.ts

// --- Chat ---
export type StreamPhase =
  | "idle" | "connecting" | "brain_dump_extraction" | "intent_classified"
  | "habits_saved" | "habits_fetched" | "habits_translated"
  | "plan_day_start" | "decomposing" | "decomposition_done"
  | "scheduling" | "schedule_done" | "synthesizing"
  | "awaiting_confirmation" | "confirming"
  | "reasoning" | "responding" | "complete" | "error" | "aborted";

export interface GenerationMetrics {
  model?: string;
  tokens_per_second?: number;
  total_tokens?: number;
  total_time_ms?: number;
  ttft_ms?: number;
}

export interface ImplementationIntention {
  obstacle_trigger: string;
  behavioral_response: string;
}

export interface TaskChunk {
  task_id: string;
  title: string;
  duration_minutes: number;
  difficulty_weight: number;
  dependencies: string[];
  completion_criteria: string;
  implementation_intention?: ImplementationIntention;
  deadline_hint?: string;
}

export interface GoalMetadata {
  goal_id: string;
  objective: string;
  outcome_visualization?: string;
  mastery_level_target?: number;
}

export interface ExecutionGraph {
  goal_metadata: GoalMetadata;
  decomposition: TaskChunk[];
  cognitive_load_estimate?: Record<string, number>;
}

export interface ScheduleSlot {
  start_min: number;
  end_min: number;
  tmt_score?: number;
  title?: string;
  constraint_applied?: string;
}

export interface PearlInsight {
  insight: string;
  confidence?: number;
}

export interface MemoryRecord {
  id?: string;
  memory_type: "fact" | "preference" | "behavioral_pattern" | "temporal_event" | "goal" | "feedback" | "constraint";
  content: string;
  confidence?: number;
  created_at?: string;
}

export interface ChatResponse {
  intent?: string;
  message: string;
  schedule?: Record<string, ScheduleSlot>;
  execution_graph?: ExecutionGraph;
  thinking_process?: string;
  suggested_action?: string;
  awaiting_task_confirmation?: boolean;
  schedule_status?: "draft" | "accepted";
  draft_id?: string;
  conversation_id?: string;
  message_id?: string;
  clarification_options?: string[];
  memories?: MemoryRecord[];
  generation_metrics?: GenerationMetrics;
  pearl_insights?: PearlInsight[];
}

export interface PhaseEvent {
  phase: StreamPhase;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface JarvisStreamState {
  phase: StreamPhase;
  reasoning: string;
  message: string;
  error: string | null;
  intent: string | null;
  phaseHistory: PhaseEvent[];
  activeModel: string | null;
}

export const INITIAL_STREAM_STATE: JarvisStreamState = {
  phase: "idle",
  reasoning: "",
  message: "",
  error: null,
  intent: null,
  phaseHistory: [],
  activeModel: null,
};

export interface FileAttachment {
  name: string;
  type: string;
  base64: string;
  mediaType: "pdf" | "image" | "png" | "jpeg";
}

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  phaseHistory?: PhaseEvent[];
  response?: ChatResponse;
  isStreaming?: boolean;
  file?: { name: string; type: string };
  conversationId?: string;
  timestamp: number;
}

// --- Schedule ---
export interface ScheduleTask {
  task_id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completed_at?: Date;
  goal_id?: string;
  color: string;
  deadline_hint?: string;
  constraint_applied?: string;
  implementation_intention?: ImplementationIntention;
}

// --- Nav ---
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}
```

- [ ] **Step 2: Write constants**

```ts
// lib/constants.ts

import type { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "House", href: "/dashboard" },
  { id: "chat", label: "Chat", icon: "MessageSquare", href: "/chat" },
  { id: "schedule", label: "Schedule", icon: "Calendar", href: "/schedule" },
  { id: "workspace", label: "Workspace", icon: "BookOpen", href: "/workspace" },
  { id: "documents", label: "Documents", icon: "FileText", href: "/documents" },
  { id: "habits", label: "Habits", icon: "Target", href: "/habits" },
  { id: "architecture", label: "Architecture", icon: "Dna", href: "/architecture" },
  { id: "analytics", label: "Analytics", icon: "BarChart3", href: "/analytics" },
];

export const DEMO_USER = {
  id: "demo-user-001",
  name: "Madhav",
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const DEMO_LATENCY = 800; // ms delay for demo mode realism
```

- [ ] **Step 2.5: Write cn utility (clsx + tailwind-merge)**

```ts
// lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Write localStorage store helpers**

```ts
// lib/store.ts

import type { JarvisMessage, ChatResponse } from "./types";

const KEYS = {
  chatMessages: (id: string) => `jarvis-chat-messages-${id}`,
  conversationId: "jarvis-conversation-id",
  draftSchedule: "jarvis-draft-schedule",
  lastResponse: "jarvis-last-chat-response",
  onboarded: "jarvis_onboarded",
} as const;

export function saveChatMessages(conversationId: string, messages: JarvisMessage[]) {
  try {
    const cleaned = messages
      .filter((m) => !m.isStreaming)
      .slice(-50)
      .map((m) => ({
        ...m,
        reasoning: undefined, // strip heavy field
        phaseHistory: m.phaseHistory?.slice(-20),
      }));
    localStorage.setItem(KEYS.chatMessages(conversationId), JSON.stringify(cleaned));
  } catch {}
}

export function loadChatMessages(conversationId: string): JarvisMessage[] {
  try {
    const raw = localStorage.getItem(KEYS.chatMessages(conversationId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getConversationId(): string {
  const id = localStorage.getItem(KEYS.conversationId);
  if (id) return id;
  const newId = `conv-${Date.now()}`;
  localStorage.setItem(KEYS.conversationId, newId);
  return newId;
}

export function setConversationId(id: string) {
  localStorage.setItem(KEYS.conversationId, id);
}

export function saveDraftSchedule(response: ChatResponse) {
  try {
    localStorage.setItem(KEYS.draftSchedule, JSON.stringify(response));
  } catch {}
}

export function loadDraftSchedule(): ChatResponse | null {
  try {
    const raw = localStorage.getItem(KEYS.draftSchedule);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraftSchedule() {
  localStorage.removeItem(KEYS.draftSchedule);
}

export function isOnboarded(): boolean {
  return localStorage.getItem(KEYS.onboarded) === "true";
}

export function markOnboarded() {
  localStorage.setItem(KEYS.onboarded, "true");
}

// --- Schedule Conversion ---
// Converts API ScheduleSlot (start_min from midnight) to ScheduleTask (Date objects)
import type { ScheduleSlot, ScheduleTask } from "./types";

const TASK_COLORS = ["#6B7FB5", "#4A7B6B", "#D4775A", "#E09D5C"];

export function slotsToScheduleTasks(
  slots: Record<string, ScheduleSlot>,
  baseDate?: Date
): ScheduleTask[] {
  const base = baseDate ?? new Date();
  base.setHours(0, 0, 0, 0);

  return Object.entries(slots).map(([taskId, slot], i) => {
    const start = new Date(base.getTime() + slot.start_min * 60_000);
    const end = new Date(base.getTime() + slot.end_min * 60_000);
    return {
      task_id: taskId,
      title: slot.title ?? taskId,
      start_time: start,
      end_time: end,
      duration_minutes: slot.end_min - slot.start_min,
      status: "pending" as const,
      color: TASK_COLORS[i % TASK_COLORS.length],
      constraint_applied: slot.constraint_applied,
    };
  });
}
```

- [ ] **Step 4: Write API client with demo/live routing**

```ts
// lib/api.ts

import { API_BASE, DEMO_LATENCY } from "./constants";
import type { ChatResponse } from "./types";
// NOTE: demoData.ts is created in Task 4. This dynamic import avoids a build error if Task 3 is verified in isolation.
const getDemoResponseLazy = async (prompt: string) => {
  const { getDemoResponse } = await import("./demoData");
  return getDemoResponse(prompt);
};

function isDemoMode(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("jarvis-demo-mode") !== "live";
}

export interface ChatRequest {
  user_prompt: string;
  user_id: string;
  conversation_id?: string;
  file_base64?: string;
  media_type?: "pdf" | "image" | "png" | "jpeg";
  file_name?: string;
  model_mode?: "auto" | "4b" | "27b";
  confirm_before_schedule?: boolean;
}

// Non-streaming chat
export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, DEMO_LATENCY));
    return getDemoResponseLazy(req.user_prompt);
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Chat failed (${res.status}): ${detail}`);
  }

  return res.json();
}

// Streaming chat — returns ReadableStream
export async function sendChatStream(
  req: ChatRequest,
  signal?: AbortSignal
): Promise<Response> {
  if (isDemoMode()) {
    // Demo mode returns a fake response after delay; streaming is simulated in the hook
    throw new Error("Use sendChat for demo mode");
  }

  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`Stream failed (${res.status}): ${detail}`);
  }

  return res;
}

// Task actions
export async function completeTask(taskId: string, userId: string, quality: number) {
  if (isDemoMode()) return { status: "completed", replan_triggered: false };
  const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, quality }),
  });
  return res.json();
}

export async function skipTask(taskId: string, userId: string) {
  if (isDemoMode()) return { status: "skipped", replan_triggered: false };
  const res = await fetch(`${API_BASE}/tasks/${taskId}/skip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: TypeScript types, API client, store, constants"
```

---

## Task 4: Demo Data (4 Scenarios)

**Files:**
- Create: `lib/demoData.ts`

- [ ] **Step 1: Write demo data with all 4 scenarios**

```ts
// lib/demoData.ts

import type { ChatResponse, ScheduleSlot, ExecutionGraph } from "./types";

const DEMO_SCHEDULE: Record<string, ScheduleSlot> = {
  task_1: { start_min: 540, end_min: 565, tmt_score: 0.85, title: "Calculus: Review Ch.4 Derivatives" },
  task_2: { start_min: 570, end_min: 595, tmt_score: 0.72, title: "History: Research & Outline" },
  task_3: { start_min: 600, end_min: 625, tmt_score: 0.80, title: "Calculus: Practice Integration" },
  task_4: { start_min: 630, end_min: 655, tmt_score: 0.68, title: "History: Write Introduction" },
  task_5: { start_min: 660, end_min: 685, tmt_score: 0.75, title: "Calculus: Integration by Parts" },
  task_6: { start_min: 840, end_min: 865, tmt_score: 0.60, title: "History: Write Body Paragraphs" },
};

const DEMO_GRAPH: ExecutionGraph = {
  goal_metadata: {
    goal_id: "goal_plan_week",
    objective: "Prepare for calculus midterm and complete history essay",
    outcome_visualization: "Walking into Friday's exam feeling confident, essay submitted Thursday night",
    mastery_level_target: 4,
  },
  decomposition: [
    { task_id: "task_1", title: "Calculus: Review Ch.4 Derivatives", duration_minutes: 25, difficulty_weight: 0.6, dependencies: [], completion_criteria: "Can solve 3 derivative problems without notes", implementation_intention: { obstacle_trigger: "If I feel stuck on chain rule", behavioral_response: "Then open textbook example 4.3 and trace through it step by step" } },
    { task_id: "task_2", title: "History: Research & Outline", duration_minutes: 25, difficulty_weight: 0.4, dependencies: [], completion_criteria: "3-point outline with 2 sources per point" },
    { task_id: "task_3", title: "Calculus: Practice Integration", duration_minutes: 25, difficulty_weight: 0.7, dependencies: ["task_1"], completion_criteria: "Complete 5 integration problems with 80% accuracy" },
    { task_id: "task_4", title: "History: Write Introduction", duration_minutes: 25, difficulty_weight: 0.5, dependencies: ["task_2"], completion_criteria: "250-word introduction with thesis statement", implementation_intention: { obstacle_trigger: "If I can't start writing", behavioral_response: "Then freewrite for 5 minutes without editing" } },
    { task_id: "task_5", title: "Calculus: Integration by Parts", duration_minutes: 25, difficulty_weight: 0.8, dependencies: ["task_3"], completion_criteria: "Solve 3 integration by parts problems", deadline_hint: "Exam Friday" },
    { task_id: "task_6", title: "History: Write Body Paragraphs", duration_minutes: 25, difficulty_weight: 0.5, dependencies: ["task_4"], completion_criteria: "2 body paragraphs, 400 words each", deadline_hint: "Essay due Thursday" },
  ],
};

const DEMO_RESPONSES: Record<string, ChatResponse> = {
  plan_week: {
    intent: "PLAN_DAY",
    message: "I've broken your week into focused 25-minute micro-tasks. Calculus is frontloaded in the mornings when your focus is highest (PEARL detected this pattern). Volleyball blocks on Mon/Wed/Fri 4-6 PM are respected. The essay deadline is tighter, so I've interleaved it with math to prevent burnout.\n\n**6 micro-tasks** across today, totaling **2h 30m** of focused work. Your volleyball blocks are protected. Ready to start?",
    schedule: DEMO_SCHEDULE,
    execution_graph: DEMO_GRAPH,
    thinking_process: "The user has two goals with different deadlines. History essay (Thursday) is more urgent than calculus midterm (Friday). However, the user expressed stress about math, so I'll apply a TMT priority boost to calculus tasks. Volleyball MWF 4-6pm creates hard blocks. I'll use interleaved scheduling (math/history alternating) for better retention per cognitive science research.",
    schedule_status: "draft",
    draft_id: "draft_001",
    conversation_id: "conv-demo-001",
    generation_metrics: { model: "Gemini 2.5 Flash", tokens_per_second: 142, total_tokens: 1847, total_time_ms: 3200, ttft_ms: 280 },
    pearl_insights: [{ insight: "You focus best on math in the morning. I've frontloaded calculus tasks before 11 AM.", confidence: 0.85 }],
  },
  learn: {
    intent: "PLAN_DAY",
    message: "Great topic! I've broken Dijkstra's algorithm into 5 learning steps, starting with the intuition and building up to implementation. Each step is under 25 minutes.\n\nI've also pulled 2 YouTube explanations and a practice problem set from your uploaded notes.",
    execution_graph: {
      goal_metadata: { goal_id: "goal_dijkstra", objective: "Learn Dijkstra's shortest path algorithm" },
      decomposition: [
        { task_id: "dj_1", title: "Dijkstra: Understand Graph Basics", duration_minutes: 15, difficulty_weight: 0.3, dependencies: [], completion_criteria: "Can draw a weighted graph and identify shortest path visually" },
        { task_id: "dj_2", title: "Dijkstra: Algorithm Walkthrough", duration_minutes: 25, difficulty_weight: 0.6, dependencies: ["dj_1"], completion_criteria: "Can trace algorithm on paper with 5-node graph" },
        { task_id: "dj_3", title: "Dijkstra: Code Implementation", duration_minutes: 25, difficulty_weight: 0.8, dependencies: ["dj_2"], completion_criteria: "Working Python implementation that passes 3 test cases" },
      ],
    },
    conversation_id: "conv-demo-001",
    generation_metrics: { model: "Qwen-27B (Local)", tokens_per_second: 38, total_tokens: 920, total_time_ms: 4100, ttft_ms: 850 },
  },
  habit: {
    intent: "BEHAVIORAL_CONSTRAINT",
    message: "Got it! I've added \"no studying past 10 PM\" as a hard constraint. I noticed your current schedule had a task at 10:30 PM — I've moved it to tomorrow morning. Your schedule has been recalibrated.\n\nNo guilt — just a better plan that respects your boundaries.",
    suggested_action: "replan",
    conversation_id: "conv-demo-001",
    generation_metrics: { model: "Gemini 2.5 Flash", tokens_per_second: 155, total_tokens: 412, total_time_ms: 1800, ttft_ms: 190 },
    pearl_insights: [{ insight: "You typically stop being productive around 9:30 PM based on your skip patterns. This constraint aligns with your natural rhythm.", confidence: 0.78 }],
  },
  upload: {
    intent: "KNOWLEDGE_INGESTION",
    message: "I've processed your PDF — it's a **Calculus Chapter 4** practice problem set. I found 12 problems covering derivatives and integration.\n\nI've linked 8 of them to your existing calculus tasks based on topic overlap (similarity > 0.65). The remaining 4 cover topics not in your current schedule.\n\nWant me to add those topics to your plan?",
    clarification_options: ["Yes, add them", "No, just the linked ones", "Show me the 4 extra topics first"],
    conversation_id: "conv-demo-001",
    generation_metrics: { model: "Gemini 2.5 Flash", tokens_per_second: 128, total_tokens: 634, total_time_ms: 2400, ttft_ms: 320 },
  },
};

export function getDemoResponse(prompt: string): ChatResponse {
  const lower = prompt.toLowerCase();
  if (lower.includes("dijkstra") || lower.includes("teach") || lower.includes("learn")) {
    return DEMO_RESPONSES.learn;
  }
  if (lower.includes("past 10") || lower.includes("can't study") || lower.includes("habit")) {
    return DEMO_RESPONSES.habit;
  }
  if (lower.includes("upload") || lower.includes("pdf") || lower.includes("document")) {
    return DEMO_RESPONSES.upload;
  }
  // Default: plan week scenario
  return DEMO_RESPONSES.plan_week;
}

// Preset prompt cards for guided demo flow
export const DEMO_PROMPTS = [
  {
    id: "learn",
    title: "Learn a Concept",
    description: "Decompose a topic into learning steps",
    prompt: "Teach me Dijkstra's algorithm — break it into steps I can learn today",
    color: "dusk" as const,
  },
  {
    id: "plan",
    title: "Plan a Complex Task",
    description: "Multi-deadline scheduling with constraints",
    prompt: "I have a calculus midterm on Friday worth 30% of my grade. Also need to finish my history essay by Thursday, it's 2000 words and I haven't started. I have volleyball practice Mon/Wed/Fri 4-6pm. I'm really stressed about the math.",
    color: "terra" as const,
  },
  {
    id: "habit",
    title: "Add a Habit",
    description: "Set behavioral constraints",
    prompt: "I can't study past 10pm — I need my sleep",
    color: "gold" as const,
    dependsOn: "plan",
    hint: "After: Plan a Complex Task",
  },
  {
    id: "upload",
    title: "Upload Materials",
    description: "Document ingestion + task linking",
    prompt: "I just uploaded my calculus practice set PDF",
    color: "sage" as const,
    dependsOn: "plan",
    hint: "After: Plan a Complex Task",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: demo data with 4 scenarios + prompt selector cards"
```

---

## Task 5: UI Primitives (Button, Card, Badge, ProgressRing, Toast, Tooltip, EmptyState)

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/ProgressRing.tsx`
- Create: `components/ui/Toast.tsx`
- Create: `components/ui/Tooltip.tsx`
- Create: `components/app/EmptyState.tsx`

- [ ] **Step 1: Write Button component**

```tsx
// components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-terra text-white hover:shadow-glow-terra active:scale-[0.98]",
  secondary: "bg-surface-muted text-primary hover:bg-surface-subtle",
  ghost: "text-secondary hover:bg-surface-muted",
  outline: "border border-border text-primary hover:bg-surface-muted",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-button font-medium transition-all duration-150",
        variants[variant],
        sizes[size],
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
```

- [ ] **Step 2: Write Card component**

```tsx
// components/ui/Card.tsx
import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-surface-card border border-border rounded-card",
        hover && "transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write Badge component**

```tsx
// components/ui/Badge.tsx
import { clsx } from "clsx";

type BadgeColor = "terra" | "sage" | "dusk" | "gold" | "ink";

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

const colorMap: Record<BadgeColor, string> = {
  terra: "bg-terra/15 text-terra",
  sage: "bg-sage/15 text-sage",
  dusk: "bg-dusk/15 text-dusk",
  gold: "bg-gold/15 text-gold",
  ink: "bg-ink/10 text-ink",
};

export function Badge({ color = "ink", className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Write ProgressRing component**

```tsx
// components/ui/ProgressRing.tsx
interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  color = "var(--color-dusk)",
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border-default)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold" style={{ color }}>
        {value}%
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write Tooltip component**

```tsx
// components/ui/Tooltip.tsx
"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "clsx";

interface TooltipProps {
  content: string;
  side?: "right" | "bottom";
  children: ReactNode;
}

export function Tooltip({ content, side = "right", children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className={clsx(
            "absolute z-50 whitespace-nowrap rounded-button bg-ink px-2.5 py-1 text-xs text-white shadow-lg",
            side === "right" && "left-full ml-2 top-1/2 -translate-y-1/2",
            side === "bottom" && "top-full mt-2 left-1/2 -translate-x-1/2"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write Toast component**

```tsx
// components/ui/Toast.tsx
"use client";

import { useEffect, useState, createContext, useContext, useCallback, type ReactNode } from "react";
import { clsx } from "clsx";

interface ToastItem {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
}

type ToastContextType = { toast: (item: Omit<ToastItem, "id">) => void };
const ToastContext = createContext<ToastContextType | null>(null);
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const typeColors = {
  info: "border-dusk",
  success: "border-sage",
  warning: "border-gold",
  error: "border-terra",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, item.duration ?? 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "bg-surface-card border-l-4 border rounded-card px-4 py-3 shadow-lg text-sm text-primary transition-all",
              typeColors[t.type ?? "info"]
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 7: Write EmptyState component**

```tsx
// components/app/EmptyState.tsx
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: string;
  headline: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, headline, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-[400px] mx-auto py-20">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-primary">{headline}</h3>
      <p className="text-sm text-secondary mt-1 leading-relaxed">{subtitle}</p>
      {ctaLabel && onCta && (
        <Button className="mt-6" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: UI primitives — Button, Card, Badge, ProgressRing, Toast, Tooltip, EmptyState"
```

---

## Task 6: Landing Page — Nav + Hero + Bento + Philosophy + Pricing + Footer

**Files:**
- Create: `components/landing/LandingNav.tsx`
- Create: `components/landing/Hero.tsx`
- Create: `components/landing/FeatureBento.tsx`
- Create: `components/landing/Philosophy.tsx`
- Create: `components/landing/Pricing.tsx`
- Create: `components/landing/Footer.tsx`
- Modify: `app/page.tsx`

This is a large task. Each component is self-contained. The landing page is always dark — uses inline Tailwind dark classes, not the theme system.

- [ ] **Step 1: Write LandingNav**

```tsx
// components/landing/LandingNav.tsx
"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import Link from "next/link";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 transition-all duration-300",
        scrolled ? "bg-[#1C1A17]/90 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#D4775A] flex items-center justify-center font-extrabold text-[#1C1A17]">
          J
        </div>
        <span className="text-[#FAF8F4] font-semibold tracking-tight">Jarvis</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="#features" className="text-[#FAF8F4]/50 text-sm hover:text-[#FAF8F4]/80 transition-colors">Features</a>
        <a href="#how-it-works" className="text-[#FAF8F4]/50 text-sm hover:text-[#FAF8F4]/80 transition-colors">How it works</a>
        <a href="#pricing" className="text-[#FAF8F4]/50 text-sm hover:text-[#FAF8F4]/80 transition-colors">Pricing</a>
        <Link
          href="/dashboard"
          className="px-4 py-1.5 bg-[#D4775A] text-[#1C1A17] rounded-lg text-sm font-semibold hover:shadow-[0_0_20px_rgba(212,119,90,0.15)] transition-shadow"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Write Hero section with CSS/SVG brain fallback**

```tsx
// components/landing/Hero.tsx
"use client";

import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center px-6 overflow-hidden" style={{ background: "#1C1A17" }}>
      {/* Aurora background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse at 25% 50%, rgba(212,119,90,0.12) 0%, transparent 60%)",
            "radial-gradient(ellipse at 75% 30%, rgba(107,127,181,0.08) 0%, transparent 50%)",
            "radial-gradient(ellipse at 50% 80%, rgba(74,123,107,0.06) 0%, transparent 40%)",
          ].join(","),
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center gap-16">
        {/* Left: Text */}
        <div className="flex-1 max-w-xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[#D4775A] text-xs font-medium uppercase tracking-[2px] mb-4"
          >
            AI-Powered Preparation Engine
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-[56px] font-extrabold text-[#FAF8F4] leading-[1.1] tracking-[-2px] font-display"
          >
            Your brain dump{" "}
            <span className="text-[#D4775A]">becomes your plan.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-[#FAF8F4]/60 text-sm leading-relaxed mt-5 max-w-md"
          >
            Stop managing your productivity. Just tell Jarvis what&apos;s on your mind — exams,
            deadlines, goals — and watch it transform chaos into an optimized schedule. No guilt.
            No pressure. Just progress.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex gap-3 mt-7"
          >
            <Link
              href="/dashboard"
              className="px-6 py-2.5 bg-[#D4775A] text-[#1C1A17] rounded-lg font-semibold text-sm hover:shadow-[0_0_20px_rgba(212,119,90,0.15)] transition-all"
            >
              Start for Free &rarr;
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-2.5 border border-[#FAF8F4]/20 text-[#FAF8F4] rounded-lg text-sm hover:border-[#FAF8F4]/40 transition-colors"
            >
              Watch Demo
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-[#FAF8F4]/40 text-xs mt-5"
          >
            Built for students, by a student.
          </motion.p>
        </div>

        {/* Right: CSS/SVG brain orb (Tier 1 fallback) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-72 h-72">
            {/* Glow rings */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D4775A]/20 via-[#6B7FB5]/10 to-transparent animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#D4775A]/10 via-transparent to-[#4A7B6B]/10 animate-[spin_15s_linear_infinite]" />
            {/* Core orb */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#D4775A]/15 to-[#6B7FB5]/15 border border-[#D4775A]/20 backdrop-blur-sm flex items-center justify-center">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-60">
                {/* Simplified brain network SVG */}
                <circle cx="60" cy="35" r="4" fill="#D4775A" />
                <circle cx="40" cy="55" r="3" fill="#6B7FB5" />
                <circle cx="80" cy="55" r="3" fill="#6B7FB5" />
                <circle cx="35" cy="80" r="3" fill="#4A7B6B" />
                <circle cx="60" cy="85" r="4" fill="#D4775A" />
                <circle cx="85" cy="80" r="3" fill="#4A7B6B" />
                <line x1="60" y1="35" x2="40" y2="55" stroke="#D4775A" strokeWidth="1" opacity="0.4" />
                <line x1="60" y1="35" x2="80" y2="55" stroke="#D4775A" strokeWidth="1" opacity="0.4" />
                <line x1="40" y1="55" x2="35" y2="80" stroke="#6B7FB5" strokeWidth="1" opacity="0.3" />
                <line x1="40" y1="55" x2="60" y2="85" stroke="#6B7FB5" strokeWidth="1" opacity="0.3" />
                <line x1="80" y1="55" x2="85" y2="80" stroke="#6B7FB5" strokeWidth="1" opacity="0.3" />
                <line x1="80" y1="55" x2="60" y2="85" stroke="#6B7FB5" strokeWidth="1" opacity="0.3" />
                <line x1="35" y1="80" x2="60" y2="85" stroke="#4A7B6B" strokeWidth="1" opacity="0.3" />
                <line x1="85" y1="80" x2="60" y2="85" stroke="#4A7B6B" strokeWidth="1" opacity="0.3" />
              </svg>
            </div>
            {/* Orbiting particles */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#D4775A] shadow-[0_0_6px_#D4775A]"
                style={{
                  top: "50%",
                  left: "50%",
                  animation: `orbit ${10 + i * 2}s linear infinite`,
                  animationDelay: `${i * -2}s`,
                  transformOrigin: `${60 + i * 15}px 0`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#FAF8F4]/30 animate-bounce">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5" /></svg>
      </div>

      <style jsx>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-radius, 120px)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-radius, 120px)) rotate(-360deg); }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Step 3: Write FeatureBento**

```tsx
// components/landing/FeatureBento.tsx
"use client";

import { motion } from "motion/react";

const features = [
  { title: "AI Smart Schedule", description: "OR-Tools constraint solver breaks goals into 25-min micro-tasks, respects your energy levels and hard blocks.", color: "#6B7FB5", span: 2, icon: "🗓️" },
  { title: "Anti-Guilt Engine", description: "Missed a task? Jarvis recalibrates, never shames. Failures are data points.", color: "#D4775A", span: 1, icon: "💛" },
  { title: "Document Intelligence", description: "Drop PDFs, slides, notes. Jarvis extracts, classifies, and links materials to your tasks.", color: "#4A7B6B", span: 1, icon: "📄" },
  { title: "Smart Workspace", description: "Each task gets its own workspace with RAG-powered study materials, YouTube links, practice quizzes, and spaced repetition.", color: "#2C2924", span: 2, icon: "🎯" },
  { title: "Behavioral Habits", description: '"I can\'t study past 10pm" — Jarvis respects it and adjusts.', color: "#E09D5C", span: 1, icon: "🧠" },
  { title: "9-Layer Architecture", description: "Real engineering, not a GPT wrapper. Local-first AI on Apple Silicon.", color: "#6B7FB5", span: 1, icon: "🧬" },
];

export function FeatureBento() {
  return (
    <section id="features" className="py-24 px-6" style={{ background: "#1C1A17" }}>
      <div className="max-w-5xl mx-auto">
        <p className="text-[#D4775A] text-xs font-medium uppercase tracking-[2px] text-center mb-2">Everything You Need</p>
        <h2 className="text-3xl font-bold text-[#FAF8F4] text-center tracking-tight mb-12">Built for how your brain actually works</h2>

        <div className="grid grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-5 border transition-all hover:shadow-lg"
              style={{
                gridColumn: `span ${f.span}`,
                background: `${f.color}10`,
                borderColor: `${f.color}30`,
              }}
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-sm font-semibold text-[#FAF8F4] mb-1">{f.title}</h3>
              <p className="text-xs text-[#FAF8F4]/50 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write Philosophy section**

```tsx
// components/landing/Philosophy.tsx
"use client";

import { motion } from "motion/react";

export function Philosophy() {
  return (
    <section className="py-32 px-6 flex items-center justify-center" style={{ background: "linear-gradient(180deg, #1C1A17 0%, #2A2420 100%)" }}>
      <div className="max-w-2xl text-center">
        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-2xl md:text-3xl font-bold text-[#FAF8F4] leading-snug tracking-tight"
        >
          &ldquo;Every other productivity app makes you feel guilty for falling behind.
          <br /><br />
          <span className="text-[#D4775A]">Jarvis makes falling behind impossible.</span>&rdquo;
        </motion.blockquote>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-xs text-[#FAF8F4]/40 mt-8 leading-relaxed max-w-md mx-auto"
        >
          Missed a task? Jarvis recalibrates your schedule instantly. No red warnings. No shame metrics.
          Just a new plan that works with where you are <em>right now</em>.
        </motion.p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write Pricing section**

```tsx
// components/landing/Pricing.tsx
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["Basic AI scheduling", "3 documents", "Limited brain dumps"],
    cta: "Get Started",
    primary: false,
  },
  {
    name: "Student Pro",
    price: "$9.99",
    period: "/mo",
    features: ["Unlimited everything", "Advanced AI + RAG", "Spaced repetition", "Priority support"],
    cta: "Start Free Trial",
    primary: true,
    badge: "POPULAR",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 text-center" style={{ background: "linear-gradient(180deg, #1C1A17 0%, #0F0D0A 100%)" }}>
      <h2 className="text-3xl font-bold text-[#FAF8F4] mb-10">Start getting things done.</h2>
      <div className="flex gap-4 justify-center max-w-lg mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="flex-1 rounded-xl p-5 text-left relative"
            style={{
              background: plan.primary ? "rgba(212,119,90,0.1)" : "rgba(250,248,244,0.05)",
              border: plan.primary ? "2px solid #D4775A" : "1px solid rgba(250,248,244,0.1)",
            }}
          >
            {plan.badge && (
              <span className="absolute -top-2.5 right-3 bg-[#D4775A] text-[#1C1A17] text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                {plan.badge}
              </span>
            )}
            <p className="text-xs text-[#FAF8F4]/50" style={plan.primary ? { color: "#D4775A" } : undefined}>{plan.name}</p>
            <p className="text-3xl font-bold text-[#FAF8F4] mt-1">
              {plan.price}
              {plan.period && <span className="text-sm font-normal text-[#FAF8F4]/50">{plan.period}</span>}
            </p>
            <ul className="mt-3 space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-[#FAF8F4]/40 leading-relaxed">{f}</li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="block mt-5 text-center py-2 rounded-lg text-xs font-semibold transition-colors"
              style={
                plan.primary
                  ? { background: "#D4775A", color: "#1C1A17" }
                  : { border: "1px solid rgba(250,248,244,0.2)", color: "#FAF8F4" }
              }
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="text-[#FAF8F4]/30 text-xs mt-6">No credit card required &middot; Cancel anytime &middot; 14-day free trial</p>
    </section>
  );
}
```

- [ ] **Step 6: Write Footer**

```tsx
// components/landing/Footer.tsx
export function Footer() {
  return (
    <footer className="py-8 px-6 text-center" style={{ background: "#0F0D0A" }}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-[#D4775A] flex items-center justify-center text-[10px] font-extrabold text-[#0F0D0A]">J</div>
        <span className="text-[#FAF8F4]/50 text-xs font-medium">Jarvis</span>
      </div>
      <p className="text-[#FAF8F4]/30 text-xs">Built with 🧠 by Madhav</p>
    </footer>
  );
}
```

- [ ] **Step 7: Assemble landing page**

```tsx
// app/page.tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { Philosophy } from "@/components/landing/Philosophy";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#1C1A17" }}>
      <LandingNav />
      <Hero />
      <FeatureBento />
      <Philosophy />
      <Pricing />
      <Footer />
    </div>
  );
}
```

- [ ] **Step 8: Verify landing page renders**

```bash
npm run dev
```

Open http://localhost:3000. Should see dark cinematic landing page with hero, bento features, philosophy quote, pricing, and footer.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: landing page — hero with CSS brain, bento grid, philosophy, pricing, footer"
```

---

## Task 7: App Shell — Nav Rail + AI Chat Panel + Layout

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `components/app/NavRail.tsx`
- Create: `components/app/AIChatPanel.tsx`

- [ ] **Step 1: Write NavRail**

```tsx
// components/app/NavRail.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { House, MessageSquare, Calendar, BookOpen, FileText, Target, Dna, BarChart3, Command } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  House, MessageSquare, Calendar, BookOpen, FileText, Target, Dna, BarChart3,
};

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="w-14 bg-ink flex flex-col items-center py-3 gap-1.5 flex-shrink-0" aria-label="Main navigation">
      {/* Logo */}
      <Link href="/" className="w-9 h-9 rounded-[10px] bg-terra flex items-center justify-center font-extrabold text-ink mb-3">
        J
      </Link>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon];
        const active = pathname.startsWith(item.href);
        return (
          <Tooltip key={item.id} content={item.label} side="right">
            <Link
              href={item.href}
              aria-label={item.label}
              className={clsx(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                active ? "bg-white/[0.12]" : "hover:bg-white/[0.08] opacity-50 hover:opacity-80"
              )}
            >
              {Icon && <Icon size={18} className="text-[#FAF8F4]" />}
            </Link>
          </Tooltip>
        );
      })}

      <div className="flex-1" />

      {/* Cmd+K */}
      <button
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/10 text-white/30 text-xs hover:bg-white/[0.08] transition-colors"
        aria-label="Command palette"
      >
        <Command size={14} />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-terra flex items-center justify-center text-[11px] font-bold text-ink mt-1">
        MM
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Write AIChatPanel (collapsible)**

```tsx
// components/app/AIChatPanel.tsx
"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { clsx } from "clsx";
import { ChevronLeft, Paperclip, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useModeContext } from "@/lib/providers";

interface AIChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AIChatPanel({ collapsed, onToggle }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const { isDemoMode } = useModeContext();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="w-1 bg-terra hover:w-10 transition-all group flex items-center justify-center flex-shrink-0"
        aria-label="Open Jarvis AI panel"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-bold">J</span>
      </button>
    );
  }

  return (
    <aside className="w-[280px] bg-surface-subtle border-l border-border flex flex-col flex-shrink-0" aria-label="Jarvis AI">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-terra flex items-center justify-center text-xs font-bold text-ink">J</div>
          <span className="text-sm font-semibold text-primary">Jarvis AI</span>
          {isDemoMode && <Badge color="dusk">DEMO</Badge>}
        </div>
        <button onClick={onToggle} className="text-muted hover:text-secondary transition-colors" aria-label="Collapse panel">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* PEARL insight placeholder */}
      <div className="mx-3 mt-3 p-3 rounded-[10px] bg-terra/[0.08] border border-terra/15">
        <p className="text-[10px] font-semibold text-terra tracking-wide">PEARL INSIGHT</p>
        <p className="text-xs text-primary mt-1 leading-relaxed">
          You focus best on math in the morning. I&apos;ve frontloaded calculus tasks before 11 AM.
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Placeholder messages */}
        <div className="bg-surface-muted text-primary p-2.5 rounded-[14px_14px_14px_4px] text-xs leading-relaxed">
          Good morning! You&apos;re 40% through today&apos;s plan. The integration practice is up next — want me to pull relevant materials from your uploaded notes?
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 bg-surface-card border border-border rounded-xl px-3 py-2">
          <Paperclip size={14} className="text-muted flex-shrink-0" />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Jarvis anything..."
            rows={1}
            className="flex-1 bg-transparent text-xs text-primary placeholder:text-muted resize-none outline-none"
          />
          <button
            className={clsx(
              "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors",
              input.trim() ? "bg-terra text-white" : "bg-surface-muted text-muted"
            )}
          >
            <ArrowUp size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Write app layout (Command Center shell)**

```tsx
// app/(app)/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { NavRail } from "@/components/app/NavRail";
import { AIChatPanel } from "@/components/app/AIChatPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Cmd+J to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setChatCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen flex bg-surface-canvas">
      <NavRail />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AIChatPanel collapsed={chatCollapsed} onToggle={() => setChatCollapsed((prev) => !prev)} />
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder dashboard page**

```tsx
// app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="p-7">
      <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
      <p className="text-sm text-secondary mt-1">Coming in Task 8...</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify app shell**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard. Should see: dark nav rail on left with Jarvis logo + 8 icons, main content area in center, collapsible AI chat panel on right. Press Cmd+J to toggle the panel.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: app shell — nav rail, collapsible AI chat panel, Cmd+J toggle"
```

---

## Task 8: Dashboard — Greeting + Stats Strip + Schedule Timeline

**Files:**
- Create: `components/app/DailyGreeting.tsx`
- Create: `components/app/StatsStrip.tsx`
- Create: `components/app/TaskBlock.tsx`
- Create: `components/app/ScheduleTimeline.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write DailyGreeting**

```tsx
// components/app/DailyGreeting.tsx
"use client";

import { clsx } from "clsx";
import { DEMO_USER } from "@/lib/constants";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

interface DailyGreetingProps {
  taskCount: number;
  estimatedMinutes: number;
}

export function DailyGreeting({ taskCount, estimatedMinutes }: DailyGreetingProps) {
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-[22px] font-bold text-primary tracking-tight">
          {getGreeting()}, {DEMO_USER.name}
        </h1>
        <p className="text-sm text-secondary mt-0.5">
          {formatDate()} &middot; {taskCount} tasks today &middot; {timeStr} estimated
        </p>
      </div>
      <div className="flex gap-1">
        {["Today", "Week", "Month"].map((label, i) => (
          <button
            key={label}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              i === 0 ? "bg-terra text-white" : "bg-surface-muted text-secondary hover:bg-surface-subtle"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

```

- [ ] **Step 2: Write StatsStrip**

```tsx
// components/app/StatsStrip.tsx
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ClipboardList, Timer, Flame } from "lucide-react";

interface StatsStripProps {
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;
  streakDays: number;
}

export function StatsStrip({ tasksCompleted, tasksTotal, focusMinutes, streakDays }: StatsStripProps) {
  const pct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const hours = Math.floor(focusMinutes / 60);
  const mins = focusMinutes % 60;

  return (
    <div className="flex gap-3 mb-5">
      <Card className="flex-1 p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-dusk/10 flex items-center justify-center">
          <ClipboardList size={18} className="text-dusk" />
        </div>
        <div>
          <p className="text-xl font-bold text-dusk">{tasksCompleted} / {tasksTotal}</p>
          <p className="text-xs text-secondary">Tasks completed</p>
        </div>
        <div className="ml-auto">
          <ProgressRing value={pct} />
        </div>
      </Card>

      <Card className="flex-1 p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-sage/10 flex items-center justify-center">
          <Timer size={18} className="text-sage" />
        </div>
        <div>
          <p className="text-xl font-bold text-sage">{hours}h {mins}m</p>
          <p className="text-xs text-secondary">Focus time today</p>
        </div>
      </Card>

      <Card className="flex-1 p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-gold/10 flex items-center justify-center">
          <Flame size={18} className="text-gold" />
        </div>
        <div>
          <p className="text-xl font-bold text-gold">{streakDays} days</p>
          <p className="text-xs text-secondary">Current streak</p>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write TaskBlock**

```tsx
// components/app/TaskBlock.tsx
"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ScheduleTask } from "@/lib/types";

interface TaskBlockProps {
  task: ScheduleTask;
  isActive?: boolean;
  progressMinutes?: number;
}

export function TaskBlock({ task, isActive, progressMinutes }: TaskBlockProps) {
  const isCompleted = task.status === "completed";
  const timeLabel = task.start_time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const remaining = isActive && progressMinutes != null ? task.duration_minutes - progressMinutes : null;

  return (
    <div className={clsx("flex gap-3 items-stretch", isCompleted && "opacity-50")}>
      {/* Time */}
      <div className="w-[52px] flex flex-col items-end justify-center flex-shrink-0">
        <span className={clsx("text-xs font-medium", isActive ? "text-dusk font-semibold" : "text-primary")}>
          {timeLabel.split(" ")[0]}
        </span>
      </div>

      {/* Block */}
      <div
        className={clsx(
          "flex-1 border-l-[3px] rounded-r-[10px] px-4 py-3 flex items-center justify-between",
          isCompleted && "bg-sage/[0.08] border-sage",
          isActive && "bg-dusk/[0.08] border-dusk shadow-md",
          !isCompleted && !isActive && `bg-[${task.color}]/[0.06] border-l-[${task.color}]`,
        )}
        style={!isCompleted && !isActive ? { borderLeftColor: task.color, backgroundColor: `${task.color}0F` } : undefined}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx("text-sm font-medium text-primary", isCompleted && "line-through")}>
              {task.title}
            </span>
            {isActive && <Badge color="dusk">IN PROGRESS</Badge>}
          </div>
          <p className="text-xs text-secondary mt-0.5">
            {task.duration_minutes} min
            {isCompleted && task.completed_at && ` · Completed at ${task.completed_at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
            {isActive && remaining != null && ` · ${remaining} min remaining`}
            {!isCompleted && !isActive && task.deadline_hint && ` · ${task.deadline_hint}`}
          </p>
          {isActive && (
            <div className="mt-1.5 h-[3px] bg-border rounded-full w-48">
              <div
                className="h-full bg-dusk rounded-full transition-all duration-500"
                style={{ width: `${progressMinutes != null ? (progressMinutes / task.duration_minutes) * 100 : 0}%` }}
              />
            </div>
          )}
        </div>

        {isCompleted && (
          <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center flex-shrink-0">
            <Check size={14} className="text-white" />
          </div>
        )}
        {isActive && (
          <Button size="sm" variant="primary" className="bg-dusk hover:bg-dusk/90 ml-2 flex-shrink-0">
            Open Workspace
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write ScheduleTimeline**

```tsx
// components/app/ScheduleTimeline.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { TaskBlock } from "./TaskBlock";
import type { ScheduleTask } from "@/lib/types";

interface ScheduleTimelineProps {
  tasks: ScheduleTask[];
}

export function ScheduleTimeline({ tasks }: ScheduleTimelineProps) {
  // Find active task (first non-completed)
  const activeIndex = tasks.findIndex((t) => t.status === "pending" || t.status === "in_progress");

  return (
    <Card className="p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary">Today&apos;s Schedule</h2>
        <button className="text-xs font-medium text-terra hover:underline">View full calendar &rarr;</button>
      </div>

      {/* NOW indicator */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold text-terra w-[52px] text-right">NOW</span>
        <div className="flex-1 h-[2px] bg-terra relative">
          <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-terra" />
        </div>
      </div>

      {/* Task blocks */}
      <div className="space-y-2 mt-3">
        {tasks.map((task, i) => (
          <TaskBlock
            key={task.task_id}
            task={task}
            isActive={i === activeIndex}
            progressMinutes={i === activeIndex ? 13 : undefined}
          />
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Assemble dashboard with demo data**

```tsx
// app/(app)/dashboard/page.tsx
"use client";

import { DailyGreeting } from "@/components/app/DailyGreeting";
import { StatsStrip } from "@/components/app/StatsStrip";
import { ScheduleTimeline } from "@/components/app/ScheduleTimeline";
import type { ScheduleTask } from "@/lib/types";

// Demo schedule data for dashboard
const NOW = new Date();
const today = (hour: number, min: number) => {
  const d = new Date(NOW);
  d.setHours(hour, min, 0, 0);
  return d;
};

const DEMO_TASKS: ScheduleTask[] = [
  { task_id: "task_1", title: "Calculus: Review Ch.4 Derivatives", start_time: today(9, 0), end_time: today(9, 25), duration_minutes: 25, status: "completed", completed_at: today(9, 23), color: "#6B7FB5" },
  { task_id: "task_2", title: "History: Research & Outline", start_time: today(9, 30), end_time: today(9, 55), duration_minutes: 25, status: "completed", completed_at: today(9, 52), color: "#4A7B6B" },
  { task_id: "task_3", title: "Calculus: Practice Integration", start_time: today(10, 0), end_time: today(10, 25), duration_minutes: 25, status: "in_progress", color: "#6B7FB5" },
  { task_id: "task_4", title: "History: Write Introduction", start_time: today(10, 30), end_time: today(10, 55), duration_minutes: 25, status: "pending", color: "#D4775A", deadline_hint: "Essay due Thursday" },
  { task_id: "task_5", title: "Calculus: Integration by Parts", start_time: today(11, 0), end_time: today(11, 25), duration_minutes: 25, status: "pending", color: "#6B7FB5", deadline_hint: "Exam Friday" },
];

export default function DashboardPage() {
  const completed = DEMO_TASKS.filter((t) => t.status === "completed").length;
  const totalMinutes = DEMO_TASKS.reduce((sum, t) => sum + t.duration_minutes, 0);
  const focusMinutes = DEMO_TASKS.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.duration_minutes, 0) + 13; // 13 min into current

  return (
    <div className="p-7 max-w-4xl">
      <DailyGreeting taskCount={DEMO_TASKS.length} estimatedMinutes={totalMinutes} />
      <StatsStrip tasksCompleted={completed} tasksTotal={DEMO_TASKS.length} focusMinutes={focusMinutes} streakDays={7} />
      <ScheduleTimeline tasks={DEMO_TASKS} />
    </div>
  );
}
```

- [ ] **Step 6: Verify dashboard**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard. Should see: "Good morning, Madhav" greeting, 3 stat cards (2/5 tasks with progress ring, 1h 38m focus, 7 days streak), schedule timeline with 2 completed (faded, strikethrough), 1 active (blue highlight, progress bar, Open Workspace button), 2 upcoming with deadline hints.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: dashboard — greeting, stats strip, schedule timeline with task blocks"
```

---

## Task 9: Chat Page — Streaming Hook + Full Chat UI

**Files:**
- Create: `lib/hooks/useJarvisChat.ts`
- Create: `components/app/ThinkingProcess.tsx`
- Create: `components/app/PromptSelector.tsx`
- Create: `app/(app)/chat/page.tsx`

- [ ] **Step 1: Write useJarvisChat hook (demo mode focus)**

```ts
// lib/hooks/useJarvisChat.ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { JarvisMessage, JarvisStreamState, ChatResponse } from "@/lib/types";
import { INITIAL_STREAM_STATE } from "@/lib/types";
import { sendChat, type ChatRequest } from "@/lib/api";
import { DEMO_USER } from "@/lib/constants";
import { saveChatMessages, loadChatMessages, getConversationId } from "@/lib/store";

export function useJarvisChat() {
  const conversationId = useRef(getConversationId());
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [streamState, setStreamState] = useState<JarvisStreamState>(INITIAL_STREAM_STATE);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load persisted messages on mount
  useEffect(() => {
    const stored = loadChatMessages(conversationId.current);
    if (stored.length > 0) setMessages(stored);
  }, []);

  // Persist messages on change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatMessages(conversationId.current, messages);
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string, options?: { modelMode?: "auto" | "4b" | "27b" }) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    const userMsg: JarvisMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now(),
      conversationId: conversationId.current,
    };

    // Add placeholder assistant message
    const assistantMsg: JarvisMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: Date.now(),
      conversationId: conversationId.current,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setStreamState({ ...INITIAL_STREAM_STATE, phase: "connecting" });

    try {
      const req: ChatRequest = {
        user_prompt: content,
        user_id: DEMO_USER.id,
        conversation_id: conversationId.current,
        model_mode: options?.modelMode ?? "auto",
      };

      // For now, use non-streaming (demo mode). Live streaming (SSE) is a Tier 2 enhancement.
      const response = await sendChat(req);

      // Simulate streaming phases for visual effect
      setStreamState((s) => ({ ...s, phase: "reasoning", reasoning: response.thinking_process ?? "" }));
      await new Promise((r) => setTimeout(r, 400));
      setStreamState((s) => ({ ...s, phase: "responding", message: response.message }));
      await new Promise((r) => setTimeout(r, 300));
      setStreamState((s) => ({ ...s, phase: "complete" }));

      // Update assistant message with full response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: response.message,
                reasoning: response.thinking_process,
                response,
                isStreaming: false,
              }
            : m
        )
      );
    } catch (err) {
      setStreamState((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: "Sorry, something went wrong. Please try again.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamState(INITIAL_STREAM_STATE);
  }, []);

  return { messages, streamState, isStreaming, sendMessage, clearMessages, conversationId: conversationId.current };
}
```

- [ ] **Step 2: Write ThinkingProcess**

```tsx
// components/app/ThinkingProcess.tsx
"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

interface ThinkingProcessProps {
  reasoning: string;
  isStreaming?: boolean;
  durationSec?: number;
}

export function ThinkingProcess({ reasoning, isStreaming, durationSec }: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
      >
        <span>
          {isStreaming ? "🧠 Thinking" : `🧠 Thought for ${durationSec ?? "?"}s`}
        </span>
        {isStreaming && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-terra animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        )}
        <ChevronDown size={12} className={clsx("transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="mt-1.5 pl-3 border-l-2 border-border text-xs text-muted leading-relaxed whitespace-pre-wrap">
          {reasoning}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write PromptSelector**

```tsx
// components/app/PromptSelector.tsx
"use client";

import { useState } from "react";
import { DEMO_PROMPTS } from "@/lib/demoData";
import { clsx } from "clsx";

const colorMap: Record<string, string> = {
  terra: "border-terra/30 hover:border-terra/60 text-terra",
  dusk: "border-dusk/30 hover:border-dusk/60 text-dusk",
  sage: "border-sage/30 hover:border-sage/60 text-sage",
  gold: "border-gold/30 hover:border-gold/60 text-gold",
};

interface PromptSelectorProps {
  onSelect: (prompt: string) => void;
}

export function PromptSelector({ onSelect }: PromptSelectorProps) {
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {DEMO_PROMPTS.filter((p) => !usedIds.has(p.id)).map((prompt) => (
        <button
          key={prompt.id}
          onClick={() => {
            setUsedIds((prev) => new Set(prev).add(prompt.id));
            onSelect(prompt.prompt);
          }}
          className={clsx(
            "border rounded-xl px-4 py-3 text-left max-w-[200px] transition-all hover:shadow-sm",
            colorMap[prompt.color]
          )}
        >
          <p className="text-xs font-semibold">{prompt.title}</p>
          <p className="text-[10px] text-secondary mt-0.5">{prompt.description}</p>
          {prompt.hint && (
            <p className="text-[9px] text-muted mt-1 italic">{prompt.hint}</p>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write Chat page**

```tsx
// app/(app)/chat/page.tsx
"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { clsx } from "clsx";
import { Paperclip, ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useJarvisChat } from "@/lib/hooks/useJarvisChat";
import { ThinkingProcess } from "@/components/app/ThinkingProcess";
import { PromptSelector } from "@/components/app/PromptSelector";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/app/EmptyState";

export default function ChatPage() {
  const { messages, streamState, isStreaming, sendMessage } = useJarvisChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamState.message]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyState
              icon="💬"
              headline="What's on your mind?"
              subtitle="Type anything — exams, deadlines, projects. Jarvis will figure out the rest."
            />
            <PromptSelector onSelect={(prompt) => sendMessage(prompt)} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[80%] px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-terra text-white rounded-[14px_14px_4px_14px]"
                      : "bg-surface-muted text-primary rounded-[14px_14px_14px_4px]"
                  )}
                >
                  {msg.role === "assistant" && msg.reasoning && (
                    <ThinkingProcess
                      reasoning={msg.reasoning}
                      isStreaming={msg.isStreaming && streamState.phase === "reasoning"}
                    />
                  )}

                  {msg.isStreaming && !msg.content ? (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-terra animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-primary prose-p:text-primary prose-strong:text-primary prose-a:text-dusk">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Generation metrics */}
                  {msg.response?.generation_metrics && !msg.isStreaming && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex gap-3 text-[10px] text-muted">
                      <span>{msg.response.generation_metrics.model}</span>
                      {msg.response.generation_metrics.tokens_per_second && (
                        <span>{msg.response.generation_metrics.tokens_per_second} tok/s</span>
                      )}
                      {msg.response.generation_metrics.total_time_ms && (
                        <span>{(msg.response.generation_metrics.total_time_ms / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  )}

                  {/* Clarification options */}
                  {msg.response?.clarification_options && !msg.isStreaming && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.response.clarification_options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => sendMessage(opt)}
                          className="px-3 py-1 border border-terra/30 text-terra rounded-full text-xs hover:bg-terra/10 transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <button className="text-muted hover:text-secondary p-2 transition-colors flex-shrink-0">
            <Paperclip size={18} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Jarvis what's on your mind..."
            rows={1}
            className="flex-1 bg-surface-muted text-primary text-sm px-4 py-2.5 rounded-xl border border-border placeholder:text-muted resize-none outline-none focus:border-border-strong transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={clsx(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
              input.trim() && !isStreaming ? "bg-terra text-white" : "bg-surface-muted text-muted"
            )}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify chat page**

```bash
npm run dev
```

Navigate to http://localhost:3000/chat. Should see: empty state with prompt selector cards. Click "Plan a Complex Task" → user message appears right-aligned in Terra, then Jarvis responds with the full schedule message including thinking process (collapsed), generation metrics, and markdown formatting.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: chat page — useJarvisChat hook, streaming simulation, thinking process, prompt selector, markdown rendering"
```

---

## Task 10: Final Polish + Verify End-to-End Demo Flow

**Files:**
- Minor fixes across existing files

- [ ] **Step 1: Add .gitignore entries**

```bash
# Ensure .superpowers/ is in .gitignore
echo ".superpowers/" >> /Users/madhav/Jarvis-cursor/jarvis-frontend/.gitignore
```

- [ ] **Step 2: Full end-to-end walkthrough**

1. Open http://localhost:3000 → Landing page (dark, hero with brain orb, bento features, pricing)
2. Click "Get Started" → Navigate to /dashboard
3. See Command Center: nav rail left, dashboard center (greeting + stats + timeline), AI chat panel right
4. Click Chat in nav rail → Navigate to /chat
5. See empty state with 4 prompt cards
6. Click "Plan a Complex Task" → Watch Jarvis respond with schedule + thinking process + metrics
7. Press Cmd+J → AI panel toggles
8. Click Jarvis logo in nav → Navigate back to landing page

Verify all above works without errors in the console.

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "feat: Tier 1 complete — landing page + Command Center + chat with demo mode"
```

---

## Tier 2 Tasks (Day 2-3, if time allows)

These are NOT detailed here but outlined for the next implementation cycle:

- **Task 11:** Onboarding flow — `/onboarding` page with cinematic intro + brain dump + transition to Command Center
- **Task 12:** Schedule page — FullCalendar integration with Jarvis theming, task events, drag-and-drop
- **Task 13:** Pipeline Story — GSAP ScrollTrigger pinned section on landing page (or simpler fallback)
- **Task 14:** Command Palette — Cmd+K overlay with fuzzy search
- **Task 15:** Architecture page — Mermaid diagram viewer with zoom/pan/fullscreen
- **Task 16:** Live demo section — Embedded brain dump on landing page
- **Task 17:** Task completion animation — Checkbox spring bounce + confetti

Each of these would follow the same task structure (files, steps, code, verify, commit).
