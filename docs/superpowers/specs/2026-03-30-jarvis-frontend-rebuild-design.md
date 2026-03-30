# Jarvis Frontend Rebuild — Design Spec

**Date:** 2026-03-30
**Goal:** Rebuild the jarvis-frontend to properly integrate with the Jarvis Engine backend (Phase 1A-1E), fix all regressions from Jarvis-Demo, and deliver a pitch-ready product by April 1.
**Backend Spec:** `Jarvis-Engine/docs/superpowers/specs/2026-03-28-jarvis-architecture-reset-design.md`
**Backend Plans:** Phase 1A (Foundation) → 1B (Memory) → 1C (Documents) → 1D (PEARL) → 1E (Stabilize)

---

## Priority Order

1. **Phase 1: Fix Broken Features** — Chat streaming, theme, sessions, metrics (MUST for pitch)
2. **Phase 2: Redesign App UX** — Dashboard, draft review, memory panel, workspace, AI panel (MUST for pitch)
3. **Phase 3: Landing Page Enhancement** — GSAP scroll animations, pipeline section, interactive demo (STRETCH — implement if time permits after Phase 1+2)

> **Scope note:** Phase 3 is a stretch goal. If time runs short, the existing landing page (brain orb + features + pricing) ships as-is. Phase 1 and 2 are the pitch-critical deliverables.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    jarvis-frontend                       │
│                    Next.js 14 + React 18                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LANDING PAGE (public)                                  │
│  ├── Hero (brain orb + aurora)                         │
│  ├── How It Works (GSAP ScrollTrigger pipeline)        │
│  ├── Feature Bento Grid                                │
│  ├── Interactive Demo                                  │
│  ├── Philosophy + Pricing + Footer                     │
│  └── Scroll-reactive logo (J ↔ Jarvis)                │
│                                                         │
│  APP INTERIOR (authenticated)                           │
│  ├── NavRail (56px, icon-only, all pages)              │
│  ├── Main Content (flex-1)                             │
│  │   ├── Dashboard (/dashboard)                        │
│  │   ├── Chat (/chat) — with SessionPanel left         │
│  │   ├── Schedule (/schedule)                          │
│  │   ├── Workspace (/workspace/{taskId})               │
│  │   ├── Documents (/documents)                        │
│  │   └── Habits (/habits)                              │
│  └── AI Chat Panel (280px right, collapsible, Cmd+J)   │
│                                                         │
│  SHARED STATE                                           │
│  ├── ThemeContext (light/dark, localStorage)            │
│  ├── ConversationContext (conversation_id, shared)      │
│  └── DraftContext (active draft_id, negotiation state) │
│                                                         │
│  API LAYER                                              │
│  ├── lib/api.ts — SSE streaming + REST calls           │
│  ├── lib/types.ts — mirrors backend Pydantic schemas   │
│  └── lib/hooks/ — useJarvisChat, useDraft, etc.        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Jarvis Engine Backend (localhost:8000)                  │
│  POST /api/v1/chat/stream (SSE)                        │
│  Full API surface — see API Contract section            │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Fix Broken Features

### 1.1 SSE Streaming Integration

**The most critical fix.** Replace the broken `lib/api.ts` with proper SSE parsing.

**Backend sends SSE in this format:**
```
event: phase
data: {"phase": "decomposing", "goal": "...", "model": "qwen-27b"}

event: step
data: {"intent": "PLAN_DAY", "stage": "decomposition_complete", "model_mode": "auto", "synthesis_model": "qwen-4b"}

event: thinking
data: {"token": "Let me break"}

event: message
data: {"token": " this down into"}

event: complete
data: {"intent": "PLAN_DAY", "message": "...", "schedule": {...}, "draft_id": "...", ...}

event: error
data: {"error": "LLM validation failed", "fallback": true}
```

**Note:** The `step` event indicates pipeline stage completion with metadata about intent detection, model selection, and synthesis model. Frontend must handle this for accurate phase display.

**Frontend SSE parser (`lib/api.ts`):**
```typescript
async function sendChatStream(
  prompt: string,
  handlers: {
    onPhase: (phase: string, data: any) => void;
    onThinking: (token: string) => void;
    onMessage: (token: string) => void;
    onComplete: (response: ChatResponse) => void;
    onError: (error: string) => void;
  },
  options: {
    conversationId?: string;
    modelMode?: 'auto' | '4b' | '27b';
    fileBase64?: string;
    mediaType?: string;
    confirmBeforeSchedule?: boolean;
    draftSchedule?: any;
  }
) {
  const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_prompt: prompt,
      user_id: 'demo',
      conversation_id: options.conversationId,
      model_mode: options.modelMode || 'auto',
      file_base64: options.fileBase64,
      media_type: options.mediaType,
      confirm_before_schedule: options.confirmBeforeSchedule ?? true,
      draft_schedule: options.draftSchedule,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event.split('\n');
      let eventType = '';
      let eventData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7);
        if (line.startsWith('data: ')) eventData = line.slice(6);
      }

      if (!eventType || !eventData) continue;
      const parsed = JSON.parse(eventData);

      switch (eventType) {
        case 'phase': handlers.onPhase(parsed.phase, parsed); break;
        case 'step': handlers.onPhase(parsed.stage, parsed); break;  // Pipeline stage completion
        case 'thinking': handlers.onThinking(parsed.token); break;
        case 'message': handlers.onMessage(parsed.token); break;
        case 'complete': handlers.onComplete(parsed); break;
        case 'error': handlers.onError(parsed.error); break;
      }
    }
  }
}
```

**ChatRequest body (matches backend Pydantic schema):**
```typescript
interface ChatRequest {
  user_prompt: string;
  user_id: string;
  conversation_id?: string;
  model_mode?: 'auto' | '4b' | '27b';
  file_base64?: string;
  media_type?: 'pdf' | 'image';
  file_name?: string;
  confirm_before_schedule?: boolean;  // Pause after decomposition for review
  draft_schedule?: any;               // Carry forward draft for modifications
  day_start_hour?: number;
  deadline_override?: string;
}
```

### 1.2 Streaming Phase Display (Fun Names)

Configurable phase names stored in `lib/constants.ts`:

