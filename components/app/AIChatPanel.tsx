"use client";

import { useState } from "react";
import { ChevronLeft, Paperclip, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useModeContext } from "@/lib/providers";
import clsx from "clsx";

interface AIChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AIChatPanel({ collapsed, onToggle }: AIChatPanelProps) {
  const [message, setMessage] = useState("");
  const { isDemoMode } = useModeContext();

  if (collapsed) {
    return (
      <div className="relative w-0">
        <button
          onClick={onToggle}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-terra text-sm font-bold text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-terra/50"
          aria-label="Open Jarvis (Cmd+J)"
          title="Open Jarvis (Cmd+J)"
        >
          J
        </button>
      </div>
    );
  }

  return (
    <aside className="flex w-[280px] flex-col border-l border-border bg-surface-subtle">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-terra text-xs font-bold text-white">
          J
        </div>
        <span className="text-sm font-semibold text-primary">Jarvis AI</span>
        {isDemoMode && <Badge color="dusk">DEMO</Badge>}
        <button
          onClick={onToggle}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-secondary transition-colors hover:text-primary"
          aria-label="Collapse chat panel"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* PEARL Insight Banner */}
      <div className="mx-3 mt-3 rounded-[10px] border border-terra/15 bg-terra/[0.08] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-terra">
          PEARL INSIGHT
        </p>
        <p className="mt-1 text-xs text-secondary">
          You focus best in 25-min blocks after a warm-up task. Starting with
          review today.
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-terra text-[10px] font-bold text-white">
            J
          </div>
          <div className="text-[13px] leading-relaxed text-secondary">
            Good morning! I&apos;ve optimized your schedule based on yesterday&apos;s
            focus patterns. Ready to start with Calculus review?
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2 rounded-[10px] border border-border bg-surface-card px-3 py-2">
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center text-muted transition-colors hover:text-secondary"
            aria-label="Attach file"
          >
            <Paperclip size={15} />
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Jarvis..."
            rows={1}
            className="max-h-20 flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          <button
            className={clsx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              message.trim()
                ? "bg-terra text-white"
                : "bg-surface-muted text-muted"
            )}
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
