import { ClipboardList, Timer, Flame, Brain } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";

interface StatsStripProps {
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;
  streakDays: number;
  patternsLearned?: number;
}

const CARD = "flex w-full items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-4";
const ICON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9";
const VALUE = "truncate text-base font-semibold sm:text-lg";
const LABEL = "text-[11px] leading-tight text-secondary sm:text-xs";

export default function StatsStrip({
  tasksCompleted,
  tasksTotal,
  focusMinutes,
  streakDays,
  patternsLearned = 0,
}: StatsStripProps) {
  const taskPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {/* Tasks — progress reads as a bar under the row rather than a ring
          beside it, which left no room for the label at four-up widths */}
      <Card className="px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className={`${ICON} bg-dusk/10 text-dusk`}>
            <ClipboardList size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`${VALUE} text-dusk`}>
              {tasksCompleted}/{tasksTotal}
            </p>
            <p className={LABEL}>Tasks done</p>
          </div>
        </div>
        <div
          className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-dusk/15"
          role="progressbar"
          aria-valuenow={taskPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tasks completed"
        >
          <div
            className="h-full rounded-full bg-dusk transition-all duration-500"
            style={{ width: `${taskPercent}%` }}
          />
        </div>
      </Card>

      {/* Focus */}
      <Card className={CARD}>
        <div className={`${ICON} bg-sage/10 text-sage`}>
          <Timer size={18} />
        </div>
        <div className="min-w-0">
          <p className={`${VALUE} text-sage`}>{formatTime(focusMinutes)}</p>
          <p className={LABEL}>Focus today</p>
        </div>
      </Card>

      {/* Streak */}
      <Card className={CARD}>
        <div className={`${ICON} bg-gold/10 text-gold`}>
          <Flame size={18} />
        </div>
        <div className="min-w-0">
          <p className={`${VALUE} text-gold`}>
            {streakDays} {streakDays === 1 ? "day" : "days"}
          </p>
          <p className={LABEL}>Streak</p>
        </div>
      </Card>

      {/* Patterns Learned */}
      <Tooltip
        content="Jarvis observes how you work and adapts your schedule."
        className="w-full"
      >
        <Card className={CARD}>
          <div className={`${ICON} bg-terra/10 text-terra`}>
            <Brain size={18} />
          </div>
          <div className="min-w-0">
            <p className={`${VALUE} text-terra`}>{patternsLearned}</p>
            <p className={LABEL}>Patterns</p>
          </div>
        </Card>
      </Tooltip>
    </div>
  );
}
