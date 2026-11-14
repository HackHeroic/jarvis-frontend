"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, ArrowRight, X } from "lucide-react";
import clsx from "clsx";

import { chatStream } from "@/lib/api";
import { promptProblem } from "@/lib/chatLimits";
import { Badge } from "@/components/ui/Badge";
import { IS_DEMO_MODE, getIntentColor } from "@/lib/constants";
import { useJarvis } from "@/lib/context/JarvisContext";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";
import { USER_ID } from "@/lib/constants";
import type { PearlInsight, ChatResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Heavy intents that should redirect to full chat
// ---------------------------------------------------------------------------

const HEAVY_INTENTS = new Set(["PLAN_DAY", "INGEST_DOCUMENT"]);

// ---------------------------------------------------------------------------
// Lightweight message type for the panel (no shared state with main chat)
// ---------------------------------------------------------------------------

interface PanelMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

// ---------------------------------------------------------------------------
// PEARL Insight loader
// ---------------------------------------------------------------------------

function loadPearlInsight(): PearlInsight | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("jarvis-last-chat-response");
    if (!raw) return null;
    const parsed: ChatResponse = JSON.parse(raw);
    if (parsed.pearl_insights?.length) return parsed.pearl_insights[0];
  } catch {
    /* ignore */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AIChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIChatPanel({ collapsed, onToggle }: AIChatPanelProps) {
  const router = useRouter();
  const isDemoMode = IS_DEMO_MODE;
  const { conversationId, setConversationId } = useJarvis();
  const isDesktop = useIsDesktop();

  // Lightweight local state — no shared localStorage with main chat
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load PEARL insight
  const pearlInsight = useMemo(() => loadPearlInsight(), []);

  // The mobile sheet covers the page, so freeze the page behind it
  useEffect(() => {
    if (isDesktop || collapsed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDesktop, collapsed]);

  // Escape closes the sheet
  useEffect(() => {
    if (collapsed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onToggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, onToggle]);

  // Last 5 messages (condensed view)
  const condensedMessages = useMemo(() => {
    return messages.slice(-5);
  }, [messages]);

  // Detect if latest assistant response is a heavy intent
  const heavyIntent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.response?.intent) {
        if (HEAVY_INTENTS.has(msg.response.intent)) {
          return msg.response.intent;
        }
        break;
      }
    }
    return null;
  }, [messages]);

  // Over the backend's limit (a 422): say so, and never send it. The panel sends the text as typed.
  const inputProblem = promptProblem(input);

  // Send handler — force 4B mode, use chatStream directly
  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming || promptProblem(input)) return;
    const userText = input;
    setInput("");

    const userMsg: PanelMessage = {
      id: `panel-u-${Date.now()}`,
      role: "user",
      content: userText,
    };

    const assistantMsg: PanelMessage = {
      id: `panel-a-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    chatStream(
      {
        user_prompt: userText,
        user_id: USER_ID,
        // Force cloud model for lightweight sidebar chat — "4b" is a wire value meaning "force cloud"
        model_mode: "4b",
        conversation_id: conversationId || undefined,
      },
      {
        onMessageToken: (token: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + token,
              };
            }
            return updated;
          });
        },
        onComplete: (response: ChatResponse) => {
          if (response.conversation_id) {
            setConversationId(response.conversation_id);
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: response.message || last.content,
                response,
              };
            }
            return updated;
          });
          setIsStreaming(false);
        },
        onError: () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: "Something went wrong. Try again.",
              };
            }
            return updated;
          });
          setIsStreaming(false);
        },
      },
    );
  }, [input, isStreaming, conversationId, setConversationId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Collapsed state — floating "J" button.
  // Sits above the mobile tab bar, and on the right edge on desktop.
  if (collapsed) {
    return (
      <div className="relative w-0 shrink-0">
        <button
          onClick={onToggle}
          className="fab-position z-30 flex h-12 w-12 items-center justify-center rounded-full bg-terra text-base font-bold text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-terra/50 lg:bottom-auto lg:top-1/2 lg:h-10 lg:w-10 lg:-translate-y-1/2 lg:text-sm"
          aria-label="Open Jarvis (Cmd+J)"
          title="Open Jarvis (Cmd+J)"
        >
          J
        </button>
      </div>
    );
  }

  return (
    <aside
      className={clsx(
        // Phones: a full-screen sheet above the page
        "fixed inset-0 z-50 flex flex-col bg-surface-subtle",
        // Desktop: a docked column beside the page
        "lg:static lg:z-auto lg:w-[300px] lg:shrink-0 lg:border-l lg:border-border xl:w-[340px]",
      )}
      role="dialog"
      aria-label="Jarvis AI"
    >
      {/* Header */}
      <div className="sheet-pt flex shrink-0 items-center gap-2.5 border-b border-border px-4 pb-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-terra text-xs font-bold text-white">
          J
        </div>
        <span className="truncate text-sm font-semibold text-primary">Jarvis AI</span>
        {isDemoMode && <Badge color="dusk">DEMO</Badge>}
        <button
          onClick={onToggle}
          className="tap-target -mr-2 ml-auto flex shrink-0 items-center justify-center rounded text-secondary transition-colors hover:text-primary lg:mr-0 lg:h-6 lg:w-6"
          aria-label="Close Jarvis panel"
        >
          <X size={18} className="lg:hidden" />
          <ChevronLeft size={16} className="hidden lg:block" />
        </button>
      </div>

      {/* PEARL Insight Banner */}
      {pearlInsight && (
        <div className="mx-3 mt-3 rounded-[10px] border border-terra/15 bg-terra/[0.08] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-terra">
            PEARL INSIGHT
          </p>
          <p className="mt-1 text-xs text-secondary">
            {pearlInsight.insight}
          </p>
        </div>
      )}

      {/* Messages area — condensed last 5 */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {condensedMessages.length === 0 ? (
          <div className="flex gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-terra text-[10px] font-bold text-white">
              J
            </div>
            <div className="min-w-0 text-[13px] leading-relaxed text-secondary">
              Hi! Ask me anything. For complex planning, I&apos;ll suggest
              opening the full chat.
            </div>
          </div>
        ) : (
          condensedMessages.map((msg) => {
            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div
                    className="max-w-[90%] break-words bg-terra px-3 py-1.5 text-xs text-white"
                    style={{ borderRadius: "10px 10px 2px 10px" }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Assistant — condensed: intent badge + message text only
            const intent = msg.response?.intent;
            const color = intent
              ? (getIntentColor(intent) as "terra" | "sage" | "dusk" | "gold" | "ink")
              : undefined;

            return (
              <div key={msg.id} className="flex gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-terra text-[8px] font-bold text-white mt-0.5">
                  J
                </div>
                <div className="min-w-0 flex-1">
                  {intent && (
                    <Badge color={color}>{intent.replace(/_/g, " ")}</Badge>
                  )}
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-secondary">
                    {msg.content || (msg.response?.message) || "Processing..."}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Heavy intent redirect */}
        {heavyIntent && (
          <div className="rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2.5">
            <p className="text-[11px] text-secondary">
              This needs the full workspace &mdash; open in Chat?
            </p>
            <button
              onClick={() => router.push(conversationId ? `/chat?session=${conversationId}` : "/chat")}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-terra hover:underline"
            >
              Open in Chat <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* Continue in Chat after any assistant response */}
        {messages.length > 0 &&
          messages[messages.length - 1]?.role === "assistant" &&
          !heavyIntent && (
            <button
              onClick={() => router.push(conversationId ? `/chat?session=${conversationId}` : "/chat")}
              className="flex items-center gap-1 text-[11px] font-medium text-terra hover:underline px-1"
            >
              Continue in Chat <ArrowRight size={12} />
            </button>
          )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sheet-pb shrink-0 border-t border-border px-3 pt-3">
        <div className="flex items-end gap-2 rounded-[10px] border border-border bg-surface-card px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-describedby={inputProblem ? "panel-input-note" : undefined}
            aria-invalid={inputProblem !== null}
            placeholder="Ask Jarvis..."
            rows={1}
            className="max-h-20 min-w-0 flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || inputProblem !== null}
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors lg:h-7 lg:w-7",
              input.trim() && !isStreaming && !inputProblem
                ? "bg-terra text-white"
                : "bg-surface-muted text-muted"
            )}
            aria-label="Send message"
          >
            <Send size={16} className="lg:h-3.5 lg:w-3.5" />
          </button>
        </div>
        {inputProblem && (
          <p id="panel-input-note" role="status" className="mt-1.5 px-1 text-[11px] text-gold">
            {inputProblem}
          </p>
        )}
      </div>
    </aside>
  );
}
