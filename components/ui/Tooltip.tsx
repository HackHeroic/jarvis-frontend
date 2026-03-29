"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

interface TooltipProps {
  content: string;
  side?: "right" | "bottom";
  children: ReactNode;
}

export function Tooltip({ content, side = "bottom", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={clsx(
            "absolute z-50 whitespace-nowrap rounded-button bg-ink px-2.5 py-1.5 text-xs text-white shadow-md",
            side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-1.5",
            side === "right" && "left-full top-1/2 -translate-y-1/2 ml-1.5",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
