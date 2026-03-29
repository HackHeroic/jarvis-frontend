import { ClipboardList, Timer, Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";

interface StatsStripProps {
  tasksCompleted: number;
  tasksTotal: number;
  focusMinutes: number;
  streakDays: number;
}

export default function StatsStrip({
  tasksCompleted,
  tasksTotal,
  focusMinutes,
  streakDays,
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
    <div className="flex gap-3">
      {/* Tasks */}
      <Card className="flex flex-1 items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-dusk/10 text-dusk">
          <ClipboardList size={18} />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-dusk">
            {tasksCompleted}/{tasksTotal}
          </p>
          <p className="text-xs text-secondary">Tasks completed</p>
        </div>
        <ProgressRing value={taskPercent} size={40} strokeWidth={3} color="var(--color-dusk)" />
      </Card>

      {/* Focus */}
      <Card className="flex flex-1 items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage/10 text-sage">
          <Timer size={18} />
        </div>
        <div>
          <p className="text-lg font-semibold text-sage">{formatTime(focusMinutes)}</p>
          <p className="text-xs text-secondary">Focus time today</p>
        </div>
      </Card>

      {/* Streak */}
      <Card className="flex flex-1 items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Flame size={18} />
        </div>
        <div>
          <p className="text-lg font-semibold text-gold">{streakDays} days</p>
          <p className="text-xs text-secondary">Current streak</p>
        </div>
      </Card>
    </div>
  );
}
