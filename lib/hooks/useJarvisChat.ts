"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  JarvisMessage,
  JarvisStreamState,
  ChatResponse,
} from "@/lib/types";
import { INITIAL_STREAM_STATE } from "@/lib/types";
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
        });

        // Simulate reasoning phase
        if (response.thinking_process) {
          setStreamState((s) => ({
            ...s,
            phase: "reasoning",
            reasoning: response.thinking_process ?? "",
          }));
          await delay(400);
        }

        // Simulate responding phase
        setStreamState((s) => ({
          ...s,
          phase: "responding",
          message: response.message,
        }));
        await delay(300);

        // Complete
        setStreamState((s) => ({ ...s, phase: "complete" }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: response.message,
                  reasoning: response.thinking_process,
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
    [isStreaming]
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
  };
}
