/**
 * Custom hook for Jarvis unified streaming chat.
 * Ported from Jarvis-Demo with imports adapted to the new frontend structure.
 * Manages all chat state, SSE streaming, drafts, sessions, and abort support.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError, chatStream, acceptDraft, getDraftById, rejectDraft, untilAborted, createStreamControl, type StreamControl, loadConversation as loadConversationAPI } from "../api";
import { useJarvis } from "@/lib/context/JarvisContext";
import type {
  JarvisMessage,
  JarvisStreamState,
  JarvisStreamPhase,
  PhaseEventData,
  ChatResponse,
  ToolUseEvent,
} from "../types";
import { useDevMode } from "./useDevMode";
import { INITIAL_STREAM_STATE } from "../types";
import { readPatternFrame, toLearningMoment, type LearningMoment } from "../learning";
import { acceptFromCard, replaceDraftInMessages, withLatestDraft } from "../draftCard";
import { conversationLoadFailure } from "../sessions";
import { toModelMode, type ModelMode } from "../modelModes";
import {
  saveChatMessages,
  loadChatMessages,
  clearChatMessages,
  saveDraftSchedule,
  loadDraftSchedule,
  clearDraftSchedule,
} from "../store";
import { USER_ID } from "../constants";

export type { ModelMode };

/** A conversation that would not open because Jarvis could not be reached: Retry loads it again. */
export interface ConversationLoadError {
  sessionId: string;
  headline: string;
  detail?: string;
}

export type UseJarvisChatReturn = {
  messages: JarvisMessage[];
  streamState: JarvisStreamState;
  isStreaming: boolean;
  sendMessage: (
    content: string,
    options?: {
      fileBase64?: string;
      mediaType?: string;
      modelMode?: string;
      fileName?: string;
    },
  ) => Promise<void>;
  abort: () => void;
  clearMessages: () => void;
  draftScheduleResponse: ChatResponse | null;
  acceptDraft: () => Promise<void>;
  acceptState: "idle" | "accepting" | "accepted";
  rejectDraft: (reason?: string) => void;
  conversationId: string | null;
  startNewConversation: () => void;
  loadConversation: (sessionId: string) => Promise<void>;
  /** Set when opening a conversation hit an outage (not a deletion); null otherwise. */
  conversationLoadError: ConversationLoadError | null;
  triggerReplan: () => Promise<void>;
  isReplanning: boolean;
  modelMode: ModelMode;
  setModelMode: (mode: ModelMode) => void;
  devMode: boolean;
  toggleDevMode: () => void;
  /** Clear the learning toast (streamState.latestPattern). */
  dismissLearningToast: () => void;
};

