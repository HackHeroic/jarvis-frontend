/**
 * The Habits page's helpers: days on the user's clock, the quiet lines on each
 * check-in, and what an answer says. Days come from the backend as YYYY-MM-DD on the
 * user's clock, so nothing here may shift them through the browser's zone.
 */
import { describe, expect, it } from "vitest";
import {
  CHECK_IN_ANSWERS,
  answeredLine,
  daysBetween,
  formatDay,
  hasRules,
  lastCheckInLine,
  localDay,
  nextCheckInLine,
  nothingDueLine,
  whenLabel,
} from "@/lib/habits";
import type { RuleCheckIn, RuleCheckInList } from "@/lib/types";

const TODAY = "2026-11-16";
const IST = "Asia/Kolkata";

function checkIn(over: Partial<RuleCheckIn> = {}): RuleCheckIn {
  return {
    id: "t-1",
    constraint_id: "r-1",
    rule_text: "No work after 10:30 PM",
    source: "said",
    learned_at: "2026-11-09T16:00:00Z",
    last_reviewed_at: null,
    next_due_on: TODAY,
    interval_days: 1,
    ...over,
  };
}

function list(due: RuleCheckIn[], upcoming: RuleCheckIn[] = []): RuleCheckInList {
  return { timezone: IST, today: TODAY, due_trackers: due, upcoming_trackers: upcoming };
}

describe("days on the user's clock", () => {
  it("localDay reads the day in the user's zone, not UTC's", () => {
    // 20:00 UTC on the 15th is 01:30 on the 16th in India.
    expect(localDay("2026-11-15T20:00:00Z", IST)).toBe("2026-11-16");
    expect(localDay("2026-11-15T20:00:00Z", "UTC")).toBe("2026-11-15");
  });

  it("localDay with an unknown zone falls back to the browser's clock instead of throwing", () => {
    expect(localDay("2026-11-15T12:00:00Z", "Not/AZone")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("daysBetween counts calendar days, across a month end", () => {
    expect(daysBetween("2026-11-30", "2026-12-02")).toBe(2);
    expect(daysBetween(TODAY, "2026-11-15")).toBe(-1);
  });

  it("formatDay names a day without shifting it", () => {
    expect(formatDay("2026-11-24")).toBe("Tue 24 Nov");
  });

  it("whenLabel: tomorrow, in a few days, then a named day", () => {
    expect(whenLabel("2026-11-17", TODAY)).toBe("tomorrow");
    expect(whenLabel("2026-11-19", TODAY)).toBe("in 3 days");
    expect(whenLabel("2026-11-24", TODAY)).toBe("on Tue 24 Nov");
    expect(whenLabel("2026-11-14", TODAY)).toBe("today");
  });
});

describe("the quiet lines on a check-in", () => {
  it("a rule never asked about says it is the first check-in", () => {
    expect(lastCheckInLine(checkIn(), TODAY, IST)).toBe("First check-in on this rule");
  });

  it("an answered rule says when, on the user's clock", () => {
    // 20:00 UTC on the 14th was already the 15th in India: yesterday, not two days ago.
    expect(lastCheckInLine(checkIn({ last_reviewed_at: "2026-11-14T20:00:00Z" }), TODAY, IST))
      .toBe("Last checked yesterday");
    expect(lastCheckInLine(checkIn({ last_reviewed_at: "2026-11-11T10:00:00Z" }), TODAY, IST))
      .toBe("Last checked 5 days ago");
    expect(lastCheckInLine(checkIn({ last_reviewed_at: "2026-11-16T03:00:00Z" }), TODAY, IST))
      .toBe("Last checked today");
  });

  it("a rule not due yet says when it comes back", () => {
    expect(nextCheckInLine(checkIn({ next_due_on: "2026-11-17" }), TODAY)).toBe("Next check-in tomorrow");
    expect(nextCheckInLine(checkIn({ next_due_on: "2026-11-22" }), TODAY)).toBe("Next check-in in 6 days");
    expect(nextCheckInLine(checkIn({ next_due_on: "2026-11-23" }), TODAY)).toBe("Next check-in on Mon 23 Nov");
  });
});

describe("answering a check-in", () => {
  const reviewed = (next_due_on: string, days: number) => ({
    next_review_date: `${next_due_on}T15:00:00Z`, next_interval_days: days, next_due_on,
  });

  it("a rule that holds comes back later, and the card says when", () => {
    expect(answeredLine(4, reviewed("2026-11-22", 6), TODAY)).toBe("Noted — I'll check in again in 6 days.");
  });

  it("a low answer comes back tomorrow, offered as a choice, never as a failure", () => {
    const line = answeredLine(1, reviewed("2026-11-17", 1), TODAY);
    expect(line).toBe("Noted — I'll ask again tomorrow. If it no longer fits, you can forget it.");
    expect(line).not.toMatch(/failed|you didn't|missed|behind|broke/i);
  });

  it("there are six answers, 0 to 5, short enough for a phone", () => {
    expect(CHECK_IN_ANSWERS).toHaveLength(6);
    for (const answer of CHECK_IN_ANSWERS) expect(answer.length).toBeLessThanOrEqual(8);
  });
});

describe("what the page shows", () => {
  it("is empty only when the user has no rules at all", () => {
    expect(hasRules(list([]))).toBe(false);
    expect(hasRules(list([], [checkIn({ next_due_on: "2026-11-20" })]))).toBe(true);
    expect(hasRules(list([checkIn()]))).toBe(true);
  });

  it("with rules but none due, says when the next check-in is", () => {
    const later = [checkIn({ id: "a", next_due_on: "2026-11-20" }), checkIn({ id: "b", next_due_on: "2026-11-18" })];
    expect(nothingDueLine(list([], later))).toBe("Nothing to check in on today. The next one is in 2 days.");
    expect(nothingDueLine(list([checkIn()], later))).toBeNull();
    expect(nothingDueLine(list([]))).toBeNull();
  });
});