```typescript
export const PHASE_NAMES: Record<string, string> = {
  connecting:       "Brewing your plan...",
  extracting:       "Digesting your brain dump...",
  classifying:      "Aha, figuring out what you need...",
  decomposing:      "Breaking it into bite-sized pieces...",
  translating:      "Reading your habits...",
  scheduling:       "Crunching the numbers...",
  reasoning:        "Putting on my thinking cap...",
  responding:       "Crafting your response...",
  synthesizing:     "Adding the finishing touches...",
  complete:         "Voila!",
};

// Users can override these in localStorage
export function getPhaseDisplayName(phase: string): string {
  const custom = localStorage.getItem('jarvis-phase-names');
  if (custom) {
    const parsed = JSON.parse(custom);
    if (parsed[phase]) return parsed[phase];
  }
  return PHASE_NAMES[phase] || phase;
}
```

Each phase shows elapsed time: `"Brewing your plan... 301ms ✓"`

### 1.3 Theme Toggle Fix

**Root cause:** The inline script in `app/layout.tsx` and the `ThemeProvider` both try to set `data-theme` on `<html>`, causing conflicts.

**Fix:** Single source of truth:
- `app/layout.tsx` inline script: ONLY prevents flash on first load (reads localStorage, sets attribute before React hydrates)
- `ThemeProvider`: Owns the state after hydration. Sets `data-theme` on mount and on toggle.
- Both read/write the same key: `jarvis-theme`

**CSS variables** already work (verified in `globals.css` — both `:root` and `[data-theme="dark"]` selectors exist).

### 1.4 Chat Session Panel (Chat Page Only)

New component: `components/app/ChatSessionPanel.tsx`

**Position:** Left side of chat page, ~260px, collapsible.

**Data source:** `GET /api/v1/sessions/?user_id=demo&limit=30`

**Features:**
- "New Chat" button at top (generates new `conversation_id`, clears messages)
- Session list: title + relative timestamp ("just now", "5m ago", "yesterday")
- Click session → `GET /api/v1/sessions/{id}?user_id=demo` → loads messages into chat
- Archive button (hover reveal) → `DELETE /api/v1/sessions/{id}`
- Active session highlighted
- Collapsible via hamburger icon
- Mobile: full-width drawer overlay

**Session continuity:**
- On first message: backend returns `conversation_id` in `ChatResponse`
- Store in `ConversationContext` (React context) + localStorage (`jarvis-conversation-id`)
- Send `conversation_id` in every subsequent `ChatRequest`
- Backend uses it to inject last 10 messages into LLM context

### 1.5 Generation Metrics Bar

Below each assistant message, a subtle metrics strip:

```
TTFT: 1.2s | 24.3 tok/s | qwen3.5-27b | Total: 3.4s
```

**Data source:** `ChatResponse.generation_metrics`:
```typescript
interface GenerationMetrics {
  total_tokens: number;
  total_time_s: number;
  tok_per_sec: number;
  ttft_ms: number | null;
  model: string;
}
```

**Toggle:** Stored in localStorage: `jarvis-show-metrics` (default: `true`).
A settings toggle in the user menu controls this.

### 1.6 Conversation ID Persistence

**Critical for multi-turn context.** The `useJarvisChat` hook must:
1. Store `conversation_id` from `ChatResponse.conversation_id`
2. Send it in every subsequent request
3. On "New Chat": generate new UUID, clear messages, update context
4. On session load: set `conversation_id` from loaded session

---

## Phase 2: Redesign App UX

### 2.1 Dashboard (Command Center)

**Route:** `/dashboard` (default after "Get Started" on landing page)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  NavRail │                Dashboard                     │
│  (56px)  │                                              │
│          │  ┌──────────────────────────────────────────┐│
│          │  │ Good morning, Madhav     Today|Week|Month││
│          │  │ 3 tasks, ~75 min deep work               ││
│          │  ├──────────────────────────────────────────┤│
│          │  │ [Tasks 2/5] [Focus 42m] [Streak 7d]     ││
│          │  │ [Patterns: 2 learned]                    ││
│          │  ├──────────────────────────────────────────┤│
│          │  │ ACTIVE DRAFT (if exists)                 ││
│          │  │ "You have a pending schedule" [Review →] ││
│          │  ├──────────────────────────────────────────┤│
│          │  │ JARVIS NOTICED (PEARL insight)           ││
│          │  │ "You're most productive around 2 PM..." ││
│          │  ├──────────────────────────────────────────┤│
│          │  │ TODAY'S SCHEDULE                         ││
│          │  │ ── 9:00 AM ──────────────               ││
│          │  │ │ Study CNNs (25m) [IN PROGRESS]        ││
│          │  │ ── NOW ──────────────────                ││
│          │  │ │ Backprop problems (25m) [PENDING]     ││
│          │  │ ── 10:30 AM ─────────────               ││
│          │  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Data sources:**
- Tasks: `GET /api/v1/tasks/?user_id=demo`
- Schedule time computation: `wall_time = new Date(horizon_start).getTime() + start_min * 60000`
- PEARL insights: returned in `ChatResponse` or from a dedicated endpoint if available
- Active draft: check for `draft_id` in latest response or `GET /api/v1/drafts/{draft_id}`
- Stats: computed from tasks data (completed count, total focus minutes, streak from consecutive days)

**"Patterns: X learned" tooltip:** "Jarvis observes how you work and adapts your schedule. These are habits I've picked up from your behavior."

**Task cards in timeline:**
- Color-coded left border by goal/subject (auto-assigned from palette)
- Click → navigates to `/workspace/{taskId}`
- Status badges: IN PROGRESS (terra), PENDING (muted), COMPLETED (sage, with checkmark)
- Progress bar on active task

**Quick brain dump input:** Optional — text input at bottom of dashboard: "What's on your plate?" → submits to `/chat` and navigates there.

### 2.2 Chat Page — Full Pipeline Experience

**Route:** `/chat`

**Layout (3-column):**
```
┌──────────────┬─────────────────────────────┬──────────────┐
│ Session Panel│      Chat Messages          │  AI Panel    │
│   (~260px)   │      (flex-1)               │  (280px)     │
│  collapsible │                             │ collapsible  │
│              │  ┌───────────────────────┐  │              │
│  [New Chat]  │  │ Model: Auto|4B|27B   │  │  Jarvis AI   │
│              │  ├───────────────────────┤  │              │
│  Session 1   │  │                       │  │  INSIGHT:    │
│  Session 2   │  │  Messages area        │  │  "You focus  │
│  Session 3   │  │  (scrollable)         │  │   best in    │
│  ...         │  │                       │  │   25-min     │
│              │  │                       │  │   blocks"    │
│              │  │                       │  │              │
│              │  ├───────────────────────┤  │  [Ask Jarvis]│
│              │  │ [📎] Tell Jarvis...  [↑]│  │              │
│              │  └───────────────────────┘  │              │
└──────────────┴─────────────────────────────┴──────────────┘
```

