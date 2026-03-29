"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  JarvisMessage,
  JarvisStreamState,
  ChatResponse,
  PhaseEvent,
} from "@/lib/types";
import { INITIAL_STREAM_STATE } from "@/lib/types";
import type { ModelMode } from "@/components/app/ModelModeSelector";
import { DEMO_USER } from "@/lib/constants";
import { sendChat } from "@/lib/api";
import {
  loadChatMessages,
  saveChatMessages,
  getConversationId,
} from "@/lib/store";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useJarvisChat() {
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [streamState, setStreamState] =
    useState<JarvisStreamState>(INITIAL_STREAM_STATE);
  const [isStreaming, setIsStreaming] = useState(false);
  const [modelMode, setModelMode] = useState<ModelMode>("auto");
  const conversationId = useRef<string>(
    getConversationId() ?? `conv-${Date.now()}`
  );
  const hasLoadedRef = useRef(false);

  // Load persisted messages on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const persisted = loadChatMessages();
    if (persisted.length > 0) {
      setMessages(persisted);
    }
  }, []);

  // Persist non-streaming messages
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const toSave = messages.filter((m) => !m.isStreaming);
    if (toSave.length > 0) {
      saveChatMessages(toSave);
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      const now = Date.now();
      const userMsg: JarvisMessage = {
        id: `msg-${now}-user`,
        role: "user",
        content: trimmed,
        timestamp: now,
        conversationId: conversationId.current,
      };

      const assistantMsg: JarvisMessage = {
        id: `msg-${now}-assistant`,
        role: "assistant",
        content: "",
        isStreaming: true,
        timestamp: now + 1,
        conversationId: conversationId.current,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setStreamState((s) => ({
        ...s,
        phase: "connecting",
        reasoning: "",
        message: "",
        error: null,
      }));

      try {
        const response: ChatResponse = await sendChat(trimmed, {
          userId: DEMO_USER.id,
          conversationId: conversationId.current,
          modelMode,
        });

        const phaseHistory: PhaseEvent[] = [];
        const model = response.generation_metrics?.model ?? null;

        // Phase: connecting
        phaseHistory.push({ phase: "connecting", message: "Connecting to Jarvis...", timestamp: Date.now() });
        setStreamState((s) => ({
          ...s,
          phase: "connecting",
          phaseHistory: [...phaseHistory],
        }));
        await delay(300);

        // Phase: brain_dump_extraction
        phaseHistory.push({ phase: "brain_dump_extraction", message: "Extracting context...", timestamp: Date.now() });
        setStreamState((s) => ({
          ...s,
          phase: "brain_dump_extraction",
          phaseHistory: [...phaseHistory],
        }));
        await delay(500);

        // Phase: intent_classified
        phaseHistory.push({ phase: "intent_classified", message: `Intent: ${response.intent ?? "general"}`, timestamp: Date.now() });
        setStreamState((s) => ({
          ...s,
          phase: "intent_classified",
          intent: response.intent ?? null,
          phaseHistory: [...phaseHistory],
        }));
        await delay(400);

        // Phase: reasoning
        phaseHistory.push({ phase: "reasoning", message: "Reasoning...", timestamp: Date.now() });
        setStreamState((s) => ({
          ...s,
          phase: "reasoning",
          reasoning: response.thinking_process ?? "",
          phaseHistory: [...phaseHistory],
          activeModel: model,
        }));
        await delay(800);

        // Phase: responding
        phaseHistory.push({ phase: "responding", message: "Generating response...", timestamp: Date.now() });
        setStreamState((s) => ({
          ...s,
          phase: "responding",
          message: response.message,
          phaseHistory: [...phaseHistory],
          activeModel: model,
        }));
        await delay(300);

        // Complete
        phaseHistory.push({ phase: "complete", message: "Done", timestamp: Date.now() });
        setStreamState((s) => ({
          ...s,
          phase: "complete",
          phaseHistory: [...phaseHistory],
          activeModel: model,
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: response.message,
                  reasoning: response.thinking_process,
                  phaseHistory: [...phaseHistory],
                  response,
                  isStreaming: false,
                }
              : m
          )
        );
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : "Something went wrong";
        setStreamState((s) => ({
          ...s,
          phase: "error",
          error: errorText,
        }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: `Sorry, I ran into an error: ${errorText}`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, modelMode]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamState(INITIAL_STREAM_STATE);
    saveChatMessages([]);
  }, []);

  return {
    messages,
    streamState,
    isStreaming,
    sendMessage,
    clearMessages,
    conversationId: conversationId.current,
    modelMode,
    setModelMode,
  };
}
