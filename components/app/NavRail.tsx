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
  User,
  Command,
  Moon,
  Sun,
  Trash2,
  MessageSquareOff,
  Search,
  Plus,
  X,
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
  User,
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

  // Close the account sheet whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const isActiveHref = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const accountMenuItems = (
    <>
      <button
        onClick={handleToggleTheme}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-primary md:py-1.5 md:text-xs"
      >
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
      </button>
      <button
        onClick={deleteAllChats}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-primary md:py-1.5 md:text-xs"
      >
        <MessageSquareOff size={15} />
        <span>Delete all chats</span>
      </button>
      <button
        onClick={clearAllData}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 md:py-1.5 md:text-xs"
      >
        <Trash2 size={15} />
        <span>Clear all data</span>
      </button>
    </>
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Desktop / tablet: vertical rail                                     */}
      {/* ------------------------------------------------------------------ */}
      <nav
        aria-label="Main navigation"
        className="hidden w-14 shrink-0 flex-col items-center bg-ink py-4 md:flex"
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
            const isActive = isActiveHref(item.href);

            return (
              <Tooltip key={item.id} content={item.label} side="right">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
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
            aria-expanded={menuOpen}
          >
            MM
          </button>

          {/* Popover menu */}
          {menuOpen && (
            <div className="absolute bottom-full left-full z-50 mb-1 ml-1 w-44 rounded-lg border border-border bg-surface-card p-2 shadow-lg">
              <p className="px-2 py-1.5 text-xs font-semibold text-primary">Madhav</p>
              <div className="my-1 h-px bg-border" />
              {accountMenuItems}
            </div>
          )}
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile: bottom tab bar                                              */}
      {/* ------------------------------------------------------------------ */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/10 bg-ink pb-safe md:hidden"
        style={{ height: "calc(var(--bottom-nav-h) + var(--safe-bottom))" }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = isActiveHref(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-1 transition-colors",
                isActive ? "text-terra" : "text-white/45 active:text-white/80"
              )}
            >
              {Icon && <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />}
              <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}

        {/* Account / settings */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-1 text-white/45 transition-colors active:text-white/80"
          aria-label="Account and settings"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-terra text-[9px] font-bold text-ink">
            MM
          </span>
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>

      {/* Mobile account sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface-card p-3 pb-safe shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-sm font-semibold text-primary">Madhav</p>
              <button
                onClick={() => setMenuOpen(false)}
                className="tap-target -mr-2 flex items-center justify-center rounded-lg text-secondary transition-colors hover:text-primary"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                setMenuOpen(false);
                openCmd();
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
            >
              <Command size={15} />
              <span>Command palette</span>
            </button>
            {accountMenuItems}
            <div className="h-2" />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Command palette (shared)                                            */}
      {/* ------------------------------------------------------------------ */}
      {cmdOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            onClick={closeCmd}
            aria-hidden="true"
          />
          <div className="pointer-events-none fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh] sm:pt-[20vh]">
            <div
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search size={16} className="shrink-0 text-muted" />
                <input
                  ref={cmdInputRef}
                  type="text"
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Type a command..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredActions.length > 0) {
                      runAction(filteredActions[0].action);
                    }
                  }}
                />
                <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-flex">
                  ESC
                </kbd>
                <button
                  onClick={closeCmd}
                  className="shrink-0 rounded p-1 text-muted transition-colors hover:text-primary sm:hidden"
                  aria-label="Close command palette"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Actions list */}
              <div className="max-h-[50vh] overflow-y-auto py-1 sm:max-h-[300px]">
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
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-primary sm:py-2.5"
                    >
                      {Icon && <Icon size={16} className="shrink-0 text-muted" />}
                      <span className="truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