**Model Mode Selector:** Top of chat area — `Auto | 4B SLM | 27B` toggle buttons.
- Auto: smart pipeline routing (default)
- 4B SLM: force fast classification (quick answers)
- 27B: bypass pipeline, direct reasoning (heavy-duty)

**Message Display — Per Assistant Response:**

Each response renders in this order (sections only appear if data present):

1. **Phase progress strip** — fun names + elapsed time per phase
2. **Intent badge** — color-coded pill: "Plan Day" (sage), "Edit Task" (dusk), "Chat" (ink), etc.
   - Known intents: mapped to palette colors
   - Unknown/new intents: auto-assigned from rotating palette
3. **Thinking process** — collapsible section, shows `<think>` block content
4. **Main message** — markdown rendered (react-markdown + remark-gfm), streaming indicator `▌`
5. **Inline habit staging** — if habits detected in user's message:
   ```
   New habit detected: "No work before 11 AM"
   [Save as Constraint] [Ignore]
   ```
6. **Task decomposition preview** — if `execution_graph` present (collapsible):
   - Lists each TaskChunk: title, duration, difficulty bar, completion criteria
   - Shows cognitive load estimate (intrinsic + germane)
7. **Draft review UI** — if `draft_id` present (see Section 2.3)
8. **Clarification quick-replies** — if `clarification_options` present:
   - Rendered as clickable pill buttons below message
   - Click sends that option as next user message
9. **Action item proposals** — if `action_proposals` present:
   - Cards with description + [Create Task] [Schedule] [Remind Me]
10. **Replan banner** — if `suggested_action === "replan"`:
    - "Schedule may be outdated. [Replan →]"
11. **INFEASIBLE guidance** — if solver returns 422:
    - NOT an error. Show: "Your goals don't fit the available time. Here's what I'd suggest:"
    - Options: "Reduce scope" / "Extend deadline" / "Increase daily cap"
    - Anti-guilt tone — scope mismatch, not user failure
12. **Metrics bar** — TTFT, tok/sec, model, total time (toggleable)

**File upload:**
- Paperclip icon in input area
- Accepts: PDF, PNG, JPEG
- MIME type validation before sending
- Converts to base64 → sends as `file_base64` + `media_type` in ChatRequest
- Shows upload preview with filename

**Pending calendar approval:**
- When `CALENDAR_SYNC` intent returns pending calendar entries:
  ```
  Timetable extracted from your syllabus:
  ┌────────────────────────────────────┐
  │ Mon/Wed/Fri 2:00-3:00 PM — CS301  │
  │ Tue/Thu 10:00-11:30 AM — MATH201  │
  └────────────────────────────────────┘
  [Approve] [Reject]
  ```
- Approve → `POST /api/v1/ingestion/pending-calendar/{id}/approve`
- Reject → `POST /api/v1/ingestion/pending-calendar/{id}/reject`

### 2.3 Two-Stage Draft Review

When backend returns `awaiting_task_confirmation: true` with an `execution_graph`:

**Stage 1 — Task Preview (before scheduling):**

```
┌──────────────────────────────────────────────┐
│  Your tasks for "Deep Learning Contest"       │
│                                              │
│  1. Study CNNs (25m) ████████░░ 0.6          │
│     Criteria: Understand convolution          │
│     WOOP: If overwhelmed → start with visual │
│     [Edit] [Remove]                          │
│                                              │
│  2. Backprop problems (20m) ██████░░░░ 0.4   │
│     Criteria: Solve 3 problems               │
│     [Edit] [Remove]                          │
│                                              │
│  ... (more tasks)                            │
│                                              │
│  Cognitive Load: Intrinsic ███████░░░ 0.7    │
│                  Germane   █████░░░░░ 0.5    │
│                                              │
│  [Looks good, schedule it →] [Chat to modify]│
└──────────────────────────────────────────────┘
```

- Edit opens inline form: title, duration (min), difficulty (slider 0-1)
- "Looks good" → `POST /api/v1/chat/confirm-schedule` with (optionally edited) tasks
- "Chat to modify" → user types natural language changes → re-decompose

**Stage 2 — Schedule Preview (after OR-Tools solves):**

```
┌──────────────────────────────────────────────┐
│  Draft #d7f2 — Your schedule                 │
│                                              │
│  ░░░░░░░░░░░ 8:00 AM (blocked: sleep)       │
│  ▓▓▓▓▓▓▓▓▓▓▓ 9:00 AM  Study CNNs (25m)     │
│  ░░░░░░░░░░░ 9:25 AM  (break)               │
│  ▓▓▓▓▓▓▓▓▓▓▓ 9:30 AM  Backprop (20m)       │
│  ░░░░░░░░░░░ 9:50 AM  (break)               │
│  ████████████ 10:00 AM Essay outline (25m)   │
│  ▒▒▒▒▒▒▒▒▒▒▒ 2:00-3:00 PM (blocked: class) │
│                                              │
│  Legend: ▓ Task  ░ Break  ▒ Blocked          │
│                                              │
│  [Accept All] [Reject] [Rearrange]           │
└──────────────────────────────────────────────┘
```

**Time computation:** `wall_time = new Date(horizon_start) + start_min * 60000`

**Actions:**
- Accept All → `POST /api/v1/drafts/{draft_id}/accept` → persists to `user_tasks` → navigates to dashboard
- Reject → prompts "What would you change?" → stores reason as memory → generates new approach
- Rearrange → user drags tasks → `PATCH /api/v1/drafts/{draft_id}/tasks/{task_id}` with new times → re-solve
- Edit task → `PATCH /api/v1/drafts/{draft_id}/tasks/{task_id}` with modified fields → re-solve → updated draft

**Draft state management:**
- `DraftContext` stores active `draft_id` and current stage (task_preview | schedule_preview)
- Draft persists across page navigation (stored in context + localStorage)
- "You have a pending draft" banner on dashboard if draft exists

### 2.4 Memory Panel

**Trigger:** Brain icon (🧠) in chat header or AI Panel.

**Position:** Slides in as a right panel overlay (over AI Panel) or modal.

**Data:** Memories are returned in `ChatResponse`. For dedicated display, the panel shows memories extracted from the conversation + any patterns.

