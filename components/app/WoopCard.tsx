"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

interface WoopCardProps {
  wish: string;
  outcome?: string;
  obstacle: string;
  plan: string;
  taskId: string;
}

export function WoopCard({ wish, outcome, obstacle, plan, taskId }: WoopCardProps) {
  const storageKey = `woop-dismissed-${taskId}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) === "true";
    }
    return false;
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, String(next));
  };

  if (!obstacle || !plan) return null;

  return (
    <div className="border-l-4 border-dusk rounded-lg bg-surface-subtle p-3 mb-3">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-secondary">
          <Lightbulb size={14} className="text-dusk" />
          <span>Pro tip for this task</span>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-muted" /> : <ChevronUp size={14} className="text-muted" />}
      </button>

      {!collapsed && (
        <div className="mt-2 space-y-1.5 text-xs text-muted">
          <div>
            <span className="text-secondary font-medium">Goal:</span> {wish}
          </div>
          {outcome && (
            <div>
              <span className="text-secondary font-medium">Outcome:</span> &quot;{outcome}&quot;
            </div>
          )}
          <div className="pt-1 border-t border-border">
            <span className="text-terra font-medium">If:</span> {obstacle}
          </div>
          <div>
            <span className="text-sage font-medium">Then:</span> {plan}
          </div>
        </div>
      )}
    </div>
  );
}
