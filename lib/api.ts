/**
 * API client for Jarvis backend.
 * In Demo Mode, returns mock data from demoData.ts.
 * In Live Mode, calls the real Jarvis-Engine API.
 */

import { API_BASE, IS_DEMO_MODE, USER_ID, DEMO_LATENCY } from './constants';
import type {
  ChatResponse,
  ChatRequest,
  ConfirmScheduleRequest,
  TaskWorkspace,
  Session,
  SessionMessage,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lazy-load demo data to keep live-mode bundles small. */
const getDemoResponseLazy = async (prompt: string) => {
  const { getDemoResponse } = await import('./demoData');
  return getDemoResponse(prompt);
};

// ---------------------------------------------------------------------------
// Stream Handlers & Options
// ---------------------------------------------------------------------------

export interface StreamHandlers {
  onStep?: (intent: string, data?: Record<string, unknown>) => void;
  onPhase?: (phase: string, data: Record<string, unknown>) => void;
  onThinkingToken?: (token: string) => void;
  onMessageToken?: (token: string) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (err: Error) => void;
}

export interface StreamOptions {
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// SSE line-by-line parser (shared by chatStream & confirmScheduleStream)
// ---------------------------------------------------------------------------

async function consumeSSE(
  res: Response,
  handlers: StreamHandlers,
  errorLabel: string,
): Promise<void> {
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let currentEvent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'phase') {
              const { phase, ...rest } = data;
              handlers.onPhase?.(phase as string, rest);
            } else if (currentEvent === 'step') {
              handlers.onStep?.(data.intent, data);
            } else if (currentEvent === 'thinking') {
              handlers.onThinkingToken?.(data.token);
            } else if (currentEvent === 'message') {
              handlers.onMessageToken?.(data.token);
            } else if (currentEvent === 'complete') {
              handlers.onComplete?.(data as ChatResponse);
            } else if (currentEvent === 'error') {
              handlers.onError?.(new Error(data.error || errorLabel));
            }
          } catch {
            // malformed data line — skip
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    handlers.onError?.(new Error(`Stream read error: ${String(e)}`));
  }
}

