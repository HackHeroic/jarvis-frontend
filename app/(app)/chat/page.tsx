"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  Paperclip,
  ArrowUp,
  Square,
  SquarePen,
  X,
  FileText,
  Brain,
} from "lucide-react";
import clsx from "clsx";

import { useJarvisChat } from "@/lib/hooks/useJarvisChat";
import { JarvisResponse } from "@/components/app/JarvisResponse";
import { approveCalendar, rejectCalendar } from "@/lib/api";
import { PromptSelector } from "@/components/app/PromptSelector";
import { EmptyState } from "@/components/app/EmptyState";
import { ModelModeSelector } from "@/components/app/ModelModeSelector";
import { ChatSessionPanel } from "@/components/app/ChatSessionPanel";
import MemoryPanel from "@/components/app/MemoryPanel";
import type { MemoryRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// Attachment type
// ---------------------------------------------------------------------------

interface FileAttachment {
  base64: string;
  mediaType: string;
  fileName: string;
}

// ---------------------------------------------------------------------------
// Chat Page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const {
    messages,
    streamState,
    isStreaming,
    sendMessage,
    abort,
    modelMode,
    setModelMode,
    conversationId,
    startNewConversation,
    loadConversation,
    triggerReplan,
    isReplanning,
    confirmTasks,
    acceptDraft,
    rejectDraft,
  } = useJarvisChat();

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  // Collect memories from latest assistant response
  const latestMemories: MemoryRecord[] = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.response?.memories?.length) {
        return msg.response.memories;
      }
    }
    return [];
  }, [messages]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ---- Auto-scroll on new messages / streaming updates ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.message]);

  // ---- Auto-resize textarea ----
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // ---- Send ----
  const handleSend = useCallback(() => {
    if (!input.trim() && !attachment) return;
    if (isStreaming) return;

    const msg = input;
    setInput("");

    const options = attachment
      ? {
          fileBase64: attachment.base64,
          mediaType: attachment.mediaType,
          fileName: attachment.fileName,
        }
      : undefined;

    setAttachment(null);
    sendMessage(msg, options);
  }, [input, isStreaming, sendMessage, attachment]);

  // ---- Keyboard ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ---- File upload ----
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType =
          file.type === "application/pdf"
            ? "pdf"
            : file.type === "image/png"
              ? "png"
              : "jpeg";
        setAttachment({ base64, mediaType, fileName: file.name });
      };
      reader.readAsDataURL(file);
      // Reset input so re-selecting same file triggers change
      e.target.value = "";
    },
    []
  );

  // ---- Prompt selector ----
  const handlePromptSelect = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  // ---- New chat handler ----
  const handleNewChat = useCallback(() => {
    startNewConversation();
    setInput("");
    setAttachment(null);
  }, [startNewConversation]);

  // Focus chat input for "Chat to modify" flow
  const handleChatModify = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full">
      <ChatSessionPanel
        currentSessionId={conversationId}
        onSelectSession={(id) => loadConversation(id)}
        onNewChat={handleNewChat}
      />
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-2 shrink-0">
          <span className="text-sm font-medium text-primary">Chat</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isStreaming || messages.length === 0}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-secondary transition-colors hover:bg-surface-muted hover:text-primary disabled:opacity-40 disabled:pointer-events-none"
            >
              <SquarePen size={14} />
              <span>New Chat</span>
            </button>
            <ModelModeSelector
              value={modelMode}
              onChange={setModelMode}
              disabled={isStreaming}
            />
            <button
              type="button"
              onClick={() => setShowMemoryPanel((p) => !p)}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                showMemoryPanel
                  ? "bg-dusk/15 text-dusk"
                  : "text-secondary hover:bg-surface-muted hover:text-primary"
              )}
              title="Jarvis's Memory"
            >
              <Brain size={14} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full">
              <EmptyState
                icon="💬"
                headline="What's on your mind?"
                subtitle="Brain-dump your goals, deadlines, or habits -- Jarvis will turn them into a plan."
              />
              <PromptSelector onSelect={handlePromptSelect} />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div
                        className="bg-terra text-white px-4 py-2.5 text-sm max-w-[80%]"
                        style={{ borderRadius: "14px 14px 4px 14px" }}
                      >
                        {msg.fileName && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-white/80 text-xs">
                            <FileText size={12} />
                            <span className="truncate max-w-[160px]">
                              {msg.fileName}
                            </span>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // Assistant message -- delegate to JarvisResponse
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div
                      className="bg-surface-muted text-primary px-4 py-2.5 text-sm max-w-[85%]"
                      style={{ borderRadius: "14px 14px 14px 4px" }}
                    >
                      <JarvisResponse
                        message={msg}
                        onClarificationSelect={(text) => sendMessage(text)}
                        onReplan={() => triggerReplan()}
                        isReplanning={isReplanning}
                        onConfirmTasks={(tasks) => confirmTasks(tasks)}
                        onAcceptDraft={() => acceptDraft()}
                        onRejectDraft={() => rejectDraft()}
                        onChatModify={handleChatModify}
                        onCalendarApproved={(id) => approveCalendar(id)}
                        onCalendarRejected={(id) => rejectCalendar(id)}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border px-6 py-3 shrink-0">
          <div className="max-w-2xl mx-auto">
            {/* Attachment badge */}
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex items-center gap-1.5 bg-terra/10 border border-terra/20 rounded-lg px-3 py-1.5 text-xs text-terra">
                  <FileText size={12} />
                  <span className="truncate max-w-[200px]">
                    {attachment.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="ml-1 p-0.5 rounded hover:bg-terra/20 transition-colors"
                    aria-label="Remove attachment"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Paperclip button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 p-2 text-muted hover:text-secondary transition-colors"
                aria-label="Attach file"
              >
                <Paperclip size={18} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Tell Jarvis what's on your mind..."
                className="flex-1 resize-none bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-terra/50 transition-colors"
                style={{ maxHeight: "120px" }}
              />

              {/* Send / Stop button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={abort}
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  aria-label="Stop generating"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() && !attachment}
                  className={clsx(
                    "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    input.trim() || attachment
                      ? "bg-terra text-white hover:bg-terra/90"
                      : "bg-surface-muted text-muted cursor-not-allowed"
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Memory Panel */}
      <MemoryPanel
        memories={latestMemories}
        isOpen={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
      />
    </div>
  );
}
