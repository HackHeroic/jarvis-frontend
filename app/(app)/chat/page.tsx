"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Paperclip, ArrowUp } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useJarvisChat } from "@/lib/hooks/useJarvisChat";
import { ThinkingProcess } from "@/components/app/ThinkingProcess";
import { PromptSelector } from "@/components/app/PromptSelector";
import { EmptyState } from "@/components/app/EmptyState";

export default function ChatPage() {
  const {
    messages,
    isStreaming,
    sendMessage,
  } = useJarvisChat();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput("");
    sendMessage(msg);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handlePromptSelect = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyState
              icon="💬"
              headline="What's on your mind?"
              subtitle="Brain-dump your goals, deadlines, or habits — Jarvis will turn them into a plan."
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
                      style={{
                        borderRadius: "14px 14px 4px 14px",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Assistant message
              const resp = msg.response;
              const metrics = resp?.generation_metrics;
              const clarifications = resp?.clarification_options;
              const thinkingDuration = metrics?.total_time_ms
                ? Math.round(metrics.total_time_ms / 1000)
                : 2;

              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className="bg-surface-muted text-primary px-4 py-2.5 text-sm max-w-[85%]"
                    style={{
                      borderRadius: "14px 14px 14px 4px",
                    }}
                  >
                    {/* Thinking process */}
                    {msg.reasoning && (
                      <ThinkingProcess
                        reasoning={msg.reasoning}
                        isStreaming={!!msg.isStreaming}
                        durationSec={thinkingDuration}
                      />
                    )}

                    {/* Message body */}
                    {msg.isStreaming && !msg.content ? (
                      <div className="flex items-center gap-1 py-2">
                        <span className="animate-bounce [animation-delay:0ms] w-1.5 h-1.5 rounded-full bg-terra inline-block" />
                        <span className="animate-bounce [animation-delay:150ms] w-1.5 h-1.5 rounded-full bg-terra inline-block" />
                        <span className="animate-bounce [animation-delay:300ms] w-1.5 h-1.5 rounded-full bg-terra inline-block" />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:text-primary prose-p:text-primary prose-strong:text-primary prose-li:text-primary prose-code:text-terra prose-code:bg-surface-subtle prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Generation metrics */}
                    {metrics && !msg.isStreaming && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                        {metrics.model && <span>{metrics.model}</span>}
                        {metrics.tokens_per_second && (
                          <span>{metrics.tokens_per_second} tok/s</span>
                        )}
                        {metrics.total_time_ms && (
                          <span>
                            {(metrics.total_time_ms / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    )}

                    {/* Clarification options */}
                    {clarifications &&
                      clarifications.length > 0 &&
                      !msg.isStreaming && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {clarifications.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => sendMessage(opt)}
                              className="border border-terra/30 text-terra text-xs px-3 py-1.5 rounded-full hover:bg-terra/10 transition-colors"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                    {/* PEARL Insights */}
                    {msg.response?.pearl_insights && !msg.isStreaming && (
                      <div className="mt-2 space-y-1.5">
                        {msg.response.pearl_insights.map((insight, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-terra/[0.08] border border-terra/15">
                            <p className="text-[10px] font-semibold text-terra tracking-wide mb-0.5">PEARL INSIGHT</p>
                            <p className="text-xs leading-relaxed">{insight.insight}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <button
            type="button"
            className="flex-shrink-0 p-2 text-muted hover:text-secondary transition-colors"
            aria-label="Attach file"
          >
            <Paperclip size={18} />
          </button>

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

          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming}
            className={clsx(
              "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
              input.trim()
                ? "bg-terra text-white hover:bg-terra/90"
                : "bg-surface-muted text-muted"
            )}
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