// ---------------------------------------------------------------------------
// Chat (non-streaming)
// ---------------------------------------------------------------------------

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  if (IS_DEMO_MODE) {
    await delay(DEMO_LATENCY);
    return getDemoResponseLazy(request.user_prompt);
  }

  const res = await fetch(`${API_BASE}/api/v1/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || json.message || text;
    } catch {
      // use raw text
    }
    throw new Error(`Chat failed (${res.status}): ${detail}`);
  }

  try {
    return await res.json();
  } catch {
    throw new Error('Received invalid response from server.');
  }
}

// ---------------------------------------------------------------------------
// Chat Stream (SSE)
// ---------------------------------------------------------------------------

async function simulateDemoStream(
  request: ChatRequest,
  handlers: StreamHandlers,
): Promise<void> {
  const full = await getDemoResponseLazy(request.user_prompt);

  handlers.onPhase?.('brain_dump_extraction', {});
  await delay(300);

  if (full.thinking_process) {
    handlers.onPhase?.('reasoning', {});
    const words = full.thinking_process.split(' ');
    for (const word of words) {
      await delay(25);
      handlers.onThinkingToken?.(word + ' ');
    }
  }

  handlers.onPhase?.('responding', {});
  await delay(100);
  const msgWords = full.message.split(' ');
  for (const word of msgWords) {
    await delay(35);
    handlers.onMessageToken?.(word + ' ');
  }

  await delay(200);
  handlers.onPhase?.('complete', {});
  handlers.onComplete?.(full);
}

export async function chatStream(
  request: ChatRequest,
  handlers: StreamHandlers,
  options?: StreamOptions,
): Promise<void> {
  if (IS_DEMO_MODE) {
    await simulateDemoStream(request, handlers);
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    handlers.onError?.(new Error(`Network error: ${String(e)}`));
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    handlers.onError?.(new Error(`Stream failed (${res.status}): ${text}`));
    return;
  }

  await consumeSSE(res, handlers, 'Stream error');
}

// ---------------------------------------------------------------------------
// Confirm Schedule Stream (SSE)
// ---------------------------------------------------------------------------

export async function confirmScheduleStream(
  request: ConfirmScheduleRequest,
  handlers: StreamHandlers,
  options?: StreamOptions,
): Promise<void> {
  if (IS_DEMO_MODE) {
    handlers.onComplete?.({
      intent: 'PLAN_DAY',
      message: 'Demo: schedule confirmed.',
    } as ChatResponse);
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/chat/confirm-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    handlers.onError?.(new Error(`Network error: ${String(e)}`));
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    handlers.onError?.(new Error(`Confirm schedule failed (${res.status}): ${text}`));
    return;
  }

  await consumeSSE(res, handlers, 'Schedule error');
}

// ---------------------------------------------------------------------------
// Accept Schedule (finalize draft)
// ---------------------------------------------------------------------------

export async function acceptSchedule(request: {
  user_id: string;
  tasks: Array<Record<string, unknown>>;
  goal_metadata?: Record<string, unknown>;
}): Promise<{ status: string; task_count: number }> {
  const res = await fetch(`${API_BASE}/api/v1/chat/accept-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Accept schedule failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Task Lifecycle
// ---------------------------------------------------------------------------

export interface TaskUpdateRequest {
  user_id: string;
  title?: string;
  duration_minutes?: number;
  difficulty_weight?: number;
  status?: string;
}

export interface TaskResponse {
  task_id: string;
  status: string;
  message: string;
  replan_triggered?: boolean;
}

export async function updateTask(
  taskId: string,
  body: TaskUpdateRequest,
): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Task update failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function completeTask(
  taskId: string,
  userId: string = USER_ID,
  quality: number = 3,
): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quality }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Task complete failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function skipTask(
  taskId: string,
  userId: string = USER_ID,
): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Task skip failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function deleteTask(
  taskId: string,
  userId: string = USER_ID,
): Promise<TaskResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Task delete failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

export async function listSessions(
  userId: string = USER_ID,
  limit: number = 30,
): Promise<Session[]> {
  if (IS_DEMO_MODE) return [];
  const params = new URLSearchParams({ user_id: userId, limit: String(limit) });
  const res = await fetch(`${API_BASE}/api/v1/sessions/?${params}`);
  if (!res.ok) throw new Error(`Failed to list sessions: ${res.status}`);
  const data = await res.json();
  return data.sessions ?? [];
}

export async function loadConversation(
  sessionId: string,
  userId: string = USER_ID,
): Promise<SessionMessage[]> {
  if (IS_DEMO_MODE) return [];
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}/messages?${params}`,
  );
  if (!res.ok) throw new Error(`Failed to load conversation: ${res.status}`);
  const data = await res.json();
  return data.messages ?? [];
}

export async function archiveSession(
  sessionId: string,
  userId: string = USER_ID,
): Promise<void> {
  if (IS_DEMO_MODE) return;
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}?${params}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Failed to archive session: ${res.status}`);
}

export async function renameSession(
  sessionId: string,
  title: string,
  userId: string = USER_ID,
): Promise<void> {
  if (IS_DEMO_MODE) return;
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, title }),
    },
  );
  if (!res.ok) throw new Error(`Failed to rename session: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Document Management
// ---------------------------------------------------------------------------

export interface IngestionDocument {
  id: string;
  user_id: string;
  source_id: string;
  file_name: string | null;
  media_type: string | null;
  document_topics: string[];
  chunk_count: number;
  created_at: string;
  linked_task_ids: string[];
}

export async function listDocuments(
  userId: string = USER_ID,
): Promise<IngestionDocument[]> {
  if (IS_DEMO_MODE) return [];
  const res = await fetch(
    `${API_BASE}/api/v1/documents/?user_id=${encodeURIComponent(userId)}`,
  );
  if (res.status === 404 || res.status === 503) return [];
  if (!res.ok) throw new Error(`Failed to list documents: ${res.status}`);
  const data = await res.json();
  return data.documents ?? [];
}

export async function deleteDocument(
  sourceId: string,
  userId: string = USER_ID,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${encodeURIComponent(sourceId)}?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Failed to delete document: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Draft Management (new — not in Demo)
// ---------------------------------------------------------------------------

export async function getDraftById(draftId: string): Promise<ChatResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (!res.ok) throw new Error(`Failed to get draft: ${res.status}`);
  return res.json();
}

export async function acceptDraft(
  draftId: string,
): Promise<{ status: string }> {
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}/accept`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID }),
    },
  );
  if (!res.ok) throw new Error(`Failed to accept draft: ${res.status}`);
  return res.json();
}

