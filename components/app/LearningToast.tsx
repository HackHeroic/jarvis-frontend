"use client";

import { useEffect, useState } from "react";
import { Brain, X } from "lucide-react";
import clsx from "clsx";
import type { PatternDetectedEvent } from "@/lib/types";

interface LearningToastProps {
  pattern: PatternDetectedEvent | null;
  onDismiss: () => void;
  onUndo?: () => void;
}

export function LearningToast({ pattern, onDismiss, onUndo }: LearningToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pattern) {
      setVisible(false);
      return;
    }
    if (pattern.confidence < 0.7 || pattern.occurrence_count < 3) {
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 10_000);
    return () => clearTimeout(timer);
  }, [pattern, onDismiss]);

  if (!visible || !pattern) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-6 right-6 max-w-sm p-4 rounded-xl shadow-lg border",
        "bg-surface-card border-gold/30",
        "translate-y-0 opacity-100 transition-all duration-300"
      )}
    >
      <div className="flex items-start gap-3">
        <Brain size={20} className="text-gold flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-secondary mb-1">
            Sir, I&apos;ve noticed something
          </p>
          <p className="text-xs text-muted leading-relaxed">
            {pattern.content}
          </p>
          {pattern.action && pattern.action !== "none" && (
            <p className="text-[10px] text-muted/60 mt-1">
              Action taken: {pattern.action.replace(/_/g, " ")}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setVisible(false); onDismiss(); }}
              className="px-3 py-1 text-[10px] font-medium rounded-md bg-surface-muted text-secondary hover:bg-surface-subtle transition-colors"
            >
              Got it
            </button>
            {onUndo && (
              <button
                onClick={() => { setVisible(false); onUndo(); }}
                className="px-3 py-1 text-[10px] font-medium rounded-md text-terra hover:bg-terra/10 transition-colors"
              >
                Undo
              </button>
            )}
          </div>
        </div>
        <button onClick={() => { setVisible(false); onDismiss(); }} className="text-muted/40 hover:text-muted">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
