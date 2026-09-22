"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { useIsTouch } from "@/lib/hooks/useMediaQuery";

interface TooltipProps {
  content: string;
  side?: "right" | "bottom";
  /** Applied to the wrapper — pass `w-full` when the tooltip wraps a grid or flex child. */
  className?: string;
  children: ReactNode;
}

export function Tooltip({ content, side = "bottom", className, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const isTouch = useIsTouch();

  // On a touch screen there is no hover, so the tooltip could only ever appear
  // stuck open after a tap. Render the child on its own instead.
  if (isTouch) {
    return <div className={clsx("relative inline-flex", className)}>{children}</div>;
  }

  return (
    <div
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={clsx(
            "pointer-events-none absolute z-50 max-w-[60vw] truncate rounded-button bg-ink px-2.5 py-1.5 text-xs text-white shadow-md",
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