**Layout:**
```
┌──────────────────────────────┐
│  Jarvis's Memory    [Close]  │
│                              │
│  CONSTRAINTS (weight: 1.0)   │
│  ┌────────────────────────┐  │
│  │ Class MWF 2-3 PM       │  │
│  │ ████████░░ 95%         │  │
│  │ Source: you told me  [×]│  │
│  └────────────────────────┘  │
│                              │
│  LEARNED PATTERNS (0.9)      │
│  ┌────────────────────────┐  │
│  │ You skip morning tasks  │  │
│  │ ███████░░░ 80%          │  │
│  │ Observed 5x  [×]       │  │
│  │ → Schedule avoids 8 AM  │  │
│  └────────────────────────┘  │
│                              │
│  PREFERENCES (0.8)           │
│  ┌────────────────────────┐  │
│  │ Prefers short tasks     │  │
│  │ ██████░░░░ 70%          │  │
│  │ Source: behavior  [×]   │  │
│  └────────────────────────┘  │
│                              │
│  EVENTS (0.8)                │
│  ┌────────────────────────┐  │
│  │ Finals: June 15         │  │
│  │ █████████░ 90%          │  │
│  │ Source: syllabus  [×]   │  │
│  └────────────────────────┘  │
│                              │
│  GOALS (0.7)                 │
│  FACTS (0.6)                 │
│  FEEDBACK (0.5)              │
│  (collapsed if empty)        │
│                              │
│  Superseded memories shown   │
│  as struck-through with      │
│  "Updated →" link            │
└──────────────────────────────┘
```

**Type-agnostic rendering:** The panel dynamically groups by `memory_type`. New types auto-render with auto-assigned colors from palette rotation. No hardcoded type list in the component.

**Confidence bar:** Visual progress bar, color shifts from muted (low) to sage (high).

**Delete:** Click × → confirmation → removes from memory store.

**Pattern feedback:** For PEARL-inferred patterns, show:
```
"I noticed you skip morning tasks. Should I avoid scheduling then?"
[Yes, avoid mornings] [No, keep scheduling]
```
- Yes → reinforces memory (confidence++, stability++)
- No → supersedes memory

### 2.5 Workspace Page

**Route:** `/workspace/{taskId}`

**Data source:** `GET /api/v1/tasks/{task_id}/workspace`

