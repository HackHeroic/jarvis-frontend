import { Brain, Sparkles } from "lucide-react";
import type { LearningMoment } from "@/lib/learning";

interface LearningMomentsProps {
  moments: LearningMoment[];
}

/**
 * What Jarvis learned on this turn, shown inline under the reply. Something the
 * user said reads "Noted — you said: …"; something Jarvis inferred reads
 * "I noticed: …". Every moment shows here; only strong patterns also toast.
 */
export function LearningMoments({ moments }: LearningMomentsProps) {
  if (moments.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1" aria-label="What Jarvis learned">
      {moments.map((m, i) => (
        <li
          key={`${m.kind}-${m.id}-${i}`}
          className="flex items-start gap-1.5 text-xs text-secondary"
        >
          {m.provenance === "said" ? (
            <Brain size={12} className="mt-0.5 shrink-0 text-dusk" />
          ) : (
            <Sparkles size={12} className="mt-0.5 shrink-0 text-sage" />
          )}
          <span className="min-w-0 break-words">
            <span className="font-medium text-primary">
              {m.provenance === "said" ? "Noted — you said:" : "I noticed:"}
            </span>{" "}
            {m.content}
          </span>
        </li>
      ))}
    </ul>
  );
}
