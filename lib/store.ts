import type { ScheduleSlot, ScheduleTask, JarvisMessage } from "./types";

const CHAT_KEY = "jarvis-chat-messages";
const CONVERSATION_KEY = "jarvis-conversation-id";
const DRAFT_KEY = "jarvis-draft-schedule";
const ONBOARDED_KEY = "jarvis-onboarded";

// --- Chat Messages ---

export function saveChatMessages(messages: JarvisMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadChatMessages(): JarvisMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// --- Conversation ID ---

export function getConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CONVERSATION_KEY);
}

export function setConversationId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONVERSATION_KEY, id);
}

// --- Draft Schedule ---

export function saveDraftSchedule(schedule: Record<string, ScheduleSlot>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(schedule));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadDraftSchedule(): Record<string, ScheduleSlot> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraftSchedule(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

// --- Onboarding ---

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDED_KEY, "true");
}

// --- Schedule Slot Converter ---

const TASK_COLORS = [
  "var(--accent)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function slotsToScheduleTasks(
  slots: Record<string, ScheduleSlot>,
  horizonStart?: string,
): ScheduleTask[] {
  const base = horizonStart ? new Date(horizonStart) : new Date();
  base.setHours(0, 0, 0, 0);

  return Object.entries(slots).map(([taskId, slot], index) => {
    const startTime = new Date(base.getTime() + slot.start_min * 60_000);
    const endTime = new Date(base.getTime() + slot.end_min * 60_000);

    return {
      task_id: taskId,
      title: slot.title ?? taskId,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: slot.end_min - slot.start_min,
      status: "pending" as const,
      color: TASK_COLORS[index % TASK_COLORS.length],
      deadline_hint: undefined,
      constraint_applied: slot.constraint_applied,
      implementation_intention: undefined,
    };
  });
}