**Response schema:**
```typescript
interface TaskWorkspace {
  task_id: string;
  task_title: string;
  primary_objective: string;
  surfaced_assets: StudyAsset[];
}

interface StudyAsset {
  asset_type: 'pdf_chunk' | 'youtube_link' | 'article_link' | 'blog_link' |
              'leetcode_link' | 'codeforces_link' | 'generated_quiz' | 'generated_content';
  title: string;
  content_or_url: string;  // URL for links, markdown for content
  rationale: string;
  metadata?: Record<string, any>;
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  NavRail │  WORKSPACE: Study CNNs              [Back]   │
│          │                                              │
│          │  Progress: ██████░░░░ 40% (2/5 criteria)    │
│          │                                              │
│          │  ┌─ COMPLETION CRITERIA ─────────────────┐   │
│          │  │ ✅ Understand convolution operation    │   │
│          │  │ ✅ Watch 3Blue1Brown video             │   │
│          │  │ ☐  Solve Problem 3 from DL_Practice   │   │
│          │  │ ☐  Solve Problem 7 from DL_Practice   │   │
│          │  │ ☐  Implement basic conv layer          │   │
│          │  └───────────────────────────────────────┘   │
│          │                                              │
│          │  ┌─ PRACTICE PROBLEMS ───────────────────┐   │
│          │  │ Problem 3: "Given 5×5 input, 3×3..."  │   │
│          │  │ [Show Solution] [Mark Done] [Skip]    │   │
│          │  │                                        │   │
│          │  │ Problem 7: "Calculate output dims..."  │   │
│          │  │ [Show Solution] [Mark Done] [Skip]    │   │
│          │  └───────────────────────────────────────┘   │
│          │                                              │
│          │  ┌─ STUDY MATERIALS ─────────────────────┐   │
│          │  │ 📹 3Blue1Brown — CNNs explained       │   │
│          │  │ 📄 Stanford CS231n — Conv layers      │   │
│          │  │ 📝 Generated quiz (3 questions)       │   │
│          │  │ 📋 Lecture notes excerpt (uploaded)    │   │
│          │  └───────────────────────────────────────┘   │
│          │                                              │
│          │  ┌─ IMPLEMENTATION INTENTION (WOOP) ─────┐   │
│          │  │ IF: "I feel overwhelmed by the math"   │   │
│          │  │ THEN: "Start with visual example,      │   │
│          │  │        then move to the formula"        │   │
│          │  └───────────────────────────────────────┘   │
│          │                                              │
│          │  ┌─ ASK JARVIS ──────────────────────────┐   │
│          │  │ [📎] Ask about this task...        [↑] │   │
│          │  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Task completion:** Mark criteria done → when all criteria complete → `POST /api/v1/tasks/{task_id}/complete` with SM-2 quality rating.

**SM-2 Quality Rating UI:** When marking task complete, show:
```
How well did you understand this?
[0 Blackout] [1 Wrong] [2 Hard] [3 Struggled] [4 Good] [5 Perfect]
```
Rating sent as `quality` field → backend computes next review interval via SM-2.

**Mini-chat:** Small input at bottom for task-scoped questions. Uses AI Panel's shared conversation context with task context injected in the system prompt.

### 2.6 AI Chat Panel (Right Side) — Functional

**Current state:** Static, shows hardcoded PEARL insight and demo message.

**New behavior:**
- Uses same `useJarvisChat` hook but sends `model_mode: "4b"` for fast responses
- Shares `conversation_id` with Chat page via `ConversationContext`
- Shows last 3-5 messages (condensed view, no thinking process)
- Real PEARL insight card at top (from backend data)
- "Continue in Chat →" button on any response → navigates to `/chat` with same session
- Auto-detect heavy intents (PLAN_DAY, INGEST_DOCUMENT) → prompt:
  ```
  "This needs the full workspace — open in Chat?"
  [Open in Chat →] [Keep it here]
  ```
- Cmd+J toggle preserved
- Collapsed state: floating "J" button at right edge

### 2.7 Documents Page

**Route:** `/documents`

**Data sources:**
- `GET /api/v1/documents/?user_id=demo` — list documents
- `POST /api/v1/ingestion/process` — upload new
- `DELETE /api/v1/documents/{id}` — delete

**Features:**
- Upload zone (drag-drop PDFs/images)
- Document list: filename, classification type badge, topics, chunk count, linked tasks count
- Click document → expands to show linked tasks + topics
- Delete with confirmation
- Classification status indicator (processing → classified → linked)

### 2.8 Habits Page

**Route:** `/habits`

**Data sources:**
- `GET /api/v1/habits/tracker/due?user_id=demo` — habits due for review
- `POST /api/v1/habits/tracker/{id}/complete` — record completion with SM-2 quality

**Features:**
- Due habits list: name, last done, days overdue, next interval
- SM-2 quality rating on completion (0-5 buttons)
- Behavioral constraints list (from `behavioral_constraints` table)
- PEARL-detected patterns with feedback buttons:
  ```
  "Jarvis noticed: You skip tasks before 10 AM"
  [Confirm — avoid mornings] [Dismiss]
  ```

### 2.9 Schedule Page

**Route:** `/schedule`

**Features (simplified for pitch):**
- Day view showing today's scheduled tasks from `GET /api/v1/tasks/`
- Time blocks with task cards (color-coded by goal)
- Blocked windows shown as gray/hatched zones
- Click task → workspace
- Future: FullCalendar integration with week/month views, drag-to-reschedule

---

## Phase 3: Landing Page Enhancement

### 3.1 Hero Section (Polish)

Keep existing brain orb + aurora gradient. Add:
- GSAP stagger entrance for CTA buttons (subtle fade-up)
- Improved subtitle copy
- "Built for students, by a student." tagline

### 3.2 Scroll-Reactive Logo

In `LandingNav`:
- Scroll down → "J" icon morphs to "Jarvis" full text (fade + slide)
- Scroll up → "Jarvis" collapses back to "J" icon
- Implementation: GSAP ScrollTrigger on window scroll with threshold
- Smooth transition: `opacity` + `width` + `letter-spacing`

### 3.3 "How It Works" Pipeline Section (NEW)

GSAP ScrollTrigger pinned section. As user scrolls, pipeline animates left-to-right:

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  HOW JARVIS WORKS                                      │
│                                                        │
│  [Brain Dump] ──→ [Understand] ──→ [Break Down] ──→   │
│   "Plan my       Intent           Socratic             │
│    DL contest"   Classification   Chunker              │
│    (terra)       (dusk)           (sage)               │
│                                                        │
│  ──→ [Schedule] ──→ [Workspace]                        │
│       OR-Tools       RAG + Practice                    │
│       Solver         Materials                         │
│       (gold)         (terra)                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Each step:
- Fades in as user scrolls
- Shows a mini description
- Color-coded from palette (terra → dusk → sage → gold → terra)
- Connection lines animate between steps

### 3.4 Interactive Demo Section (NEW)

Embedded mock chat interface:
- 3 preset prompts: "Plan my week", "I have a DL contest Friday", "Teach me Dijkstra's"
- Click or type → simulated response plays:
  - Phase progress with fun names
  - Thinking process (abbreviated)
  - Response with task decomposition
  - Simulated draft preview
- Uses `demoData.ts` — no backend required
- CTA: "Try it for real →" links to `/dashboard`

### 3.5 Feature Bento Grid (Enhanced)

Same 6-feature layout with richer descriptions:
1. **AI Smart Schedule** — "OR-Tools CP-SAT solver. Not a heuristic — mathematical optimization."
2. **Anti-Guilt Engine** — "Missed a deadline? That's a data point, not a failure."
3. **Document Intelligence** — "Upload your syllabus. Jarvis classifies, links, and builds your workspace."
4. **Smart Workspace** — "RAG-powered study materials matched to your exact task."
5. **Behavioral Learning** — "Jarvis learns your patterns. Skip morning tasks? It adapts."
6. **9-Layer Architecture** — "Local-first. Your data stays on your machine."

Hover animation: subtle scale + glow effect.

### 3.6 Technical Credibility Strip (NEW)

Below features or above pricing:
```
Local-first on Apple Silicon | OR-Tools deterministic scheduler |
SM-2 spaced repetition | Privacy-preserving | 143 tests passing
```

### 3.7 Remaining Sections

- **Philosophy:** Keep with improved typography
- **Pricing:** Keep as-is (Free + Student Pro $9.99/mo)
- **Footer:** Keep minimal

---

## API Contract Map

### Chat & Streaming
| Action | Endpoint | Method | Body/Params |
|--------|----------|--------|-------------|
| Send message (streaming) | `/api/v1/chat/stream` | POST | `ChatRequest` |
| Send message (non-streaming) | `/api/v1/chat/` | POST | `ChatRequest` |
| Confirm schedule (SSE) | `/api/v1/chat/confirm-schedule` | POST | `ConfirmScheduleRequest` (see below) |
| Accept schedule (SSE) | `/api/v1/chat/accept-schedule` | POST | `{ draft_id, user_id }` |
| Modify schedule (SSE) | `/api/v1/chat/modify-schedule` | POST | `{ draft_id, user_id, modifications }` |

**ConfirmScheduleRequest** (sent after user reviews/edits tasks in Stage 1):
```typescript
interface ConfirmScheduleRequest {
  user_prompt: string;           // Original or modified prompt
  user_id: string;
  conversation_id?: string;
  tasks?: TaskChunk[];           // Optionally edited tasks from Stage 1
  draft_id?: string;             // If modifying existing draft
  horizon_start?: string;        // ISO datetime override
}
```

### Sessions
| Action | Endpoint | Method | Params |
|--------|----------|--------|--------|
| List sessions | `/api/v1/sessions/` | GET | `?user_id=demo&limit=30` |
| Get session | `/api/v1/sessions/{session_id}` | GET | `?user_id=demo` |
| Update session | `/api/v1/sessions/{session_id}` | PUT | title, etc. |
| Archive session | `/api/v1/sessions/{session_id}` | DELETE | - |

### Drafts
| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Get draft | `/api/v1/drafts/{draft_id}` | GET | `?user_id=demo` |
| Accept draft | `/api/v1/drafts/{draft_id}/accept` | POST | `{ user_id: "demo", components?: string[] }` |
| Reject draft | `/api/v1/drafts/{draft_id}/reject` | POST | `{ user_id: "demo", components: string[] }` |
| Edit draft task | `/api/v1/drafts/{draft_id}/tasks/{task_id}` | PATCH | `{ title?, duration_minutes?, difficulty_weight? }` |
| Delete draft | `/api/v1/drafts/{draft_id}` | DELETE | - |

> **Note:** Draft rejection currently rejects specific components, not the whole draft with a reason. The "ask why → build memory" flow from the backend spec is not yet implemented in the backend. For the pitch, rejection can be handled by sending a new chat message explaining what to change (which triggers re-decomposition).

### Tasks
| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| List tasks | `/api/v1/tasks/` | GET | `?user_id=demo` |
| Complete task | `/api/v1/tasks/{id}/complete` | POST | `{ quality: 0-5 }` |
| Skip task | `/api/v1/tasks/{id}/skip` | POST | `{ user_id: "demo" }` |
| Edit task | `/api/v1/tasks/{id}` | PATCH | `{ title?, duration?, difficulty? }` |
| Delete task | `/api/v1/tasks/{id}` | DELETE | - |
| Get workspace | `/api/v1/tasks/{id}/workspace` | GET | `?user_id=demo` |

### Documents & Ingestion
| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Process document | `/api/v1/ingestion/process` | POST | `{ file_base64, media_type, user_id }` |
| List documents | `/api/v1/documents/` | GET | `?user_id=demo` |
| Delete document | `/api/v1/documents/{id}` | DELETE | - |
| Pending calendars | `/api/v1/ingestion/pending-calendar` | GET | `?user_id=demo` |
| Approve calendar | `/api/v1/ingestion/pending-calendar/{id}/approve` | POST | - |
| Reject calendar | `/api/v1/ingestion/pending-calendar/{id}/reject` | POST | - |

### Habits
| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Due habits | `/api/v1/habits/tracker/due` | GET | `?user_id=demo` |
| Complete habit | `/api/v1/habits/tracker/{id}/complete` | POST | `{ quality: 0-5 }` |

### Reasoning
| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Decompose goal | `/api/v1/reasoning/decompose-goal` | POST | `{ goal, user_id }` |

### Schedule
| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Generate schedule | `/api/v1/schedule/generate-schedule` | POST | `ExecutionGraph` |

---

## TypeScript Type Definitions (lib/types.ts)

Must mirror backend Pydantic schemas:

```typescript
// Intent types — extensible, not hardcoded enum
type IntentType = string; // 'PLAN_DAY' | 'EDIT_TASK' | 'CHAT' | ... | any new registered intent

