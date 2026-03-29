"use client";

import DailyGreeting from "@/components/app/DailyGreeting";
import StatsStrip from "@/components/app/StatsStrip";
import ScheduleTimeline from "@/components/app/ScheduleTimeline";
import type { ScheduleTask } from "@/lib/types";

const today = new Date();
function timeToday(hour: number, minute: number): Date {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const DEMO_TASKS: ScheduleTask[] = [
  {
    task_id: "t1",
    title: "Calculus Review",
    start_time: timeToday(9, 0),
    end_time: timeToday(9, 30),
    duration_minutes: 30,
    status: "completed",
    completed_at: timeToday(9, 23),
    goal_id: "calc-101",
    color: "#6B7FB5",
  },
  {
    task_id: "t2",
    title: "History Research",
    start_time: timeToday(9, 30),
    end_time: timeToday(10, 0),
    duration_minutes: 30,
    status: "completed",
    completed_at: timeToday(9, 52),
    goal_id: "hist-201",
    color: "#4A7B6B",
  },
  {
    task_id: "t3",
    title: "Calculus Practice",
    start_time: timeToday(10, 0),
    end_time: timeToday(10, 30),
    duration_minutes: 30,
    status: "in_progress",
    goal_id: "calc-101",
    color: "#6B7FB5",
  },
  {
    task_id: "t4",
    title: "History Write Intro",
    start_time: timeToday(10, 30),
    end_time: timeToday(11, 0),
    duration_minutes: 30,
    status: "pending",
    goal_id: "hist-201",
    color: "#D4775A",
    deadline_hint: "Essay due Thursday",
  },
  {
    task_id: "t5",
    title: "Calculus Integration",
    start_time: timeToday(11, 0),
    end_time: timeToday(11, 30),
    duration_minutes: 30,
    status: "pending",
    goal_id: "calc-101",
    color: "#6B7FB5",
    deadline_hint: "Exam Friday",
  },
];

export default function DashboardPage() {
  const tasksCompleted = DEMO_TASKS.filter((t) => t.status === "completed").length;
  const tasksTotal = DEMO_TASKS.length;
  const estimatedMinutes = DEMO_TASKS.reduce((sum, t) => sum + t.duration_minutes, 0);
  // Focus minutes = completed task durations + progress on active task
  const focusMinutes =
    DEMO_TASKS.filter((t) => t.status === "completed").reduce(
      (sum, t) => sum + t.duration_minutes,
      0
    ) + 12; // 12 min into active task

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
      <DailyGreeting taskCount={tasksTotal} estimatedMinutes={estimatedMinutes} />
      <StatsStrip
        tasksCompleted={tasksCompleted}
        tasksTotal={tasksTotal}
        focusMinutes={focusMinutes}
        streakDays={7}
      />
      <ScheduleTimeline tasks={DEMO_TASKS} />
    </div>
  );
}
