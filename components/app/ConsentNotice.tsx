import { CirclePause } from "lucide-react";

interface ConsentNoticeProps {
  reason: string;
  module: string;
}

/** `planning_module` → `planning`. */
function moduleLabel(module: string): string {
  return module.replace(/_module$/, "").replace(/_/g, " ");
}

/**
 * The turn paused because a step needs the user's go-ahead. It only explains
 * why: there is no approve button, because the backend has no resume path yet.
 */
export function ConsentNotice({ reason, module }: ConsentNoticeProps) {
  return (
    <div role="status" className="mt-3 flex items-start gap-2 rounded-card border border-dusk/30 bg-dusk/5 p-3">
      <CirclePause size={16} className="mt-0.5 shrink-0 text-dusk" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-primary">Paused for your go-ahead</p>
        <p className="mt-0.5 break-words text-xs text-secondary">
          {reason || "This step needs your say-so before Jarvis goes further."}
        </p>
        {module && (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
            {moduleLabel(module)}
          </p>
        )}
      </div>
    </div>
  );
}