interface ChatResponse {
  intent: IntentType;
  message: string;
  schedule?: ScheduleResponse;
  execution_graph?: ExecutionGraph;
  ingestion_result?: any;
  action_proposals?: ActionItemProposal[];
  search_result?: Record<string, any>;  // dict from backend, NOT string
  thinking_process?: string;
  generation_metrics?: GenerationMetrics;  // NOTE: only in SSE 'complete' event, not from non-streaming endpoint
  awaiting_task_confirmation?: boolean;
  clarification_options?: string[];
  suggested_action?: string;  // "replan" etc.
  conversation_id?: string;
  message_id?: string;
  memories?: MemoryRecord[];
  draft_id?: string;
  schedule_status?: 'draft' | 'accepted' | 'rejected';
  // model info comes via generation_metrics.model, not a top-level field
  // document classification comes via ingestion_result, not a top-level field
}

interface ScheduleResponse {
  schedule: Record<string, TaskSchedule>;
  horizon_start: string;  // ISO datetime
  horizon_end: string;
  schedule_status: string;
  draft_id?: string;
  conflict_summary?: string;
  thinking_process?: string;
}

interface TaskSchedule {
  start_min: number;
  end_min: number;
  tmt_score?: number;
  title: string;
}

interface ExecutionGraph {
  goal_metadata: { goal_id: string; original_goal: string };
  decomposition: TaskChunk[];
  cognitive_load_estimate?: { intrinsic_load: number; germane_load: number };
}

interface TaskChunk {
  task_id: string;
  title: string;
  duration_minutes: number;  // ≤25
  difficulty_weight: number; // 0-1
  dependencies: string[];
  completion_criteria: string;
  implementation_intention?: {
    obstacle_trigger: string;
    behavioral_response: string;
  };
  deadline_hint?: string;
  subject_tag?: string;
}

interface GenerationMetrics {
  total_tokens: number;
  total_time_s: number;
  tok_per_sec: number;
  ttft_ms: number | null;
  model: string;
}

interface ActionItemProposal {
  id: string;
  title: string;
  summary: string;
  suggested_actions: string[];
  deadline_mentioned: boolean;
  deadline_date?: string;
  created_at: string;
}

interface MemoryRecord {
  id: string;
  memory_type: string;  // Dynamic — not hardcoded enum
  content: string;
  confidence: number;
  strength?: number;
  stability?: number;
  source?: string;
  observation_count?: number;
  superseded_by?: string;
  created_at?: string;
}

interface TaskWorkspace {
  task_id: string;
  task_title: string;
  primary_objective: string;
  surfaced_assets: StudyAsset[];
}

interface StudyAsset {
  asset_type: string;
  title: string;
  content_or_url: string;
  rationale: string;
  metadata?: Record<string, any>;
}

interface Session {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  summary?: string;
  messages?: SessionMessage[];
}

interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
```

---

## Design System (Preserved)

**Colors (CSS variables in globals.css):**
- `terra`: #D4775A — primary accent, CTAs, active states
- `sage`: #4A7B6B — success, completion, productive
- `dusk`: #6B7FB5 — information, modifications
- `gold`: #E09D5C — warnings, scheduling, temporal
- `ink`: #2C2924 — text, neutral

**Intent → Color mapping (dynamic):**
```typescript
const INTENT_COLORS: Record<string, string> = {
  PLAN_DAY: 'sage',
  EDIT_TASK: 'dusk',
  REARRANGE: 'dusk',
  ADD_CONSTRAINT: 'terra',
  ACCEPT_DRAFT: 'sage',
  REJECT_DRAFT: 'gold',
  INGEST_DOCUMENT: 'gold',
  CHECK_PROGRESS: 'dusk',
  CHAT: 'ink',
  GREETING: 'terra',
  GENERAL_QA: 'ink',
  CALENDAR_SYNC: 'gold',
  KNOWLEDGE_INGESTION: 'gold',
  BEHAVIORAL_CONSTRAINT: 'terra',
  ACTION_ITEM: 'dusk',
};

// For new/unknown intents: rotate through palette
const PALETTE_ROTATION = ['terra', 'sage', 'dusk', 'gold'];
function getIntentColor(intent: string): string {
  return INTENT_COLORS[intent] || PALETTE_ROTATION[hashCode(intent) % PALETTE_ROTATION.length];
}
```

**Memory type → Color mapping (dynamic):**
```typescript
const MEMORY_TYPE_COLORS: Record<string, string> = {
  constraint: 'terra',
  behavioral_pattern: 'sage',
  preference: 'dusk',
  temporal_event: 'gold',
  goal: 'sage',
  fact: 'ink',
  feedback: 'ink',
};
// New types: auto-assign from palette rotation
```

**Typography:** Inter (body) + JetBrains Mono (code/metrics)

**Component library:** Existing UI components in `components/ui/` (Button, Badge, Card, Toast, Tooltip, ProgressRing)

---

## State Management

```
ThemeContext (lib/providers.tsx)
├── theme: 'light' | 'dark'
├── toggleTheme()
└── Persisted: localStorage 'jarvis-theme'

