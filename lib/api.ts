/**
 * API client for Jarvis backend.
 * In Demo Mode, returns mock data from demoData.ts.
 * In Live Mode, calls the real Jarvis-Engine API.
 */

import { API_BASE, IS_DEMO_MODE, USER_ID, DEMO_LATENCY } from './constants';
import { toConsentRequest } from './learning';
import {
  parseAcceptResponse,
  parseMemoryList,
  parseMemoryOut,
  parseRunTriggerResponse,
  parseSuggestion,
  parseSuggestionList,
  parseYouProfile,
  parseYouResponse,
} from './contracts';

// The only chat path: v2 (LangGraph orchestrator). v1 (/chat/stream) is deprecated.
const CHAT_STREAM_PATH = '/api/v1/chat/v2/stream';
import type {
  ChatResponse,
  ChatRequest,
  ConfirmScheduleRequest,
  DraftState,
  TaskWorkspace,
  Session,
  SessionMessage,
  MemoryOut,
  ToolUseEvent,
  MemoryExtractedEvent,
  PatternDetectedEvent,
  ConsentRequestEvent,
  YouResponse,
  YouProfile,
  SettingsUpdate,
  SuggestionOut,
  AcceptSuggestionResponse,
  RunTriggerResponse,
  TriggerName,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/**
 * The backend's error body: every HTTP error (and every v2 SSE `error` frame) is
 * `{"error": {"code", "message", "details", "request_id"}}` — see
 * Jarvis-Engine/app/api/error_handlers.py. The old shape was `{"detail": ...}`.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  request_id: string;
}

function errorBodyOf(json: unknown): Partial<ApiErrorBody> | null {
  if (!json || typeof json !== 'object') return null;
  const error = (json as { error?: unknown }).error;
  return error && typeof error === 'object' ? (error as Partial<ApiErrorBody>) : null;
}

/**
 * The human-readable message in an error body: the envelope's `error.message`
 * first, then the legacy `detail` / `message` / string `error` fields, else `fallback`.
 */
export function readApiError(json: unknown, fallback: string): string {
  const body = errorBodyOf(json);
  if (typeof body?.message === 'string' && body.message) return body.message;
  if (json && typeof json === 'object') {
    const legacy = json as { detail?: unknown; message?: unknown; error?: unknown };
    for (const value of [legacy.detail, legacy.message, legacy.error]) {
      if (typeof value === 'string' && value) return value;
    }
  }
  return fallback;
}

/** The envelope's machine-readable `error.code` (e.g. 'invalid_state_transition'), if any. */
export function readApiErrorCode(json: unknown): string | undefined {
  const code = errorBodyOf(json)?.code;
  return typeof code === 'string' ? code : undefined;
}

/** `readApiError` over a raw response body that may or may not be JSON. */
function readApiErrorText(text: string): string {
  try {
    return readApiError(JSON.parse(text), text);
  } catch {
    return text;
  }
}

/** A non-2xx response from the backend, with its status and envelope code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  /** The backend's `error.message` — written to be shown to the user. Undefined when the body had none. */
  readonly serverMessage: string | undefined;

  constructor(message: string, status: number, code?: string, serverMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }
}

/** Build an `ApiError` from a failed response; `label` prefixes the message. */
async function apiError(res: Response, label: string): Promise<ApiError> {
  const text = await res.text().catch(() => '');
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON — keep the raw text
  }
  const serverMessage = readApiError(json, '') || undefined;
  return new ApiError(
    `${label} (${res.status}): ${serverMessage || text || res.statusText}`,
    res.status,
    readApiErrorCode(json),
    serverMessage,
  );
}

