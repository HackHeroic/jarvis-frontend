export type ScheduleBlock = {
  time: string;
  label: string;
  color: string; // brand hex
  state: "stable" | "moved" | "added" | "expanded";
  badge?: string; // e.g. "moved", "+30m", "extracted from PDF"
};

export type AmbientScene = {
  id: string;
  channel: "imessage" | "slack" | "gmail" | "calendar";
  sender: string;
  channelLabel: string;
  message: string;
  attachment?: string;
  blocks: ScheduleBlock[];
};

const STUDY = "#D4775A";
const GYM = "#4A7B6B";
const MEET = "#6B7FB5";
const MOVED = "#E09D5C";

export const SCENES: AmbientScene[] = [
  {
    id: "dinner",
    channel: "imessage",
    sender: "Sara",
    channelLabel: "iMessage",
    message: "Surprise dinner tonight @ 8?",
    blocks: [
      { time: "9:00", label: "Deep work · CNNs", color: STUDY, state: "stable" },
      { time: "11:30", label: "Gym (45m)", color: GYM, state: "stable" },
      { time: "13:00", label: "Lunch w/ Mira", color: MEET, state: "stable" },
      { time: "tomorrow 10:00", label: "Study block (was 7-9 PM today)", color: MOVED, state: "moved", badge: "moved" },
      { time: "20:00", label: "Dinner with Sara", color: MEET, state: "added", badge: "added" },
    ],
  },
  {
    id: "deadline",
    channel: "slack",
    sender: "Priya",
    channelLabel: "#ml-team",
    message: "Deadline pushed to Wed",
    blocks: [
      { time: "Mon 9:00", label: "ML project · part 1", color: STUDY, state: "stable" },
      { time: "Tue 9:00", label: "ML project · part 2", color: STUDY, state: "stable" },
      { time: "Wed 9:00", label: "ML project · finalize", color: STUDY, state: "stable" },
      { time: "Wed 14:00", label: "Exam prep (freed window)", color: MOVED, state: "expanded", badge: "+30m" },
    ],
  },
  {
    id: "exam",
    channel: "gmail",
    sender: "University Registrar",
    channelLabel: "Email",
    message: "Exam schedule released",
    attachment: "schedule.pdf",
    blocks: [
      { time: "Week 1 · Mon", label: "Linear algebra review", color: STUDY, state: "added", badge: "from PDF" },
      { time: "Week 1 · Wed", label: "Probability problems", color: STUDY, state: "added", badge: "from PDF" },
      { time: "Week 2 · Tue", label: "Mock exam (timed)", color: STUDY, state: "added", badge: "from PDF" },
      { time: "Week 3 · Fri", label: "Final review", color: STUDY, state: "added", badge: "from PDF" },
    ],
  },
  {
    id: "meeting",
    channel: "calendar",
    sender: "Prof Singh",
    channelLabel: "Calendar",
    message: "Office Hours moved to 3 PM",
    blocks: [
      { time: "10:00", label: "Deep work · backprop", color: STUDY, state: "stable" },
      { time: "13:00", label: "Quick review (filler)", color: GYM, state: "added", badge: "filled gap" },
      { time: "15:00", label: "Office hours", color: MEET, state: "moved", badge: "moved" },
      { time: "16:30", label: "Deep work (shifted)", color: MOVED, state: "moved", badge: "moved" },
    ],
  },
];
