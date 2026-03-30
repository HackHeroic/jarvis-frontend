"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
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
  const { theme, toggleTheme } = useThemeContext();
  const [menuOpen, setMenuOpen] = useState(false);
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
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/30 transition-colors hover:text-white/50"
          aria-label="Command palette"
        >
          <Command size={16} />
        </button>
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
              onClick={clearAllData}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear all data</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