/** `?user_id=…` — how every route learns who is asking (the backend's `CurrentUser` seam). */
function userQuery(userId: string = USER_ID): string {
  return new URLSearchParams({ user_id: userId }).toString();
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
  onToolUse?: (event: ToolUseEvent) => void;
  onMemoryExtracted?: (event: MemoryExtractedEvent) => void;
  onPatternDetected?: (event: PatternDetectedEvent) => void;
  /** The turn paused for consent. There is no resume path yet: the UI only explains why. */
  onConsentRequest?: (event: ConsentRequestEvent) => void;
}

export interface StreamOptions {
  signal?: AbortSignal;
}

/** Options for a plain request: an abort signal, so a page that unmounts stops its fetch. */
export type RequestOptions = StreamOptions;

/**
 * The same handlers, silenced once `signal` aborts. A stream the user stopped,
 * or one whose page unmounted, then cannot set state or surface an error.
 */
export function untilAborted(signal: AbortSignal, handlers: StreamHandlers): StreamHandlers {
  const guarded: Record<string, unknown> = {};
  for (const [name, handler] of Object.entries(handlers)) {
    if (typeof handler !== 'function') continue;
    guarded[name] = (...args: unknown[]) => {
      if (!signal.aborted) (handler as (...a: unknown[]) => void)(...args);
    };
  }
  return guarded as StreamHandlers;
}

// ---------------------------------------------------------------------------
// SSE line-by-line parser (shared by chatStream & confirmScheduleStream)
// ---------------------------------------------------------------------------

/**
 * One handler call per frame; a frame carrying a list (older backends) is one
 * call per item. An item that is not an object is skipped, and a handler that
 * throws on one item does not drop the items after it.
 */
function eachItem<T>(data: unknown, handler: ((item: T) => void) | undefined): void {
  if (!handler) return;
  for (const item of Array.isArray(data) ? data : [data]) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    try {
      handler(item as T);
    } catch {
      // one bad item — skip it, keep the rest
    }
  }
}

/**
 * Read an SSE response to the end, dispatching each `event:`/`data:` pair to
 * `handlers` in stream order. A malformed data line is skipped; an abort ends
 * quietly; any other read error goes to `onError`.
 */
export async function consumeSSE(
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
              // v2 frames carry the error envelope ({error: {message, ...}}); v1 frames a bare string.
              handlers.onError?.(new Error(readApiError(data, errorLabel)));
            } else if (currentEvent === 'tool_use') {
              handlers.onToolUse?.(data as ToolUseEvent);
            } else if (currentEvent === 'memory_extracted') {
              eachItem<MemoryExtractedEvent>(data, handlers.onMemoryExtracted);
            } else if (currentEvent === 'pattern_detected') {
              eachItem<PatternDetectedEvent>(data, handlers.onPatternDetected);
            } else if (currentEvent === 'consent_request') {
              // No usable reason (missing, blank, object-valued): nothing to show.
              const consent = toConsentRequest(data);
              if (consent) handlers.onConsentRequest?.(consent);
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
    throw new Error(`Chat failed (${res.status}): ${readApiErrorText(text)}`);
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
    res = await fetch(`${API_BASE}${CHAT_STREAM_PATH}`, {
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
    handlers.onError?.(new Error(`Stream failed (${res.status}): ${readApiErrorText(text)}`));
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
    handlers.onError?.(new Error(`Confirm schedule failed (${res.status}): ${readApiErrorText(text)}`));
    return;
  }

  await consumeSSE(res, handlers, 'Schedule error');
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
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}?${params}`,
  );
  if (res.status === 404) return [];
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

export async function archiveAllSessions(
  userId: string = USER_ID,
): Promise<number> {
  if (IS_DEMO_MODE) return 0;
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/?${params}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Failed to archive all sessions: ${res.status}`);
  const data = await res.json();
  return data.archived_count ?? 0;
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

