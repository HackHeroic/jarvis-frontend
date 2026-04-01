"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  MessageSquare,
  Calendar,
  BookOpen,
  FileText,
  Target,
  Command,
  Moon,
  Sun,
  Trash2,
  MessageSquareOff,
  Search,
  Plus,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { archiveAllSessions } from "@/lib/api";
import { useThemeContext } from "@/lib/providers";
import { Tooltip } from "@/components/ui/Tooltip";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  House,
  MessageSquare,
  Calendar,
  BookOpen,
  FileText,
  Target,
};

export default function NavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useThemeContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleToggleTheme = () => {
    toggleTheme();
    setMenuOpen(false);
  };

  const clearAllData = () => {
    if (window.confirm("Clear all local data? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const deleteAllChats = async () => {
    if (!window.confirm("Delete all chat conversations? This cannot be undone.")) return;
    try {
      await archiveAllSessions();
      localStorage.removeItem("jarvis-conversation-id");
      localStorage.removeItem("jarvis-chat-messages");
      setMenuOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete chats:", err);
      alert("Could not delete chats. Please try again.");
    }
  };

  // ---- Command palette ----
  const cmdActions = [
    { id: "new-chat", label: "New Chat", icon: Plus, href: "/chat", action: () => { localStorage.removeItem("jarvis-conversation-id"); localStorage.removeItem("jarvis-chat-messages"); router.push("/chat"); } },
    ...NAV_ITEMS.map((item) => ({ id: item.id, label: `Go to ${item.label}`, icon: iconMap[item.icon] || House, href: item.href, action: () => router.push(item.href) })),
    { id: "toggle-theme", label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode", icon: theme === "dark" ? Sun : Moon, href: "", action: handleToggleTheme },
    { id: "delete-all-chats", label: "Delete All Chats", icon: MessageSquareOff, href: "", action: deleteAllChats },
    { id: "clear-data", label: "Clear All Data", icon: Trash2, href: "", action: clearAllData },
  ];

  const filteredActions = cmdQuery
    ? cmdActions.filter((a) => a.label.toLowerCase().includes(cmdQuery.toLowerCase()))
    : cmdActions;

  const openCmd = useCallback(() => {
    setCmdOpen(true);
    setCmdQuery("");
    setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, []);

  const closeCmd = useCallback(() => {
    setCmdOpen(false);
    setCmdQuery("");
  }, []);

  const runAction = useCallback((action: () => void) => {
    closeCmd();
    action();
  }, [closeCmd]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
        if (!cmdOpen) {
          setCmdQuery("");
          setTimeout(() => cmdInputRef.current?.focus(), 50);
        }
      }
      if (e.key === "Escape" && cmdOpen) {
        closeCmd();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cmdOpen, closeCmd]);

  return (
    <nav
      aria-label="Main navigation"
      className="flex w-14 flex-col items-center bg-ink py-4"
    >
      {/* Logo */}
      <Link
        href="/"
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-[10px] bg-terra text-sm font-extrabold text-ink"
      >
        J
      </Link>

      {/* Nav items */}
      <div className="flex flex-1 flex-col items-center gap-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Tooltip key={item.id} content={item.label} side="right">
              <Link
                href={item.href}
                aria-label={item.label}
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
                  isActive
                    ? "bg-white/[0.12] text-white"
                    : "text-white opacity-50 hover:opacity-80 hover:bg-white/[0.08]"
                )}
              >
                {Icon && <Icon size={18} />}
              </Link>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="relative flex flex-col items-center gap-3" ref={menuRef}>
        <Tooltip content="Command Palette (⌘K)" side="right">
          <button
            onClick={openCmd}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/30 transition-colors hover:text-white/50 hover:border-white/20"
            aria-label="Command palette"
          >
            <Command size={16} />
          </button>
        </Tooltip>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-terra text-[11px] font-bold text-ink transition-transform hover:scale-110"
          aria-label="User menu"
        >
          MM
        </button>

        {/* Popover menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-full mb-1 ml-1 w-44 rounded-lg border border-border bg-surface-card p-2 shadow-lg z-50">
            <p className="px-2 py-1.5 text-xs font-semibold text-primary">Madhav</p>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={handleToggleTheme}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-secondary hover:bg-surface-muted hover:text-primary transition-colors"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <button
              onClick={deleteAllChats}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-secondary hover:bg-surface-muted hover:text-primary transition-colors"
            >
              <MessageSquareOff size={14} />
              <span>Delete all chats</span>
            </button>
            <button
              onClick={clearAllData}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear all data</span>
            </button>
          </div>
        )}
      </div>

      {/* Command Palette Modal */}
      {cmdOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeCmd}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-surface-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search size={16} className="text-muted shrink-0" />
                <input
                  ref={cmdInputRef}
                  type="text"
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredActions.length > 0) {
                      runAction(filteredActions[0].action);
                    }
                  }}
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted font-mono">
                  ESC
                </kbd>
              </div>

              {/* Actions list */}
              <div className="max-h-[300px] overflow-y-auto py-1">
                {filteredActions.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted">
                    No matching commands
                  </div>
                )}
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => runAction(action.action)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-primary transition-colors"
                    >
                      {Icon && <Icon size={16} className="shrink-0 text-muted" />}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
