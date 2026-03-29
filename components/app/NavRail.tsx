"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  MessageSquare,
  Calendar,
  BookOpen,
  FileText,
  Target,
  Dna,
  BarChart3,
  Command,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
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
  Dna,
  BarChart3,
};

export default function NavRail() {
  const pathname = usePathname();

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
      <div className="flex flex-col items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/30 transition-colors hover:text-white/50"
          aria-label="Command palette"
        >
          <Command size={16} />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-terra text-[11px] font-bold text-ink">
          MM
        </div>
      </div>
    </nav>
  );
}