export async function pinSession(
  sessionId: string,
  isPinned: boolean,
  userId: string = USER_ID,
): Promise<void> {
  if (IS_DEMO_MODE) return;
  const res = await fetch(
    `${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_pinned: isPinned }),
    },
  );
  if (!res.ok) throw new Error(`Failed to pin session: ${res.status}`);
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
  if (res.status === 404) return [];
  // A 5xx is an outage, never "no documents".
  if (!res.ok) throw await apiError(res, 'Failed to list documents');
  const data = await res.json();
  return data.documents ?? [];
}

export async function deleteDocument(
  sourceId: string,
  userId: string = USER_ID,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${encodeURIComponent(sourceId)}/?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Failed to delete document: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Draft Management (new — not in Demo)
// ---------------------------------------------------------------------------

export async function getDraftById(draftId: string): Promise<DraftState> {
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (!res.ok) throw await apiError(res, 'Failed to get draft');
  return res.json();
}

/**
 * Accept a draft. Throws `ApiError`: 409 `invalid_state_transition` when the draft
 * is no longer open (already accepted, rejected, expired or superseded), 409
 * `conflict` when its tasks clash with tasks the user already has.
 */
export async function acceptDraft(
  draftId: string,
): Promise<{ status: string; draft_id?: string; task_count?: number }> {
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}/accept`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID }),
    },
  );
  if (!res.ok) throw await apiError(res, 'Failed to accept draft');
  return res.json();
}

/**
 * Accept a schedule directly by persisting tasks — used when no draft_id is available
 * (e.g., confirm-schedule flow returns schedule without creating a DraftStore entry).
 */
export async function acceptScheduleDirect(
  tasks: unknown[],
  schedule?: Record<string, unknown> | null,
  horizonStart?: string,
  goalMetadata?: unknown,
): Promise<{ status: string; task_count: number }> {
  const res = await fetch(
    `${API_BASE}/api/v1/chat/accept-schedule`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: USER_ID,
        tasks,
        goal_metadata: goalMetadata,
        schedule,
        horizon_start: horizonStart,
      }),
    },
  );
  if (!res.ok) throw await apiError(res, 'Failed to accept schedule');
  return res.json();
}

/** Reject a draft. Throws `ApiError` (409 `invalid_state_transition` when it is no longer open). */
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
  if (!res.ok) throw await apiError(res, 'Failed to reject draft');
  return res.json();
}

/**
 * Edit one task in a draft (`user_id` is a required query parameter). Throws
 * `ApiError` (409 `invalid_state_transition` when the draft is no longer open).
 */
export async function editDraftTask(
  draftId: string,
  taskId: string,
  updates: Record<string, unknown>,
  userId: string = USER_ID,
): Promise<{ status: string }> {
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(draftId)}/tasks/${encodeURIComponent(taskId)}?${params}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
  );
  if (!res.ok) throw await apiError(res, 'Failed to edit draft task');
  return res.json();
}

// ---------------------------------------------------------------------------
// Tasks (new)
// ---------------------------------------------------------------------------

export async function listTasks(): Promise<Record<string, unknown>[]> {
  if (IS_DEMO_MODE) {
    const { getDemoScheduleTasks } = await import('./demoData');
    return getDemoScheduleTasks();
  }
  const res = await fetch(
    `${API_BASE}/api/v1/tasks/?user_id=${encodeURIComponent(USER_ID)}`,
  );
  if (res.status === 404) return [];
  // A 5xx is an outage, never "nothing planned".
  if (!res.ok) throw await apiError(res, 'Failed to list tasks');
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
  if (res.status === 404) return [];
  // A 503 means the database is down — never "nothing due".
  if (!res.ok) throw await apiError(res, 'Failed to get due habits');
  const data = await res.json();
  return data.due_trackers ?? data;
}

export interface BehavioralConstraint {
  id: string;
  raw_text: string;
  constraint_type: string;
  created_at: string;
}

/** Remove a rule; future schedules stop applying it. Throws `ApiError` (404 when it is already gone). */
export async function deleteBehavioralConstraint(id: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/habits/constraints/${encodeURIComponent(id)}?${userQuery()}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw await apiError(res, 'Failed to delete constraint');
}

