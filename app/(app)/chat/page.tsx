"use client";

import { useRef, useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { listMemories, deleteMemory, confirmMemory, dismissMemory } from "@/lib/api";
import { PromptSelector } from "@/components/app/PromptSelector";
import { EmptyState } from "@/components/app/EmptyState";
import { ModelModeSelector } from "@/components/app/ModelModeSelector";
import { LearningToast } from "@/components/app/LearningToast";
import { ChatSessionPanel } from "@/components/app/ChatSessionPanel";
import MemoryPanel from "@/components/app/MemoryPanel";
import { toListState } from "@/lib/learning";
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

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
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
    devMode,
    toggleDevMode,
    dismissLearningToast,
  } = useJarvisChat();

  const searchParams = useSearchParams();

  const hasHandledParams = useRef(false);
  useEffect(() => {
    if (hasHandledParams.current) return;
    const sessionParam = searchParams.get("session");
    const promptParam = searchParams.get("prompt");
    if (sessionParam) {
      hasHandledParams.current = true;
      loadConversation(sessionParam);
    } else if (promptParam && messages.length === 0) {
      hasHandledParams.current = true;
      sendMessage(decodeURIComponent(promptParam));
    }
  }, [searchParams, loadConversation, sendMessage, messages.length]);

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isResizing = useRef(false);

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

  // Independently-fetched memories for the panel
  const [panelMemories, setPanelMemories] = useState<MemoryRecord[]>([]);
  const [memoriesError, setMemoriesError] = useState<unknown>(null);

  const refreshMemories = useCallback(async () => {
    try {
      const fresh = await listMemories();
      setPanelMemories(fresh);
      setMemoriesError(null);
    } catch (err) {
      // An outage (5xx) is never "no memories": the panel shows ErrorState with Retry.
      setMemoriesError(err);
    }
  }, []);
  const memoryList = toListState({ items: panelMemories, error: memoriesError });
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

  // ---- Sidebar drag-to-resize ----
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(400, Math.max(180, startWidth + ev.clientX - startX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [sidebarWidth]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-w-0">
      <ChatSessionPanel
        currentSessionId={conversationId}
        onSelectSession={(id) => loadConversation(id)}
        onNewChat={handleNewChat}
        sidebarWidth={sidebarWidth}
      />
      {/* Drag handle — visible separator on desktop */}
      <div
        onMouseDown={handleResizeStart}
        className="hidden lg:block w-px shrink-0 cursor-col-resize relative select-none bg-border"
        title="Drag to resize"
      >
        {/* Wider invisible hit area for easy grabbing */}
        <div
          className="absolute inset-y-0 transition-colors hover:bg-terra/30 active:bg-terra/50"
          style={{ left: -4, right: -4 }}
        />
      </div>
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border py-2 pl-[62px] pr-3 sm:pr-6 lg:pl-6">
          <span className="text-sm font-medium text-primary">Chat</span>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isStreaming || messages.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-secondary transition-colors hover:bg-surface-muted hover:text-primary disabled:pointer-events-none disabled:opacity-40 sm:px-2.5"
            >
              <SquarePen size={14} />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <ModelModeSelector
              value={modelMode}
              onChange={setModelMode}
              disabled={isStreaming}
              devMode={devMode}
              onToggleDevMode={toggleDevMode}
            />
            <button
              type="button"
              onClick={() => {
                setShowMemoryPanel((p) => {
                  if (!p) refreshMemories();
                  return !p;
                });
              }}
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
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6"
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
                        className="max-w-[88%] break-words bg-terra px-4 py-2.5 text-sm text-white sm:max-w-[80%]"
                        style={{ borderRadius: "14px 14px 4px 14px" }}
                      >
                        {msg.fileName && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-white/80 text-xs">
                            <FileText size={12} />
                            <span className="max-w-[160px] truncate">
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
                      className="min-w-0 max-w-full px-1 py-1 text-sm text-primary sm:max-w-[85%]"
                    >
                      <JarvisResponse
                        message={msg}
                        devMode={devMode}
                        onClarificationSelect={(text) => sendMessage(text)}
                        onReplan={() => triggerReplan()}
                        isReplanning={isReplanning}
                        onConfirmTasks={(tasks) => confirmTasks(tasks)}
                        onAcceptDraft={() => acceptDraft()}
                        onRejectDraft={(reason) => rejectDraft(reason)}
                        onChatModify={handleChatModify}
                        onSendMessage={(text) => sendMessage(text)}
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
        <div className="shrink-0 border-t border-border px-3 py-3 sm:px-6">
          <div className="max-w-2xl mx-auto">
            {/* Attachment badge */}
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex items-center gap-1.5 bg-terra/10 border border-terra/20 rounded-lg px-3 py-1.5 text-xs text-terra">
                  <FileText size={12} />
                  <span className="max-w-[140px] truncate sm:max-w-[200px]">
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
                className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-primary transition-colors placeholder:text-muted focus:border-terra/50 focus:outline-none sm:px-4"
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

      {/* PEARL Learning Toast — strong, recurring patterns only (shouldToast) */}
      <LearningToast
        pattern={streamState.latestPattern ?? null}
        onDismiss={dismissLearningToast}
      />

      {/* Memory Panel */}
      <MemoryPanel
        memories={panelMemories.length > 0 ? panelMemories : latestMemories}
        isOpen={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
        onDeleteMemory={async (id: string) => { try { await deleteMemory(id); await refreshMemories(); } catch { /* silently handle */ } }}
        onConfirmPattern={async (id: string) => { try { await confirmMemory(id); await refreshMemories(); } catch { /* silently handle */ } }}
        onDismissPattern={async (id: string) => { try { await dismissMemory(id); await refreshMemories(); } catch { /* silently handle */ } }}
        error={memoryList.kind === "error" ? memoryList.message : null}
        onRetry={refreshMemories}
      />
    </div>
  );
}
