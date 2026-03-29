/**
 * API client for Jarvis backend.
 * In Demo Mode (default), returns mock data from demoData.ts.
 * In Live Mode, calls the real Jarvis-Engine API.
 */

import type { ChatResponse } from "./types";
import { API_BASE, DEMO_LATENCY, DEMO_USER } from "./constants";

const DEMO_MODE_KEY = "jarvis-demo-mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(DEMO_MODE_KEY);
  // Default to demo mode if not explicitly set to "live"
  return val !== "live";
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_MODE_KEY, enabled ? "demo" : "live");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Lazy import for demo data to avoid circular deps and keep bundle small in live mode
const getDemoResponseLazy = async (prompt: string) => {
  const { getDemoResponse } = await import("./demoData");
  return getDemoResponse(prompt);
};

// --- Stream Handlers ---

export interface StreamHandlers {
  onPhase?: (phase: string, data: Record<string, unknown>) => void;
  onThinkingToken?: (token: string) => void;
  onMessageToken?: (token: string) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (err: Error) => void;
}

// --- Send Chat (non-streaming) ---

export async function sendChat(
  prompt: string,
  opts?: { userId?: string; fileBase64?: string; mediaType?: string; conversationId?: string },
): Promise<ChatResponse> {
  if (isDemoMode()) {
    await delay(DEMO_LATENCY);
    return getDemoResponseLazy(prompt);
  }

  const res = await fetch(`${API_BASE}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_prompt: prompt,
      user_id: opts?.userId ?? DEMO_USER.id,
      file_base64: opts?.fileBase64,
      media_type: opts?.mediaType,
      conversation_id: opts?.conversationId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat failed (${res.status}): ${text}`);
  }

  return res.json();
}

// --- Send Chat Stream (SSE) ---

async function simulateDemoStream(prompt: string, handlers: StreamHandlers): Promise<void> {
  const full = await getDemoResponseLazy(prompt);

  handlers.onPhase?.("brain_dump_extraction", {});
  await delay(300);

  if (full.thinking_process) {
    handlers.onPhase?.("reasoning", {});
    const words = full.thinking_process.split(" ");
    for (const word of words) {
      await delay(20);
      handlers.onThinkingToken?.(word + " ");
    }
  }

  handlers.onPhase?.("responding", {});
  await delay(100);
  const msgWords = full.message.split(" ");
  for (const word of msgWords) {
    await delay(30);
    handlers.onMessageToken?.(word + " ");
  }

  await delay(200);
  handlers.onPhase?.("complete", {});
  handlers.onComplete?.(full);
}

export async function sendChatStream(
  prompt: string,
  handlers: StreamHandlers,
  opts?: { signal?: AbortSignal; userId?: string; conversationId?: string },
): Promise<void> {
  if (isDemoMode()) {
    return simulateDemoStream(prompt, handlers);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_prompt: prompt,
        user_id: opts?.userId ?? DEMO_USER.id,
        conversation_id: opts?.conversationId,
      }),
      signal: opts?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Network error: ${String(e)}`));
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    handlers.onError?.(new Error(`Stream failed (${res.status}): ${text}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === "phase") {
              const { phase, ...rest } = data;
              handlers.onPhase?.(phase as string, rest);
            } else if (currentEvent === "thinking") {
              handlers.onThinkingToken?.(data.token);
            } else if (currentEvent === "message") {
              handlers.onMessageToken?.(data.token);
            } else if (currentEvent === "complete") {
              handlers.onComplete?.(data as ChatResponse);
            } else if (currentEvent === "error") {
              handlers.onError?.(new Error(data.error || "Stream error"));
            }
          } catch {
            // malformed data line, skip
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    handlers.onError?.(new Error(`Stream read error: ${String(e)}`));
  }
}

// --- Task Lifecycle ---

export async function completeTask(
  taskId: string,
  userId: string = DEMO_USER.id,
  quality: number = 3,
): Promise<{ task_id: string; status: string; message: string }> {
  if (isDemoMode()) {
    await delay(DEMO_LATENCY / 2);
    return { task_id: taskId, status: "completed", message: "Task completed (demo)" };
  }

  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, quality }),
  });
  if (!res.ok) throw new Error(`Task complete failed (${res.status})`);
  return res.json();
}

export async function skipTask(
  taskId: string,
  userId: string = DEMO_USER.id,
): Promise<{ task_id: string; status: string; message: string }> {
  if (isDemoMode()) {
    await delay(DEMO_LATENCY / 2);
    return { task_id: taskId, status: "skipped", message: "Task skipped (demo)" };
  }

  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/skip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`Task skip failed (${res.status})`);
  return res.json();
}