export async function getBehavioralConstraints(): Promise<BehavioralConstraint[]> {
  if (IS_DEMO_MODE) return [];
  const res = await fetch(
    `${API_BASE}/api/v1/habits/constraints?user_id=${encodeURIComponent(USER_ID)}`,
  );
  // A 5xx is an outage, never "no constraints".
  if (res.status >= 500) throw await apiError(res, 'Failed to get constraints');
  if (!res.ok) return [];
  const data = await res.json();
  return data.constraints ?? [];
}

/** Record a habit review. `user_id` is a required query parameter; the body carries only `quality`. */
export async function completeHabit(
  id: string,
  quality: number,
  userId: string = USER_ID,
): Promise<{ next_review_date: string | null; next_interval_days: number | null }> {
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/habits/tracker/${encodeURIComponent(id)}/complete?${params}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    },
  );
  if (!res.ok) throw await apiError(res, 'Failed to complete habit');
  return res.json();
}

// ---------------------------------------------------------------------------
// Calendar (new)
// ---------------------------------------------------------------------------

/** The caller's pending calendar updates. Throws `ApiError` on failure (503 when the database is down). */
export async function getPendingCalendars(
  userId: string = USER_ID,
): Promise<Record<string, unknown>[]> {
  if (IS_DEMO_MODE) return [];
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(`${API_BASE}/api/v1/ingestion/pending-calendar?${params}`);
  if (!res.ok) throw await apiError(res, 'Failed to get pending calendars');
  const data = await res.json();
  return data.pending ?? [];
}

export async function approveCalendar(id: string, userId: string = USER_ID): Promise<void> {
  if (IS_DEMO_MODE) return;
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/ingestion/pending-calendar/${encodeURIComponent(id)}/approve?${params}`,
    { method: 'POST' },
  );
  if (!res.ok) throw await apiError(res, 'Calendar approval failed');
}

export async function rejectCalendar(id: string, userId: string = USER_ID): Promise<void> {
  if (IS_DEMO_MODE) return;
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(
    `${API_BASE}/api/v1/ingestion/pending-calendar/${encodeURIComponent(id)}/reject?${params}`,
    { method: 'POST' },
  );
  if (!res.ok) throw await apiError(res, 'Calendar rejection failed');
}

// ---------------------------------------------------------------------------
// Memory Management
// ---------------------------------------------------------------------------

/**
 * The memories Jarvis is using (`GET /memories/` → `{memories, count}`, each a
 * `MemoryOut`). A 5xx (503 when the database is down) throws `ApiError`.
 */
export async function listMemories(): Promise<MemoryOut[]> {
  const res = await fetch(`${API_BASE}/api/v1/memories/?${userQuery()}`);
  // A 5xx is an outage, never "no memories".
  if (res.status >= 500) throw await apiError(res, 'Failed to list memories');
  if (!res.ok) return [];
  return parseMemoryList(await res.json());
}

/**
 * Forget a memory for good: its words are erased and the same fact is not
 * stored again. Throws `ApiError` (404 unknown, 503 outage).
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/memories/${encodeURIComponent(memoryId)}?${userQuery()}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw await apiError(res, 'Failed to forget memory');
}

/** Confirm a memory holds. Throws `ApiError`: 409 when it was dismissed or forgotten. */
export async function confirmMemory(memoryId: string): Promise<MemoryOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/memories/${encodeURIComponent(memoryId)}/confirm?${userQuery()}`,
    { method: 'POST' },
  );
  if (!res.ok) throw await apiError(res, 'Failed to confirm memory');
  return parseMemoryOut(await res.json());
}

