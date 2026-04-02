"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  MoreHorizontal,
  ChevronLeft,
  Menu,
  X,
  Loader2,
  Pin,
  PinOff,
} from "lucide-react";
import clsx from "clsx";
import { listSessions, archiveSession, renameSession, pinSession } from "@/lib/api";
import type { Session } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatSessionPanelProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  sidebarWidth?: number;
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
  sidebarWidth = 260,
}: ChatSessionPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({});
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Portal requires client-side mount
  useEffect(() => { setMounted(true); }, []);

  // ---- Fetch sessions ----
  const fetchSessions = useCallback(async () => {
    try {
      const data = await listSessions(undefined, 30);
      const active = data.filter((s) => !s.is_archived);
      setSessions(active);
      // Sync pinned state from backend
      setPinnedIds(new Set(active.filter((s) => s.is_pinned).map((s) => s.id)));
    } catch {
      // Non-critical -- degrade gracefully
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30_000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // ---- Close menu on outside click ----
  useEffect(() => {
    if (!menuOpenId) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
        setMenuPos(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  // ---- Close confirm on outside click ----
  useEffect(() => {
    if (!confirmDeleteId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-confirm-delete="${confirmDeleteId}"]`)) {
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [confirmDeleteId]);

  // ---- Sort sessions: pinned first, then by date ----
  const sortedSessions = useMemo(() => {
    const pinned = sessions.filter((s) => pinnedIds.has(s.id));
    const unpinned = sessions.filter((s) => !pinnedIds.has(s.id));
    return [...pinned, ...unpinned];
  }, [sessions, pinnedIds]);

  // ---- Menu open/close ----
  const handleMenuToggle = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (menuOpenId === sessionId) {
        setMenuOpenId(null);
        setMenuPos(null);
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const MENU_HEIGHT = 130;
        setMenuPos({
          top: Math.min(rect.bottom + 4, window.innerHeight - MENU_HEIGHT - 8),
          right: Math.max(8, window.innerWidth - rect.right),
        });
        setMenuOpenId(sessionId);
      }
    },
    [menuOpenId]
  );

  // ---- Pin / Unpin ----
  const handlePin = useCallback((sessionId: string) => {
    const willPin = !pinnedIds.has(sessionId);
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (willPin) { next.add(sessionId); } else { next.delete(sessionId); }
      return next;
    });
    setMenuOpenId(null);
    setMenuPos(null);
    // Persist to backend (fire-and-forget)
    pinSession(sessionId, willPin).catch(() => {
      // Revert on failure
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (willPin) { next.delete(sessionId); } else { next.add(sessionId); }
        return next;
      });
    });
  }, [pinnedIds]);

  // ---- Rename helpers ----
  const startRename = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      setMenuOpenId(null);
      setMenuPos(null);
      setRenamingId(sessionId);
      setRenameValue(
        renamedTitles[sessionId] || session.title || "New conversation"
      );
    },
    [sessions, renamedTitles]
  );

  const commitRename = useCallback(
    (sessionId: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) {
        setRenamedTitles((prev) => ({ ...prev, [sessionId]: trimmed }));
        // Persist to backend (fire-and-forget)
        renameSession(sessionId, trimmed).catch(() => {
          // Silently degrade — local title stays
        });
      }
      setRenamingId(null);
    },
    [renameValue]
  );

  // ---- Delete (archive) ----
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

  // ---- Current session for portal menu ----
  const menuSession = menuOpenId
    ? sessions.find((s) => s.id === menuOpenId)
    : null;
  const isPinnedMenu = menuOpenId ? pinnedIds.has(menuOpenId) : false;

  // ---- Panel content (shared between desktop + mobile) ----
  const panelContent = (
    <div className="flex flex-col h-full w-full bg-surface-muted/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          Conversations
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded text-muted hover:text-primary transition-colors"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
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
      <div className="px-3 py-2 shrink-0">
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
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 min-h-0">
        {sortedSessions.length === 0 && (
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

        {sortedSessions.map((session) => {
          const isActive = session.id === currentSessionId;
          const isArchiving = archivingId === session.id;
          const isConfirming = confirmDeleteId === session.id;
          const isMenuOpen = menuOpenId === session.id;
          const isRenaming = renamingId === session.id;
          const isPinnedSession = pinnedIds.has(session.id);
          const displayTitle =
            renamedTitles[session.id] || session.title || "New conversation";

          return (
            <div key={session.id}>
              {/* Session row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isRenaming) return;
                  onSelectSession(session.id);
                  setMobileOpen(false);
                  setMenuOpenId(null);
                  setMenuPos(null);
                  setConfirmDeleteId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (isRenaming) return;
                    onSelectSession(session.id);
                    setMobileOpen(false);
                  }
                }}
                className={clsx(
                  "group flex items-center w-full rounded-lg cursor-pointer transition-all text-sm",
                  isActive
                    ? "bg-terra/10 border border-terra/20 text-primary"
                    : "hover:bg-surface-subtle text-primary border border-transparent"
                )}
                style={{ padding: '8px 6px 8px 12px', gap: 6 }}
              >
                {/* Active indicator */}
                {isActive && (
                  <span
                    style={{
                      flexShrink: 0,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-terra)',
                    }}
                  />
                )}

                {/* Title + date — must shrink */}
                <div style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") commitRename(session.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => commitRename(session.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent border border-terra/40 rounded px-1.5 py-0.5 text-[13px] font-medium text-primary outline-none focus:border-terra"
                    />
                  ) : (
                    <p className="truncate font-medium leading-snug text-[13px]">
                      {displayTitle}
                    </p>
                  )}
                  <p className="text-[10px] text-muted mt-0.5">
                    {relativeDate(session.updated_at)}
                    {isPinnedSession && " · pinned"}
                  </p>
                </div>

                {/* Three-dot menu button — flex item, not absolute */}
                {isArchiving ? (
                  <span style={{ flexShrink: 0, padding: 4 }}>
                    <Loader2 size={14} className="animate-spin text-muted" />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleMenuToggle(e, session.id)}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      color: isMenuOpen ? 'var(--text-primary)' : '#9C9488',
                      backgroundColor: isMenuOpen ? '#3A3632' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label="Session options"
                    onMouseEnter={(e) => {
                      if (!isMenuOpen) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2A2724';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMenuOpen) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color = '#9C9488';
                      }
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                )}
              </div>

              {/* Inline delete confirmation */}
              {isConfirming && (
                <div
                  data-confirm-delete={session.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-red-500/5 rounded-b-lg mx-1 mb-0.5"
                >
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
    </div>
  );

  // ---- Portal dropdown menu ----
  const dropdownMenu =
    mounted && menuOpenId && menuPos && menuSession
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 9999,
            }}
            className="w-44 rounded-xl border border-border bg-surface-card shadow-xl py-1.5 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => handlePin(menuOpenId)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-primary hover:bg-surface-subtle transition-colors"
            >
              {isPinnedMenu ? (
                <>
                  <PinOff size={14} className="text-muted" /> Unpin
                </>
              ) : (
                <>
                  <Pin size={14} className="text-muted" /> Pin
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => startRename(menuOpenId)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-primary hover:bg-surface-subtle transition-colors"
            >
              <Pencil size={14} className="text-muted" /> Rename
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={() => {
                const id = menuOpenId;
                setMenuOpenId(null);
                setMenuPos(null);
                // Small delay so the portal unmounts before confirmation shows
                requestAnimationFrame(() => setConfirmDeleteId(id));
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>,
          document.body
        )
      : null;

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
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer — z-50 so it covers the NavRail */}
      <div
        className={clsx(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {panelContent}
      </div>

      {/* Desktop panel */}
      <div
        className="hidden lg:flex shrink-0 h-full transition-[width] duration-200"
        style={{
          width: collapsed ? 0 : sidebarWidth,
          overflow: collapsed ? 'hidden' : 'visible',
        }}
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

      {/* Portal dropdown — rendered outside overflow containers */}
      {dropdownMenu}
    </>
  );
}
