/**
 * Frontend-only mock parser for the BrainDumpDemo section.
 * Does NOT produce real scheduling — its job is visual believability.
 * Real parsing happens server-side via the Jarvis Engine; this is a UI demo.
 */

export type ParsedBlock = {
  id: string;
  time: string;
  label: string;
  color: string;
  durationMin: number;
};

const STUDY = "#D4775A";
const MEET = "#6B7FB5";
const HABIT = "#E09D5C";

function pickStudySlots(count: number): string[] {
  const slots = ["9:00", "11:00", "14:00", "16:00", "19:00", "Tue 10:00", "Wed 14:00", "Thu 11:00", "Fri 9:00"];
  return slots.slice(0, count);
}

let seq = 0;
const id = () => `dump-${++seq}`;

export function parseDump(text: string): ParsedBlock[] {
  if (!text.trim()) return [];

  const lower = text.toLowerCase();
  const blocks: ParsedBlock[] = [];

  // Detect prep-for-X by Y deadlines → 4 study blocks
  const prepMatch = lower.match(/(?:prep(?:are)? for|study(?: for)?|cram for|finish)\s+([a-z0-9 -]{2,40}?)(?:\s+by\s+([a-z]+))?/i);
  if (prepMatch) {
    const subject = prepMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const slots = pickStudySlots(4);
    slots.forEach((t, i) =>
      blocks.push({
        id: id(),
        time: t,
        label: `Study · ${subject} (part ${i + 1})`,
        color: STUDY,
        durationMin: 25,
      })
    );
  }

  // Recurring habits like "gym 3x" or "meditate every morning"
  const habitMatch = lower.match(/(\w+)\s+(\d)x|every\s+(morning|evening|day|night)/i);
  if (habitMatch) {
    const name = (habitMatch[1] || habitMatch[3] || "habit").replace(/\b\w/g, (c) => c.toUpperCase());
    const isMorning = /morning/.test(lower);
    blocks.push({
      id: id(),
      time: isMorning ? "Mon 7:00" : "Mon 18:00",
      label: `${name} (recurring)`,
      color: HABIT,
      durationMin: 30,
    });
    blocks.push({
      id: id(),
      time: isMorning ? "Wed 7:00" : "Wed 18:00",
      label: `${name} (recurring)`,
      color: HABIT,
      durationMin: 30,
    });
    blocks.push({
      id: id(),
      time: isMorning ? "Fri 7:00" : "Fri 18:00",
      label: `${name} (recurring)`,
      color: HABIT,
      durationMin: 30,
    });
  }

  // "call X" or "meet X"
  const callMatch = lower.match(/(?:call|meet(?:ing)? with|chat with|catch up with)\s+([a-z]{2,20})/i);
  if (callMatch) {
    const who = callMatch[1].replace(/\b\w/g, (c) => c.toUpperCase());
    blocks.push({
      id: id(),
      time: "Sun 16:00",
      label: `Call ${who}`,
      color: MEET,
      durationMin: 25,
    });
  }

  // Fallback: at least one block so the demo never looks empty
  if (blocks.length === 0) {
    blocks.push({
      id: id(),
      time: "9:00",
      label: "Focus block",
      color: STUDY,
      durationMin: 25,
    });
  }

  // Limit to 6 blocks for visual cleanliness
  return blocks.slice(0, 6);
}