export async function rejectDraft(
  draftId: string,
  components: string[],
): Promise<{ status: string }> {
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, components }),
    },
  );
  if (!res.ok) throw new Error(`Failed to reject draft: ${res.status}`);
  return res.json();
}

export async function editDraftTask(
  draftId: string,
  taskId: string,
  updates: Record<string, unknown>,
): Promise<{ status: string }> {
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
  );
  if (!res.ok) throw new Error(`Failed to edit draft task: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Tasks (new)
// ---------------------------------------------------------------------------

export async function listTasks(): Promise<Record<string, unknown>[]> {
  if (IS_DEMO_MODE) return [];
  const res = await fetch(
    `${API_BASE}/api/v1/tasks/?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (res.status === 404 || res.status === 503) return [];
  if (!res.ok) throw new Error(`Failed to list tasks: ${res.status}`);
  const data = await res.json();
  return data.tasks ?? data;
}

export async function getWorkspace(taskId: string): Promise<TaskWorkspace | null> {
  if (IS_DEMO_MODE) return null;
  const res = await fetch(
    `${API_BASE}/api/v1/tasks/${encodeURIComponent(taskId)}/workspace?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (res.status === 404 || res.status === 503) return null;
  if (!res.ok) throw new Error(`Workspace failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Ingestion (new)
// ---------------------------------------------------------------------------

export async function processDocument(
  fileBase64: string,
  mediaType: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/v1/ingestion/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_base64: fileBase64,
      media_type: mediaType,
      user_id: USER_ID,
    }),
  });
  if (!res.ok) throw new Error(`Document processing failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Habits (new)
// ---------------------------------------------------------------------------

export async function getDueHabits(): Promise<Record<string, unknown>[]> {
  if (IS_DEMO_MODE) return [];
  const res = await fetch(
    `${API_BASE}/api/v1/habits/tracker/due?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (res.status === 404 || res.status === 503) return [];
  if (!res.ok) throw new Error(`Failed to get due habits: ${res.status}`);
  const data = await res.json();
  return data.due_trackers ?? data;
}

export async function completeHabit(
  id: string,
  quality: number,
): Promise<{ status: string }> {
  const res = await fetch(
    `${API_BASE}/api/v1/habits/tracker/${encodeURIComponent(id)}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    },
  );
  if (!res.ok) throw new Error(`Failed to complete habit: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Calendar (new)
// ---------------------------------------------------------------------------

export async function getPendingCalendars(): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/ingestion/pending-calendar?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (!res.ok) throw new Error(`Failed to get pending calendars: ${res.status}`);
  return res.json();
}

export async function approveCalendar(id: string): Promise<void> {
  if (IS_DEMO_MODE) return;
  const res = await fetch(
    `${API_BASE}/api/v1/ingestion/pending-calendar/${encodeURIComponent(id)}/approve`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Calendar approval failed: ${res.status}`);
}

export async function rejectCalendar(id: string): Promise<void> {
  if (IS_DEMO_MODE) return;
  const res = await fetch(
    `${API_BASE}/api/v1/ingestion/pending-calendar/${encodeURIComponent(id)}/reject`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Calendar rejection failed: ${res.status}`);
}
