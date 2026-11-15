"use client";

import { useState } from "react";
import { Eye, EyeOff, HelpCircle, Lightbulb } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/app/Markdown";
import { revealedLabel } from "@/lib/workspace";
import type { Quiz } from "@/lib/types";

interface QuizCardProps {
  quiz: Quiz;
  /** Why the quiz was made (e.g. which document it is drawn from). */
  rationale?: string;
}

/**
 * A quiz to work through: every question listed, each answer hidden until "Show
 * answer" (and a hint behind "Hint" when there is one). Only a count of how many
 * answers are showing; no score.
 */
export function QuizCard({ quiz, rationale }: QuizCardProps) {
  const total = quiz.questions.length;
  const [answers, setAnswers] = useState<boolean[]>(() => new Array(total).fill(false));
  const [hints, setHints] = useState<boolean[]>(() => new Array(total).fill(false));
  const revealed = answers.filter(Boolean).length;

  const flip = (set: typeof setAnswers, index: number) =>
    set((prev) => prev.map((on, i) => (i === index ? !on : on)));

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage/15">
          <HelpCircle size={16} className="text-sage" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-primary">{quiz.title}</p>
          {rationale && <p className="break-words text-xs text-muted">{rationale}</p>}
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-secondary tabular-nums" aria-live="polite">
          {revealedLabel(revealed, total)}
        </span>
      </div>

      <ol className="divide-y divide-border border-t border-border">
        {quiz.questions.map((q, i) => {
          return (
            <li key={i} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted tabular-nums">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <Markdown className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{q.question}</Markdown>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => flip(setAnswers, i)}
                      aria-expanded={answers[i]}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1 text-xs font-medium transition-colors max-md:min-h-10",
                        answers[i]
                          ? "border-sage/40 bg-sage/10 text-sage"
                          : "border-border text-primary hover:bg-surface-subtle",
                      )}
                    >
                      {answers[i] ? <EyeOff size={12} /> : <Eye size={12} />}
                      {answers[i] ? "Hide answer" : "Show answer"}
                    </button>
                    {q.hint && (
                      <button
                        type="button"
                        onClick={() => flip(setHints, i)}
                        aria-expanded={hints[i]}
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1 text-xs font-medium transition-colors max-md:min-h-10",
                          hints[i]
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-border text-secondary hover:bg-surface-subtle",
                        )}
                      >
                        <Lightbulb size={12} />
                        Hint
                      </button>
                    )}
                  </div>

                  {q.hint && hints[i] && (
                    <div className="mt-2 rounded-lg bg-gold/10 px-3 py-2">
                      <Markdown className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{q.hint}</Markdown>
                    </div>
                  )}

                  {answers[i] && (
                    <div className="mt-2 rounded-lg border-l-[3px] border-sage bg-surface-subtle px-3 py-2">
                      <Markdown className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{q.answer}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
