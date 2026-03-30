import type { NavItem } from "./types";
import { API_BASE, IS_DEMO_MODE, USER_ID } from "./types";

export { API_BASE, IS_DEMO_MODE, USER_ID };

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

const PALETTE_ROTATION = ['terra', 'sage', 'dusk', 'gold'];

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