ConversationContext (NEW)
├── conversationId: string | null
├── setConversationId()
├── startNewConversation()
└── Persisted: localStorage 'jarvis-conversation-id'

DraftContext (NEW)
├── draftId: string | null
├── draftStage: 'task_preview' | 'schedule_preview' | null
├── executionGraph: ExecutionGraph | null
├── setDraft()
├── clearDraft()
└── Persisted: localStorage 'jarvis-active-draft'

useJarvisChat (lib/hooks/useJarvisChat.ts) — REWRITTEN
├── messages: Message[]
├── streamState: { phase, reasoning, activeModel, phaseHistory }
├── isStreaming: boolean
├── sendMessage(content, options)
├── abort()
├── clearMessages()
├── conversationId (from ConversationContext)
├── modelMode: 'auto' | '4b' | '27b'
├── setModelMode()
└── Persisted: localStorage 'jarvis-chat-messages' (last 50)
```

---

## File Structure (New/Modified Files)

```
app/
├── layout.tsx                          # Fix theme script
├── page.tsx                            # Landing page (Phase 3 enhancements)
├── globals.css                         # No changes needed
└── (app)/
    ├── layout.tsx                      # Add ConversationContext, DraftContext providers
    ├── chat/page.tsx                   # REWRITE: 3-column with session panel
    ├── dashboard/page.tsx              # REWRITE: real data, PEARL insights
    ├── schedule/page.tsx               # NEW: day view with task blocks
    ├── workspace/[taskId]/page.tsx     # NEW: workspace with criteria + materials
    ├── documents/page.tsx              # NEW: document management
    └── habits/page.tsx                 # NEW: habits tracker + PEARL patterns

components/
├── landing/
│   ├── Hero.tsx                        # Polish animations
│   ├── HowItWorks.tsx                  # NEW: GSAP ScrollTrigger pipeline
│   ├── InteractiveDemo.tsx             # NEW: mock chat demo
│   ├── FeatureBento.tsx                # Enhanced descriptions
│   ├── TechCredibility.tsx             # NEW: tech strip
│   └── LandingNav.tsx                  # Add scroll-reactive logo
├── app/
│   ├── NavRail.tsx                     # Minor: fix theme toggle wiring
│   ├── AIChatPanel.tsx                 # REWRITE: functional with 4B mode
│   ├── ChatSessionPanel.tsx            # NEW: session list (chat page only)
│   ├── DraftReview.tsx                 # NEW: wrapper for two-stage draft negotiation (renders Stage 1 or 2)
│   ├── TaskPreview.tsx                 # NEW: Stage 1 task cards (child of DraftReview)
│   ├── SchedulePreview.tsx             # NEW: Stage 2 timeline (child of DraftReview)
│   ├── MemoryPanel.tsx                 # NEW: type-agnostic memory display
│   ├── PhaseProgress.tsx               # NEW: fun streaming phases
│   ├── IntentBadge.tsx                 # NEW: dynamic color badges
│   ├── MetricsBar.tsx                  # NEW: TTFT, tok/sec display
│   ├── ClarificationChips.tsx          # NEW: quick-reply pills
│   ├── InlineHabitStaging.tsx          # NEW: save/ignore habit extraction
│   ├── PendingCalendarApproval.tsx     # NEW: approve/reject calendar
│   ├── InfeasibleGuidance.tsx          # NEW: anti-guilt recalibration
│   ├── ReplanBanner.tsx               # NEW: "Schedule outdated" replan CTA
│   ├── ActionProposalCards.tsx         # NEW: action item CTAs
│   ├── SM2QualityRating.tsx            # NEW: 0-5 quality slider
│   ├── WorkspaceView.tsx               # NEW: criteria + materials + WOOP
│   ├── DailyGreeting.tsx               # Minor: real data
│   ├── StatsStrip.tsx                  # Minor: add patterns count
│   ├── ScheduleTimeline.tsx            # REWRITE: real data, color by goal
│   ├── TaskBlock.tsx                   # Minor: click → workspace
│   └── PromptSelector.tsx              # Keep for empty state

lib/
├── api.ts                              # REWRITE: proper SSE + REST
├── types.ts                            # REWRITE: mirror backend schemas
├── constants.ts                        # Add phase names, intent colors
├── providers.tsx                       # Add ConversationContext, DraftContext
├── store.ts                            # Add draft persistence
├── utils.ts                            # Keep cn()
├── demoData.ts                         # Keep for interactive demo
└── hooks/
    ├── useJarvisChat.ts                # REWRITE: proper SSE, conversation_id
    ├── useTheme.ts                     # Fix theme propagation
    ├── useDraft.ts                     # NEW: draft state management
    ├── useWorkspace.ts                 # NEW: workspace data fetching
    └── useMemories.ts                  # NEW: memory panel data