export function useJarvisChat(): UseJarvisChatReturn {
  const jarvis = useJarvis();
  const { setDraft } = jarvis;
  const router = useRouter();

  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [streamState, setStreamState] =
    useState<JarvisStreamState>(INITIAL_STREAM_STATE);
  const [isStreaming, setIsStreaming] = useState(false);
  const [draftScheduleResponse, setDraftScheduleResponse] =
    useState<ChatResponse | null>(null);
  const [acceptState, setAcceptState] = useState<
    "idle" | "accepting" | "accepted"
  >("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationLoadError, setConversationLoadError] = useState<ConversationLoadError | null>(null);
  const [isReplanning, setIsReplanning] = useState(false);
  const [modelMode, setModelMode] = useState<ModelMode>("auto");

  // Hydrate state from localStorage on mount
  useEffect(() => {
    const savedMessages = loadChatMessages();
    if (savedMessages.length > 0) setMessages(savedMessages);

    const savedDraft = loadDraftSchedule();
    // A suggestion's plan has no card in chat (the dashboard banner acts on it),
    // so chat never adopts it as its own draft.
    if (savedDraft && savedDraft.draft_source !== "suggestion") setDraftScheduleResponse(savedDraft);

    const savedConversationId = localStorage.getItem("jarvis-conversation-id");
    if (savedConversationId) setConversationId(savedConversationId);

    // Read as the backend reads it: a stored "27b" (the old local option) is auto.
    const savedModelMode = localStorage.getItem("jarvis-model-mode");
    if (savedModelMode) setModelMode(toModelMode(savedModelMode));
  }, []);

  // Persist model mode to localStorage
  useEffect(() => {
    localStorage.setItem("jarvis-model-mode", modelMode);
  }, [modelMode]);

  // Persist non-streaming messages to localStorage
  useEffect(() => {
    const nonStreaming = messages.filter((m) => !m.isStreaming);
    if (nonStreaming.length > 0) {
      saveChatMessages(nonStreaming);
    }
  }, [messages]);

  const [devMode, toggleDevMode] = useDevMode();

  // The stream in flight: stop() is the user's Stop, detach() is leaving the page.
  const streamRef = useRef<StreamControl | null>(null);
  const streamingMsg = useRef<JarvisMessage | null>(null);
  const reasoningStartTime = useRef<number | null>(null);
  const reasoningDurationRef = useRef<number | null>(null);
  const phaseHistoryRef = useRef<PhaseEventData[]>([]);
  const toolUsesRef = useRef<ToolUseEvent[]>([]);
  const learningMomentsRef = useRef<LearningMoment[]>([]);

  // Leaving the page mid-turn detaches the stream: its handlers (wrapped in
  // untilAborted on the delivery signal) stop running, so nothing sets state
  // or shows an error after the page is gone — but the request is NOT
  // cancelled. It reads on to the end in the background, the server finishes
  // the turn, and the reply is in the conversation's history when the user
  // comes back. Only the user's Stop (abort below) cancels the request.
  // The detach is deferred one tick: React StrictMode (reactStrictMode: true,
  // dev) unmounts and remounts at once, and detaching then would silence a
  // turn started on mount (/chat?prompt=) and leave the page stuck streaming.
  // Only a real unmount is still unmounted a tick later.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setTimeout(() => {
        if (mountedRef.current) return;
        streamRef.current?.detach();
        streamRef.current = null;
        streamingMsg.current = null;
      }, 0);
    };
  }, []);

  const abort = useCallback(() => {
    streamRef.current?.stop();
    streamRef.current = null;

    // Finalize partial message
    if (streamingMsg.current) {
      streamingMsg.current.isStreaming = false;
      const final = { ...streamingMsg.current };
      setMessages((m) => [...m.slice(0, -1), final]);
      streamingMsg.current = null;
    }

    setStreamState((s) => ({ ...s, phase: "aborted" }));
    setIsStreaming(false);
  }, []);

  /** Append a learning moment to the streaming message, so it renders under its own reply. */
  const addLearningMoment = useCallback((moment: LearningMoment) => {
    learningMomentsRef.current = [...learningMomentsRef.current, moment];
    if (streamingMsg.current) {
      streamingMsg.current.learningMoments = [...learningMomentsRef.current];
      setMessages((m) => [...m.slice(0, -1), { ...streamingMsg.current! }]);
    }
  }, []);

  const dismissLearningToast = useCallback(() => {
    setStreamState((s) => (s.latestPattern ? { ...s, latestPattern: null } : s));
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        fileBase64?: string;
        mediaType?: string;
        modelMode?: string;
        fileName?: string;
      },
    ) => {
      if (!content.trim() || isStreaming) return;
      setConversationLoadError(null);

      const now = Date.now();
      const userMsg: JarvisMessage = {
        id: `msg-${now}-user`,
        role: "user",
        content: content.trim(),
        isStreaming: false,
        timestamp: now,
        fileName: options?.fileName,
        mediaType: options?.mediaType,
      };

      // Placeholder assistant message
      const assistantMsg: JarvisMessage = {
        id: `msg-${now}-assistant`,
        role: "assistant",
        content: "",
        reasoning: "",
        isStreaming: true,
        timestamp: now + 1,
      };
      streamingMsg.current = assistantMsg;

      setMessages((m) => [...m, userMsg, assistantMsg]);
      setStreamState({ ...INITIAL_STREAM_STATE, phase: "connecting" });
      setIsStreaming(true);
      reasoningDurationRef.current = null;
      phaseHistoryRef.current = [];
      toolUsesRef.current = [];
      learningMomentsRef.current = [];

      // Stop cancels it; leaving the page only detaches its handlers.
      const control = createStreamControl();
      streamRef.current = control;

      await chatStream(
        {
          user_prompt: content.trim(),
          user_id: USER_ID,
          file_base64: options?.fileBase64,
          media_type: options?.mediaType,
          file_name: options?.fileName,
          model_mode: options?.modelMode ? toModelMode(options.modelMode) : modelMode,
          conversation_id: conversationId || undefined,
        },
        untilAborted(control.deliverySignal, {
          onPhase: (phase, data) => {
            const phaseEvent: PhaseEventData = { phase, timestamp: Date.now(), ...data };
            const intent = (data.intent as string) || null;
            const activeModel = (data.model as string) || null;
            const phaseModeMode = (data.model_mode as string) || null;
            phaseHistoryRef.current = [
              ...phaseHistoryRef.current,
              phaseEvent,
            ];
            // Update streaming message so PhaseProgress renders live
            if (streamingMsg.current) {
              streamingMsg.current.phaseHistory = [...phaseHistoryRef.current];
              setMessages((m) => {
                const updated = { ...streamingMsg.current! };
                return [...m.slice(0, -1), updated];
              });
            }
            setStreamState((s) => ({
              ...s,
              phase: phase as JarvisStreamPhase,
              intent: intent || s.intent,
              activeModel: activeModel || s.activeModel,
              modelMode: phaseModeMode || s.modelMode,
              currentPhaseData: phaseEvent,
              phaseHistory: [...s.phaseHistory, phaseEvent],
            }));
          },

          onStep: (intent, data) => {
            setStreamState((s) => ({
              ...s,
              phase: "synthesizing",
              intent,
              activeModel:
                (data?.synthesis_model as string) || s.activeModel,
              modelMode: (data?.model_mode as string) || s.modelMode,
            }));
          },

          onThinkingToken: (token) => {
            if (!streamingMsg.current) return;
            if (!reasoningStartTime.current) {
              reasoningStartTime.current = Date.now();
            }
            streamingMsg.current.reasoning =
              (streamingMsg.current.reasoning || "") + token;
            setStreamState((s) => ({
              ...s,
              phase: "reasoning",
              reasoning: s.reasoning + token,
            }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },

          onMessageToken: (token) => {
            if (!streamingMsg.current) return;
            // Record reasoning duration on first message token
            if (reasoningStartTime.current) {
              const duration = Date.now() - reasoningStartTime.current;
              reasoningDurationRef.current = duration;
              setStreamState((s) => ({
                ...s,
                reasoningDurationMs: duration,
              }));
              reasoningStartTime.current = null;
            }
            streamingMsg.current.content += token;
            setStreamState((s) => ({
              ...s,
              phase: "responding",
              message: s.message + token,
            }));
            setMessages((m) => {
              const updated = { ...streamingMsg.current! };
              return [...m.slice(0, -1), updated];
            });
          },

          onToolUse: (event) => {
            toolUsesRef.current = [...toolUsesRef.current, { ...event, timestamp: Date.now() }];
            if (streamingMsg.current) {
              streamingMsg.current.toolUses = [...toolUsesRef.current];
              setMessages((m) => [...m.slice(0, -1), { ...streamingMsg.current! }]);
            }
          },

          // Every observation is shown inline under this reply; only a strong,
          // recurring pattern also gets the toast.
          // A frame with no usable content is skipped (never a blank row).
          onMemoryExtracted: (event) => {
            const moment = toLearningMoment(event, "memory");
            if (moment) addLearningMoment(moment);
          },

          onPatternDetected: (event) => {
            const { moment, toast } = readPatternFrame(event);
            if (moment) addLearningMoment(moment);
            if (toast) {
              setStreamState((s) => ({ ...s, latestPattern: { ...toast, timestamp: Date.now() } }));
            }
          },

          onConsentRequest: (event) => {
            if (streamingMsg.current) {
              streamingMsg.current.consentRequest = { reason: event.reason, module: event.module };
              setMessages((m) => [...m.slice(0, -1), { ...streamingMsg.current! }]);
            }
          },

          onComplete: (response: ChatResponse) => {
            if (streamingMsg.current) {
              streamingMsg.current.isStreaming = false;
              streamingMsg.current.response = response;
              if (response.conversation_id) {
                setConversationId(response.conversation_id);
                localStorage.setItem(
                  "jarvis-conversation-id",
                  response.conversation_id,
                );
                if (streamingMsg.current) {
                  streamingMsg.current.conversation_id =
                    response.conversation_id;
                  streamingMsg.current.message_id = response.message_id;
                }
              }
              // Use streamed content if available, else fall back
              if (!streamingMsg.current.content.trim()) {
                streamingMsg.current.content = response.message || "Done.";
              }
              if (
                !streamingMsg.current.reasoning?.trim() &&
                response.thinking_process
              ) {
                streamingMsg.current.reasoning = response.thinking_process;
              }
              // Persist reasoning duration so completed messages show "Thought for Xs"
              streamingMsg.current.reasoningDurationMs =
                reasoningDurationRef.current;
              // Persist pipeline trace so it survives after streaming ends
              streamingMsg.current.phaseHistory = [
                ...phaseHistoryRef.current,
              ];
              const final = { ...streamingMsg.current };
              setMessages((m) => [...m.slice(0, -1), final]);
              streamingMsg.current = null;
            }

            // Draft schedule: store in draft state, don't save as final
            if (
              response.schedule_status === "draft" &&
              response.schedule
            ) {
              setDraftScheduleResponse(response);
              saveDraftSchedule(response);
              setDraft(response);
            }

            setStreamState((s) => ({ ...s, phase: "complete" }));
            setIsStreaming(false);
            streamRef.current = null;
          },

          onError: (err) => {
            const errorMsg = err.message || String(err);
            if (streamingMsg.current) {
              streamingMsg.current.isStreaming = false;
              if (!streamingMsg.current.content) {
                streamingMsg.current.content = `Error: ${errorMsg}`;
              }
              const final = { ...streamingMsg.current };
              setMessages((m) => [...m.slice(0, -1), final]);
              streamingMsg.current = null;
            }
            setStreamState((s) => ({
              ...s,
              phase: "error",
              error: errorMsg,
            }));
            setIsStreaming(false);
            streamRef.current = null;
          },
        }),
        { signal: control.requestSignal },
      );
    },
    [isStreaming, conversationId, modelMode, addLearningMoment, setDraft],
  );

  const acceptDraftFn = useCallback(async () => {
    if (!draftScheduleResponse) return;
    setAcceptState("accepting");
    // The plan this card shows, by the version its turn handed over: a plan changed
    // since is refused (409 stale_version) and read as the dashboard banner reads it.
    const outcome = await acceptFromCard(draftScheduleResponse, { accept: acceptDraft, reread: getDraftById });

    if (outcome.accepted) {
      jarvis.clearDraft();
      setDraftScheduleResponse(null);
      setAcceptState("accepted");
      await jarvis.refreshTasks();
      jarvis.showToast(outcome.message, outcome.tone);
      setTimeout(() => {
        setAcceptState("idle");
        router.push("/schedule");
      }, 1000);
      return;
    }

    // Anything else is never success: say why, and the card stays open unless the
    // plan is settled or gone.
    setAcceptState("idle");
    jarvis.showToast(outcome.message, outcome.tone);
    const latest = outcome.latest;
    if (latest) {
      // The plan changed since the card was drawn; nothing was written. Redraw the
      // card on the latest draft, whose version the next accept sends.
      const redrawn = withLatestDraft(draftScheduleResponse, latest);
      setDraftScheduleResponse(redrawn);
      saveDraftSchedule(redrawn);
      jarvis.setDraft(redrawn);
      setMessages((m) => replaceDraftInMessages(m, latest));
    }
    if (outcome.refreshTasks) void jarvis.refreshTasks();
    if (outcome.clearDraft) {
      jarvis.clearDraft();
      setDraftScheduleResponse(null);
    }
  }, [draftScheduleResponse, jarvis, router]);

  const rejectDraftFn = useCallback(async (reason?: string) => {
    const draftId =
      draftScheduleResponse?.draft_id ||
      draftScheduleResponse?.schedule?.draft_id;
    try {
      if (draftId) {
        await rejectDraft(draftId, ["tasks", "schedule"]);
      }
      jarvis.clearDraft();
      setDraftScheduleResponse(null);
      jarvis.showToast("Schedule rejected. Replanning...", "info");
    } catch (err) {
      jarvis.clearDraft();
      setDraftScheduleResponse(null);
      jarvis.showToast(
        err instanceof ApiError && err.status === 409 && err.serverMessage
          ? err.serverMessage
          : "Failed to reject. Try again.",
        "error",
      );
    }
    if (reason) {
      sendMessage(`I rejected the schedule because: ${reason}. Please suggest a different approach.`);
    }
  }, [draftScheduleResponse, sendMessage, jarvis]);

  const startNewConversation = useCallback(() => {
    setConversationLoadError(null);
    setConversationId(null);
    localStorage.removeItem("jarvis-conversation-id");
    setMessages([]);
    clearChatMessages();
    setDraftScheduleResponse(null);
    clearDraftSchedule();
  }, []);

  const loadConversation = useCallback(async (sessionId: string) => {
    setConversationId(sessionId);
    localStorage.setItem("jarvis-conversation-id", sessionId);
    setConversationLoadError(null);
    // Clear draft state when switching conversations
    setDraftScheduleResponse(null);
    clearDraftSchedule();
    try {
      const sessionMessages = await loadConversationAPI(sessionId, USER_ID);
      if (sessionMessages.length === 0) {
        // The session exists but has no messages
        const placeholder: JarvisMessage = {
          id: `msg-${Date.now()}-empty`,
          role: "assistant",
          content: "No messages found for this conversation.",
          isStreaming: false,
          timestamp: Date.now(),
        };
        setMessages([placeholder]);
        saveChatMessages([placeholder]);
        return;
      }
      const loaded: JarvisMessage[] = sessionMessages.map((m, i) => ({
        id: m.id || `msg-${Date.now()}-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        isStreaming: false,
        conversation_id: sessionId,
        message_id: m.id,
        timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
      }));
      setMessages(loaded);
      saveChatMessages(loaded);
    } catch (err) {
      const failure = conversationLoadFailure(err);
      if (failure.kind === "unreachable") {
        // An outage, not a deletion: the conversation stays selected in the sidebar,
        // nothing is stored in its place, and Retry loads it again.
        setMessages([]);
        clearChatMessages();
        setConversationLoadError({ sessionId, headline: failure.headline, detail: failure.detail });
        return;
      }
      // 404 not_found: it may have been deleted.
      const errorPlaceholder: JarvisMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: failure.message,
        isStreaming: false,
        timestamp: Date.now(),
      };
      setMessages([errorPlaceholder]);
      saveChatMessages([errorPlaceholder]);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setConversationLoadError(null);
    setMessages([]);
    setStreamState(INITIAL_STREAM_STATE);
    clearChatMessages();
    clearDraftSchedule();
    setDraftScheduleResponse(null);
  }, []);

  const triggerReplan = useCallback(async () => {
    const lastPlanMsg = [...messages]
      .reverse()
      .find(
        (m) => m.role === "assistant" && m.response?.intent === "PLAN_DAY",
      );
    const lastUserGoal = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    const replanPrompt = lastPlanMsg?.response?.execution_graph?.goal_metadata
      ?.objective
      ? `Replan: ${lastPlanMsg.response.execution_graph.goal_metadata.objective}`
      : lastUserGoal?.content ||
        "Replan my schedule with updated preferences";

    setIsReplanning(true);
    try {
      await sendMessage(replanPrompt);
    } finally {
      setIsReplanning(false);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    streamState,
    isStreaming,
    sendMessage,
    abort,
    clearMessages,
    draftScheduleResponse,
    acceptDraft: acceptDraftFn,
    acceptState,
    rejectDraft: rejectDraftFn,
    conversationId,
    startNewConversation,
    loadConversation,
    conversationLoadError,
    triggerReplan,
    isReplanning,
    modelMode,
    setModelMode,
    devMode,
    toggleDevMode,
    dismissLearningToast,
  };
}