/** Say a memory does not hold: hidden for good. Throws `ApiError` (409 when already forgotten). */
export async function dismissMemory(memoryId: string): Promise<MemoryOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/memories/${encodeURIComponent(memoryId)}/dismiss?${userQuery()}`,
    { method: 'POST' },
  );
  if (!res.ok) throw await apiError(res, 'Failed to dismiss memory');
  return parseMemoryOut(await res.json());
}

// ---------------------------------------------------------------------------
// The You page
// ---------------------------------------------------------------------------

/** Everything Jarvis knows about the user, in one read. Throws `ApiError` (503 when the database is down). */
export async function getYou(options?: RequestOptions): Promise<YouResponse> {
  const res = await fetch(`${API_BASE}/api/v1/you?${userQuery()}`, { signal: options?.signal });
  if (!res.ok) throw await apiError(res, 'Failed to load the You page');
  return parseYouResponse(await res.json());
}

/**
 * Change settings; the ones left out stay as they are. Throws `ApiError`: 422
 * `validation_error` (an unknown timezone, a bad time, an unknown key) changes nothing.
 */
export async function updateYouSettings(update: SettingsUpdate): Promise<YouProfile> {
  const res = await fetch(`${API_BASE}/api/v1/you/settings?${userQuery()}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw await apiError(res, 'Failed to save settings');
  return parseYouProfile(await res.json());
}

// ---------------------------------------------------------------------------
// Suggestions (anticipation)
// ---------------------------------------------------------------------------

/** The user's pending suggestions, newest first. Throws `ApiError` on any failure, never `[]`. */
export async function listSuggestions(options?: RequestOptions): Promise<SuggestionOut[]> {
  if (IS_DEMO_MODE) return [];
  const res = await fetch(`${API_BASE}/api/v1/anticipation/suggestions?${userQuery()}`, {
    signal: options?.signal,
  });
  if (!res.ok) throw await apiError(res, 'Failed to list suggestions');
  return parseSuggestionList(await res.json());
}

/**
 * Accept a suggestion: its action runs once. Throws `ApiError`: 409 when it was
 * already handled or is out of date (a newer plan replaced it) — show the
 * backend's message, never success.
 */
export async function acceptSuggestion(id: string): Promise<AcceptSuggestionResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/anticipation/suggestions/${encodeURIComponent(id)}/accept?${userQuery()}`,
    { method: 'POST' },
  );
  if (!res.ok) throw await apiError(res, 'Failed to accept suggestion');
  return parseAcceptResponse(await res.json());
}

/** Dismiss a pending suggestion; it is never made again. Throws `ApiError` (409 when no longer pending). */
export async function dismissSuggestion(id: string): Promise<SuggestionOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/anticipation/suggestions/${encodeURIComponent(id)}/dismiss?${userQuery()}`,
    { method: 'POST' },
  );
  if (!res.ok) throw await apiError(res, 'Failed to dismiss suggestion');
  return parseSuggestion(await res.json());
}

/** Run a trigger now, whether or not it is due (once a day still holds). Throws `ApiError`. */
export async function runTrigger(trigger: TriggerName): Promise<RunTriggerResponse> {
  const res = await fetch(`${API_BASE}/api/v1/anticipation/run?${userQuery()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger }),
  });
  if (!res.ok) throw await apiError(res, 'Failed to run trigger');
  return parseRunTriggerResponse(await res.json());
}

// ---------------------------------------------------------------------------
// Model Status
// ---------------------------------------------------------------------------

export interface ModelStatus {
  primary_model: string;
  fast_model: string;
  cloud_model: string;
  gemini_primary: boolean;
  local_available: boolean;
}

export async function getModelStatus(): Promise<ModelStatus> {
  if (IS_DEMO_MODE) {
    return {
      primary_model: 'demo-model',
      fast_model: 'demo-model',
      cloud_model: 'gemini/gemini-2.5-flash',
      gemini_primary: false,
      local_available: true,
    };
  }
  try {
    const res = await fetch(`${API_BASE}/api/v1/models/status`);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  } catch {
    return {
      primary_model: '',
      fast_model: '',
      cloud_model: 'gemini/gemini-2.5-flash',
      gemini_primary: true,
      local_available: false,
    };
  }
}