```

---

## Backend Intent Status (As of Phase 1E)

The intent registry has 9+ registered intents, but `control_policy.py` still uses hardcoded routing. This means some intents are stubs. The frontend should display intent badges for all intents but should NOT build dedicated UX flows that depend on stub intents routing correctly.

| Intent | Backend Status | Frontend Handling |
|--------|---------------|-------------------|
| PLAN_DAY | **Working** — full pipeline | Two-stage draft review |
| GREETING | **Working** — hardcoded in control policy | Display greeting response |
| GENERAL_QA | **Working** — via control policy | Display chat response |
| CALENDAR_SYNC | **Working** — via ingestion | Pending calendar approval UI |
| KNOWLEDGE_INGESTION | **Working** — via ingestion | Document classification display |
| BEHAVIORAL_CONSTRAINT | **Working** — stores to Supabase | Inline habit staging UI |
| ACTION_ITEM | **Working** — via action handler | Action proposal cards |
| EDIT_TASK | **Registry stub** — handler not wired | Badge only, use chat to edit |
| REARRANGE | **Registry stub** | Badge only, use chat to rearrange |
| ADD_CONSTRAINT | **Registry stub** | Badge only, use chat to add |
| ACCEPT_DRAFT | **Registry stub** | Use draft endpoints directly |
| REJECT_DRAFT | **Registry stub** | Use draft endpoints directly |
| CHECK_PROGRESS | **Registry stub** | Badge only, dashboard shows progress |
| CHAT | **Working** — fallback | Display chat response |

> **For the pitch:** All intents render as color-coded badges. Working intents trigger their specific UX. Stub intents fall through to CHAT behavior — the user still gets a response, just not a specialized flow.

---

## Known Clarifications & Edge Cases

### INFEASIBLE Responses
Backend returns INFEASIBLE as a `200 OK` with `schedule_status: "INFEASIBLE"` and a graceful `message` — NOT as HTTP 422. Frontend should check `schedule_status` field and render the InfeasibleGuidance component.

### Draft Lifecycle
- **Created:** When PLAN_DAY pipeline completes with `confirm_before_schedule: true`
- **Storage:** Backend persists drafts in Supabase (`DraftStore`). Frontend stores `draft_id` in `DraftContext` + localStorage for cross-page navigation.
- **Expiry:** Drafts survive server restarts (Supabase-backed). No automatic TTL — drafts persist until accepted, rejected, or manually deleted.
- **Browser close:** `draft_id` persists in localStorage. On reload, frontend checks if draft still exists via `GET /api/v1/drafts/{id}`.
- **Conflicts:** Only one active draft per user at a time. New PLAN_DAY intent replaces previous draft.

### Model Mode Persistence
- Stored in `ConversationContext` (React context) — shared across Chat page and AI Panel.
- Also persisted to localStorage (`jarvis-model-mode`) so it survives page refreshes.
- Changing mode mid-conversation is allowed — next request uses new mode.

### PEARL Insight Data Source
- PEARL insights come from `generate_proactive_insights()` in the backend.
- Currently surfaced in `ChatResponse` when the pipeline runs.
- For dashboard display: frontend caches the latest insights from the most recent chat response in localStorage.
- Future: dedicated `GET /api/v1/insights` endpoint.

### File Upload Media Types
- Backend accepts `media_type` values: `'pdf'`, `'image'`, `'png'`, `'jpeg'`
- Frontend should validate file extension and map: `.pdf` → `'pdf'`, `.png` → `'png'`, `.jpg`/`.jpeg` → `'jpeg'`, other images → `'image'`

### hashCode Utility
For deterministic intent/memory color assignment:
```typescript
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

### Workspace Mini-Chat
Uses the same `useJarvisChat` hook. The task context is injected by prepending `[Context: Working on task "{task_title}"]` to the user's message. No separate endpoint needed.

### Phase Name Customization
Phase names are customizable via localStorage only (no backend sync, no settings UI for MVP). This is a developer/power-user feature. Default fun names ship out of the box.

### Demo Mode — Environment Variable, Not localStorage

**Current (broken) approach:** Demo mode is toggled via localStorage (`jarvis-demo-mode`) and a React context (`ModeContext`). This means the app defaults to demo mode on first visit, the toggle is buried in the UI, and there's no way to control it at build/deploy time.

**Correct approach:** Demo mode is controlled by a single environment variable:

```env
# .env.local
NEXT_PUBLIC_DEMO_MODE=false   # false = live (hit real backend), true = demo (canned responses)
```

**Frontend reads it once:**
```typescript
// lib/constants.ts
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
```

**Implications:**
- Remove `ModeContext` provider entirely — no runtime toggle needed
- Remove `localStorage.getItem("jarvis-demo-mode")` checks
- Remove the Demo/Live toggle from the UI
- `IS_DEMO_MODE` is a build-time constant — tree-shaking removes demo code in production
- In `lib/api.ts`: `if (IS_DEMO_MODE) { return demoResponse(); }` before any real API call
- `demoData.ts` is only imported when `IS_DEMO_MODE` is true
- For the pitch: set `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local` (we want the real backend)
- For development without backend: set `NEXT_PUBLIC_DEMO_MODE=true`

**User ID also comes from env:**
```env
NEXT_PUBLIC_USER_ID=demo      # The user_id sent to all API calls
```

```typescript
export const USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo';
```

This replaces the hardcoded `"demo"` string scattered across API calls.

### `confirm_before_schedule` Default
Backend default is `false` (skip task preview, go straight to schedule). Frontend sets `true` by default for the pitch to showcase the two-stage flow. This is an intentional change — users see tasks before scheduling. Can be toggled via a "Quick schedule" checkbox in the chat input area.

### Error Handling & Edge Cases
- **Backend unreachable (connection refused):** Show toast: "Can't reach Jarvis. Is the backend running on localhost:8000?" with retry button.
- **Network drops mid-stream:** SSE reader catches `done: true` prematurely → show partial response with "Connection lost. [Retry]" button.
- **Malformed SSE JSON:** Wrap `JSON.parse` in try-catch → log to console, skip that event, continue parsing.
- **Empty states:** Each page has an empty state component (no tasks, no sessions, no documents) with a CTA to get started.
- **Loading states:** Skeleton loaders for dashboard stats, session list, workspace materials.
- **Abort/Cancel:** Stop button visible during streaming → calls `AbortController.abort()` → stream stops, partial response preserved.

### Porting from Jarvis-Demo
The Jarvis-Demo's `api.ts` (510 lines) and `useJarvisChat.ts` (570 lines) are battle-tested and handle SSE parsing, session management, draft lifecycle, abort, and error recovery. **Implementation should port these files as the starting point** and adapt them to the new spec, rather than rewriting from scratch. Key files to port:
- `Jarvis-Demo/lib/api.ts` → `jarvis-frontend/lib/api.ts`
- `Jarvis-Demo/lib/useJarvisChat.ts` → `jarvis-frontend/lib/hooks/useJarvisChat.ts`
- `Jarvis-Demo/lib/lmstudio-api.ts` → reference for direct LM Studio mode
- `Jarvis-Demo/components/SessionSidebar.tsx` → `jarvis-frontend/components/app/ChatSessionPanel.tsx`
- `Jarvis-Demo/components/JarvisResponse.tsx` → reference for response rendering

---

## What's NOT in Scope (Post-Pitch)

- Onboarding flow (4-stage cinematic intro)
- Analytics page (weekly summary, heatmap, mastery curves)
- Architecture page (3D layer visualization)
- Spline 3D scenes
- Mobile/tablet responsive layouts
- Command palette (Cmd+K)
- FullCalendar week/month views with drag-to-reschedule
- DKT/RL integration (backend stubs only)
- L8 PII filter
- Real authentication (currently hardcoded `user_id` from env var)
- Dedicated PEARL insights endpoint (`GET /api/v1/insights`)
- FullCalendar week/month views with drag-to-reschedule
