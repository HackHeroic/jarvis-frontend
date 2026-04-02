"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { listTasks } from "@/lib/api";
import { apiTasksToScheduleTasks } from "@/lib/transforms";
import {
  clearDraftSchedule,
  getConversationId,
  setConversationId as storeConversationId,
  clearConversationId,
} from "@/lib/store";
import type { ScheduleTask, ChatResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface JarvisContextValue {
  tasks: ScheduleTask[];
  tasksLoading: boolean;
  refreshTasks: () => Promise<void>;
  draftResponse: ChatResponse | null;
  setDraft: (response: ChatResponse) => void;
  clearDraft: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  toasts: Toast[];
  showToast: (message: string, type: Toast["type"]) => void;
  dismissToast: (id: string) => void;
}

const JarvisContext = createContext<JarvisContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJarvis(): JarvisContextValue {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error("useJarvis must be used within JarvisProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const STALE_MS = 30_000;
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const lastFetchRef = useRef(0);

  const refreshTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const raw = await listTasks();
      setTasks(apiTasksToScheduleTasks(raw));
    } catch {
      // Keep existing tasks on error
    } finally {
      lastFetchRef.current = Date.now();
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    function onFocus() {
      if (Date.now() - lastFetchRef.current > STALE_MS) {
        refreshTasks();
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshTasks]);

  // ---- Draft ----
  const [draftResponse, setDraftResponse] = useState<ChatResponse | null>(null);

  // Hydrate draft from localStorage, check 24h expiry (single parse)
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem("jarvis-draft-schedule")
        : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const savedAt = parsed._savedAt as number | undefined;
      if (savedAt && Date.now() - savedAt > DRAFT_MAX_AGE_MS) {
        clearDraftSchedule();
        return;
      }
      // Strip _savedAt before setting as ChatResponse
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _savedAt, ...response } = parsed;
      setDraftResponse(response as ChatResponse);
    } catch { /* ignore parse errors */ }
  }, []);

  const setDraft = useCallback((response: ChatResponse) => {
    setDraftResponse(response);
    try {
      const withTimestamp = { ...response, _savedAt: Date.now() };
      localStorage.setItem("jarvis-draft-schedule", JSON.stringify(withTimestamp));
    } catch { /* localStorage full */ }
  }, []);

  const clearDraft = useCallback(() => {
    setDraftResponse(null);
    clearDraftSchedule();
  }, []);

  // ---- Conversation ID ----
  const [conversationId, setConversationIdState] = useState<string | null>(null);

  useEffect(() => {
    setConversationIdState(getConversationId());
  }, []);

  const setConversationId = useCallback((id: string | null) => {
    setConversationIdState(id);
    if (id) {
      storeConversationId(id);
    } else {
      clearConversationId();
    }
  }, []);

  // ---- Toasts ----
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear all toast timers on unmount
  useEffect(() => {
    return () => toastTimers.current.forEach(clearTimeout);
  }, []);

  const showToast = useCallback((message: string, type: Toast["type"]) => {
    const toast: Toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message,
      type,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, toast]);
    if (type !== "error") {
      const timerId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        toastTimers.current = toastTimers.current.filter((t) => t !== timerId);
      }, 3000);
      toastTimers.current.push(timerId);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<JarvisContextValue>(() => ({
    tasks, tasksLoading, refreshTasks,
    draftResponse, setDraft, clearDraft,
    conversationId, setConversationId,
    toasts, showToast, dismissToast,
  }), [tasks, tasksLoading, refreshTasks, draftResponse, setDraft, clearDraft, conversationId, setConversationId, toasts, showToast, dismissToast]);

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}
