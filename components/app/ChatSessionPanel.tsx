"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Trash2, ChevronLeft, Menu, X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { listSessions, archiveSession } from "@/lib/api";
import type { Session } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatSessionPanelProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatSessionPanel({
  currentSessionId,
  onSelectSession,
  onNewChat,
}: ChatSessionPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // ---- Fetch sessions ----
  const fetchSessions = useCallback(async () => {
    try {
      const data = await listSessions(undefined, 30);
      const active = data
        .filter((s) => !s.is_archived)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      setSessions(active);
    } catch {
      // Non-critical -- degrade gracefully
    }
  }, []);

  // Fetch on mount only. A 30-second interval avoids flooding the backend
  // while keeping the list reasonably fresh.
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30_000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // ---- Delete (archive) single session ----
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      setConfirmDeleteId((prev) => (prev === sessionId ? null : sessionId));
    },
    []
  );

  const handleDeleteConfirm = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      setConfirmDeleteId(null);
      setArchivingId(sessionId);
      try {
        await archiveSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (sessionId === currentSessionId) {
          onNewChat();
        }
      } catch {
        // Silently degrade
      } finally {
        setArchivingId(null);
      }
    },
    [currentSessionId, onNewChat]
  );

  // ---- Clear all sessions ----
  const handleClearAll = useCallback(async () => {
    setClearingAll(true);
    setConfirmClearAll(false);
    try {
      await Promise.all(sessions.map((s) => archiveSession(s.id)));
      setSessions([]);
      localStorage.removeItem("jarvis-conversation-id");
      localStorage.removeItem("jarvis-chat-messages");
      onNewChat();
    } catch {
      // Silently degrade
    } finally {
      setClearingAll(false);
    }
  }, [sessions, onNewChat]);

  // ---- Panel content (shared between desktop + mobile) ----
  const panelContent = (
    <div className="flex flex-col h-full bg-surface-muted/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          Conversations
        </span>
        <div className="flex items-center gap-1">
          {/* Close on mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded text-muted hover:text-primary transition-colors"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
          {/* Collapse on desktop */}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden lg:flex p-1 rounded text-muted hover:text-primary transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* New Chat button */}
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            setMobileOpen(false);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-terra hover:bg-terra/90 transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <MessageSquare size={24} className="text-muted mb-2 opacity-40" />
            <p className="text-xs text-muted text-center">
              No conversations yet
            </p>
            <p className="text-[10px] text-muted/60 text-center mt-1">
              Start chatting to see your history here
            </p>
          </div>
        )}

        {sessions.map((session) => {
          const isActive = session.id === currentSessionId;
          const isArchiving = archivingId === session.id;
          const isConfirming = confirmDeleteId === session.id;

          return (
            <div key={session.id} className="relative">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectSession(session.id);
                  setMobileOpen(false);
                  setConfirmDeleteId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectSession(session.id);
                    setMobileOpen(false);
                  }
                }}
                className={clsx(
                  "group relative flex items-center gap-2 w-full px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm",
                  isActive
                    ? "bg-terra/10 border border-terra/20 text-primary"
                    : "hover:bg-surface-subtle text-primary border border-transparent"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-terra" />
                )}

                {/* Title + date */}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium leading-snug text-[13px]">
                    {session.title || "New conversation"}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {relativeDate(session.updated_at)}
                  </p>
                </div>

                {/* Delete button -- always visible */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  disabled={isArchiving}
                  className="shrink-0 p-1.5 rounded text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  aria-label="Delete conversation"
                  title="Delete"
                >
                  {isArchiving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>

              {/* Inline confirmation */}
              {isConfirming && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px]">
                  <span className="text-muted">Delete?</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConfirm(e, session.id)}
                    className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 font-medium transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                    className="px-2 py-0.5 rounded text-muted hover:text-primary transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Clear All button */}
      {sessions.length > 0 && (
        <div className="px-3 py-2 border-t border-border">
          {confirmClearAll ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">Clear all conversations?</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                >
                  {clearingAll ? "Clearing..." : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1 rounded text-[11px] text-muted hover:text-primary transition-colors"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              disabled={clearingAll}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
            >
              {clearingAll ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
              {clearingAll ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-16 z-40 p-2 rounded-lg bg-surface-card border border-border text-muted hover:text-primary shadow-sm transition-colors"
        aria-label="Open sessions"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={clsx(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-[260px] transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {panelContent}
      </div>

      {/* Desktop panel */}
      <div
        className={clsx(
          "hidden lg:flex shrink-0 h-full border-r border-border transition-all duration-200 overflow-hidden",
          collapsed ? "w-0" : "w-[260px]"
        )}
      >
        {!collapsed && panelContent}
      </div>

      {/* Desktop expand button (when collapsed) */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed top-3 left-16 z-20 p-2 rounded-lg bg-surface-card border border-border text-muted hover:text-primary shadow-sm transition-colors"
          aria-label="Expand sessions panel"
        >
          <Menu size={16} />
        </button>
      )}
    </>
  );
}
