import { Sparkles } from "lucide-react";
import type { LearningMoment } from "@/lib/learning";
import { noticedLines, rememberedLines } from "@/lib/remembered";
import { RememberedLine } from "./RememberedLine";

interface LearningMomentsProps {
  moments: LearningMoment[];
  /** False while the turn is still streaming: Undo appears once the reply is done. */
  canUndo?: boolean;
  /** A memory was forgotten from its line. */
  onMemoryForgotten?: (memoryId: string) => void;
}

/**
 * What Jarvis learned on this turn, shown inline under the reply. Each memory the
 * turn created reads "Remembered: …" and each one it replaced "Updated: …", once,
 * with Undo; a memory it only heard again is not listed. A pattern Jarvis inferred
 * reads "I noticed: …". Only strong patterns also toast.
 */
export function LearningMoments({ moments, canUndo = true, onMemoryForgotten }: LearningMomentsProps) {
  const remembered = rememberedLines(moments);
  const noticed = noticedLines(moments);
  if (remembered.length === 0 && noticed.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1" aria-label="What Jarvis learned">
      {remembered.map((line, i) => (
        <RememberedLine
          key={line.memoryId ?? `line-${i}`}
          line={line}
          canUndo={canUndo}
          onForgotten={onMemoryForgotten}
        />
      ))}
      {noticed.map((n) => (
        <li key={n.key} className="flex items-start gap-1.5 text-xs text-secondary">
          <Sparkles size={12} className="mt-0.5 shrink-0 text-sage" />
          <span className="min-w-0 break-words">
            <span className="font-medium text-primary">I noticed:</span> {n.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
