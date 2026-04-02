"use client";

import { useMemo } from "react";
import { X, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";
import type { MemoryRecord } from "@/lib/types";
import { hashCode, PALETTE_ROTATION, MEMORY_TYPE_COLORS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Importance weights — determines group sort order
// ---------------------------------------------------------------------------

const IMPORTANCE_WEIGHTS: Record<string, number> = {
  constraint: 1.0,
  behavioral_pattern: 0.9,
  preference: 0.8,
  temporal_event: 0.8,
  goal: 0.7,
  fact: 0.6,
  feedback: 0.5,
};

function getImportance(type: string): number {
  return IMPORTANCE_WEIGHTS[type] ?? 0.4;
}

function getTypeColor(type: string): string {
  return (
    MEMORY_TYPE_COLORS[type] ??
    PALETTE_ROTATION[hashCode(type) % PALETTE_ROTATION.length]
  );
}

function formatTypeName(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sourceLabel(source?: string): string {
  if (!source) return "unknown";
  const map: Record<string, string> = {
    user: "you told me",
    behavior: "behavior",
    ingestion: "ingestion",
    inferred: "inferred",
  };
  return map[source] ?? source;
}

// ---------------------------------------------------------------------------
// Color mapping to CSS variable classes
// ---------------------------------------------------------------------------

const borderColorClass: Record<string, string> = {
  terra: "border-terra",
  sage: "border-sage",
  dusk: "border-dusk",
  gold: "border-gold",
  ink: "border-ink",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MemoryPanelProps {
  memories: MemoryRecord[];
  isOpen: boolean;
  onClose: () => void;
  onDeleteMemory?: (id: string) => void;
  onConfirmPattern?: (id: string) => void;
  onDismissPattern?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MemoryPanel({
  memories,
  isOpen,
  onClose,
  onDeleteMemory,
  onConfirmPattern,
  onDismissPattern,
}: MemoryPanelProps) {
  // Group memories by memory_type, sorted by importance weight
  const groups = useMemo(() => {
    const grouped: Record<string, MemoryRecord[]> = {};
    for (const mem of memories) {
      const type = mem.memory_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(mem);
    }
    return Object.entries(grouped).sort(
      ([a], [b]) => getImportance(b) - getImportance(a)
    );
  }, [memories]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          "fixed right-0 top-0 z-50 flex h-full w-[320px] flex-col bg-surface-card border-l border-border shadow-xl transition-transform duration-250 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-primary">
            Jarvis&apos;s Memory
          </h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-secondary hover:text-primary transition-colors"
            aria-label="Close memory panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-sm text-secondary">No memories yet.</p>
              <p className="text-xs text-muted mt-1">
                Chat with Jarvis to build up context.
              </p>
            </div>
          ) : (
            groups.map(([type, mems]) => {
              const color = getTypeColor(type);
              const border =
                borderColorClass[color] ?? "border-ink";

              return (
                <div key={type}>
                  {/* Group header */}
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5 px-1">
                    {formatTypeName(type)}
                  </p>

                  {/* Cards */}
                  <div className="space-y-2">
                    {mems.map((mem) => {
                      const isSuperseded = !!mem.superseded_by;
                      const isBehavioral =
                        mem.memory_type === "behavioral_pattern";

                      return (
                        <div
                          key={mem.id}
                          className={clsx(
                            "rounded-lg border-l-[3px] bg-surface-muted px-3 py-2.5 relative group",
                            border,
                            isSuperseded && "opacity-60"
                          )}
                        >
                          {/* Content */}
                          <p
                            className={clsx(
                              "text-xs leading-relaxed text-primary",
                              isSuperseded && "line-through"
                            )}
                          >
                            {isBehavioral && !isSuperseded && (
                              <span className="text-sage font-medium">
                                Jarvis noticed:{" "}
                              </span>
                            )}
                            {mem.content}
                          </p>

                          {isSuperseded && (
                            <p className="text-[10px] text-muted mt-0.5">
                              Updated &rarr;
                            </p>
                          )}

                          {/* Confidence bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-surface-canvas overflow-hidden">
                              <div
                                className={clsx(
                                  "h-full rounded-full transition-all",
                                  mem.confidence >= 0.7
                                    ? "bg-sage"
                                    : mem.confidence >= 0.4
                                      ? "bg-gold"
                                      : "bg-terra"
                                )}
                                style={{
                                  width: `${Math.round(mem.confidence * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-muted min-w-[28px] text-right">
                              {Math.round(mem.confidence * 100)}%
                            </span>
                          </div>

                          {/* Source badge + delete */}
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[9px] font-medium text-muted uppercase tracking-wide bg-surface-canvas px-1.5 py-0.5 rounded">
                              {sourceLabel(mem.source)}
                            </span>
                            {onDeleteMemory && !isSuperseded && (
                              <button
                                onClick={() => onDeleteMemory(mem.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted hover:text-terra transition-opacity text-xs"
                                aria-label="Delete memory"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {/* Behavioral pattern confirm/dismiss */}
                          {isBehavioral && !isSuperseded && (
                            <div className="mt-2 flex gap-2">
                              {onConfirmPattern && (
                                <button
                                  onClick={() => onConfirmPattern(mem.id)}
                                  className="flex items-center gap-1 text-[10px] font-medium text-sage bg-sage/10 px-2 py-1 rounded-md hover:bg-sage/20 transition-colors"
                                >
                                  <CheckCircle size={10} />
                                  Confirm
                                </button>
                              )}
                              {onDismissPattern && (
                                <button
                                  onClick={() => onDismissPattern(mem.id)}
                                  className="flex items-center gap-1 text-[10px] font-medium text-muted bg-surface-canvas px-2 py-1 rounded-md hover:bg-surface-muted transition-colors"
                                >
                                  <XCircle size={10} />
                                  Dismiss
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
