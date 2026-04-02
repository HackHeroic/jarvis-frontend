import type { ChatResponse, TaskSchedule, ScheduleTask, JarvisMessage } from './types';

// ---------------------------------------------------------------------------
// LocalStorage keys
// ---------------------------------------------------------------------------

const CHAT_KEY = 'jarvis-chat-messages';
const CONVERSATION_KEY = 'jarvis-conversation-id';
const DRAFT_KEY = 'jarvis-draft-schedule';
const LAST_RESPONSE_KEY = 'jarvis-last-chat-response';
const ONBOARDED_KEY = 'jarvis-onboarded';
const MAX_PERSISTED_MESSAGES = 50;

// ---------------------------------------------------------------------------
// Chat Messages — strips heavy fields, caps at 50
// ---------------------------------------------------------------------------

export function saveChatMessages(messages: JarvisMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const persistable = messages
      .filter((m) => !m.isStreaming)
      .slice(-MAX_PERSISTED_MESSAGES)
      .map((m) => ({
        ...m,
        // Strip heavy fields to save localStorage space
        response: m.response
          ? { ...m.response, thinking_process: undefined }
          : undefined,
        phaseHistory: m.phaseHistory?.slice(0, 20),
      }));
    localStorage.setItem(CHAT_KEY, JSON.stringify(persistable));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadChatMessages(): JarvisMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? (JSON.parse(raw) as JarvisMessage[]) : [];
  } catch {
    return [];
  }
}

export function clearChatMessages(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAT_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Conversation ID
// ---------------------------------------------------------------------------

export function getConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONVERSATION_KEY);
}

export function setConversationId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONVERSATION_KEY, id);
}

export function clearConversationId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONVERSATION_KEY);
}

// ---------------------------------------------------------------------------
// Draft Schedule — stores full ChatResponse for draft review
// ---------------------------------------------------------------------------

export function saveDraftSchedule(response: ChatResponse): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(response));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadDraftSchedule(): ChatResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ChatResponse) : null;
  } catch {
    return null;
  }
}

export function clearDraftSchedule(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFT_KEY);
}

// ---------------------------------------------------------------------------
// Last Chat Response (for cross-page access)
// ---------------------------------------------------------------------------

export function saveLastChatResponse(r: ChatResponse): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_RESPONSE_KEY, JSON.stringify(r));
  } catch {
    // ignore
  }
}

export function loadLastChatResponse(): ChatResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_RESPONSE_KEY);
    return raw ? (JSON.parse(raw) as ChatResponse) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Promote Draft → Final (accept flow)
// ---------------------------------------------------------------------------

export function promoteDraftToFinal(r: ChatResponse): void {
  saveLastChatResponse(r);
  clearDraftSchedule();
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function markOnboarded(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDED_KEY, 'true');
}

// ---------------------------------------------------------------------------
// Schedule Slot → ScheduleTask Converter
// ---------------------------------------------------------------------------

const TASK_COLORS = ['#6B7FB5', '#4A7B6B', '#D4775A', '#E09D5C'];

export function slotsToScheduleTasks(
  slots: Record<string, TaskSchedule>,
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
      status: 'pending' as const,
      color: TASK_COLORS[index % TASK_COLORS.length],
      deadline_hint: undefined,
      constraint_applied: slot.constraint_applied,
      implementation_intention: undefined,
    };
  });
}
