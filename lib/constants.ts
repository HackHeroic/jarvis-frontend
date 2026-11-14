import type { NavItem } from "./types";
import { API_BASE, IS_DEMO_MODE, USER_ID } from "./types";

export { API_BASE, IS_DEMO_MODE, USER_ID };

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: "House", href: "/dashboard" },
  { id: "chat", label: "Chat", icon: "MessageSquare", href: "/chat" },
  { id: "schedule", label: "Schedule", icon: "Calendar", href: "/schedule" },
  // Workspace is accessed per-task via /workspace/[taskId], not directly navigable
  { id: "documents", label: "Documents", shortLabel: "Docs", icon: "FileText", href: "/documents" },
  { id: "habits", label: "Habits", icon: "Target", href: "/habits" },
  { id: "you", label: "You", icon: "User", href: "/you" },
];

export const DEMO_USER = {
  id: "demo-user-001",
  name: "Madhav",
};

// ---------------------------------------------------------------------------
// Phase display names (fun streaming progress messages)
// ---------------------------------------------------------------------------

export const PHASE_NAMES: Record<string, string> = {
  connecting:            "Brewing your plan...",
  brain_dump_extraction: "Digesting your brain dump...",
  extracting:            "Digesting your brain dump...",
  intent_classified:     "Aha, figuring out what you need...",
  classifying:           "Aha, figuring out what you need...",
  decomposing:           "Breaking it into bite-sized pieces...",
  translating:           "Reading your habits...",
  scheduling:            "Crunching the numbers...",
  reasoning:             "Putting on my thinking cap...",
  responding:            "Crafting your response...",
  synthesizing:          "Adding the finishing touches...",
  complete:              "Voila!",
  // v2 LangGraph orchestrator phases
  loading_context:       "Recalling what I know about you...",
  planning:              "Cooking up your schedule...",
  habits_fetched:        "Rounding up your habits...",
  habits_translated:     "Weaving habits into the timeline...",
  memory_bridging:       "Turning your patterns into math...",
  researching:           "Digging around the web...",
  coaching:              "Checking how you're doing...",
  ingesting:             "Munching on your document...",
  learning:              "Jotting down what I learned...",
  validating:            "Making sure I understand the goal...",
  schedule_done:         "Schedule locked in!",
};

export function getPhaseDisplayName(phase: string): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('jarvis-phase-names');
    if (custom) {
      try {
        const parsed = JSON.parse(custom);
        if (parsed[phase]) return parsed[phase];
      } catch { /* ignore malformed JSON */ }
    }
  }
  return PHASE_NAMES[phase] || phase.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Intent color mapping
// ---------------------------------------------------------------------------

export const INTENT_COLORS: Record<string, string> = {
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

export const PALETTE_ROTATION = ['terra', 'sage', 'dusk', 'gold'];

// ---------------------------------------------------------------------------
// Memory type color mapping
// ---------------------------------------------------------------------------

export const MEMORY_TYPE_COLORS: Record<string, string> = {
  constraint: 'terra',
  behavioral_pattern: 'sage',
  preference: 'dusk',
  temporal_event: 'gold',
  goal: 'sage',
  fact: 'ink',
  feedback: 'ink',
};

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getIntentColor(intent: string): string {
  return INTENT_COLORS[intent] || PALETTE_ROTATION[hashCode(intent) % PALETTE_ROTATION.length];
}

export const DEMO_LATENCY = 800;

// ---------------------------------------------------------------------------
// Anti-guilt task status display (psychology framework)
// ---------------------------------------------------------------------------

/** How a task's status reads on a chip. `badge` is a Badge colour. */
export interface TaskStatusDisplay {
  label: string;
  kind: "pending" | "done" | "set_aside";
  badge: "dusk" | "sage" | "ink";
}

const PENDING: TaskStatusDisplay = { label: "Pending", kind: "pending", badge: "dusk" };
const DONE: TaskStatusDisplay = { label: "Done", kind: "done", badge: "sage" };
const SET_ASIDE: TaskStatusDisplay = { label: "Set aside", kind: "set_aside", badge: "ink" };

/**
 * The one place a task status becomes words. The backend's statuses are pending,
 * completed, skipped and missed (app/domain/entities.py TaskStatus). Skipped and
 * missed both read "Set aside" in a neutral colour — never "Missed", "Overdue",
 * "Failed" or "Late". Anything else reads as pending.
 */
export function taskStatusDisplay(status: string): TaskStatusDisplay {
  if (status === "completed") return DONE;
  if (status === "skipped" || status === "missed") return SET_ASIDE;
  return PENDING;
}

/** Skipped or missed: the task was set aside. */
export function isSetAside(status: string): boolean {
  return taskStatusDisplay(status).kind === "set_aside";
}
