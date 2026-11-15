/**
 * Pure helpers for the Habits page: Jarvis's check-ins on the rules it learned ("Still
 * how you work?"). No React, no fetch — unit-tested with Vitest.
 *
 * Days arrive as YYYY-MM-DD on the user's clock (`RuleCheckInList.today`,
 * `next_due_on`), so they are compared and named as calendar days, never shifted
 * through the browser's zone.
 */

import type { CheckInReviewed, RuleCheckIn, RuleCheckInList } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The answers to "Still how you work?", 0 to 5 (the SM-2 quality the backend takes).
 * Under 3 means the rule is not holding: Jarvis asks again the next day.
 */
export const CHECK_IN_ANSWERS = ["No", "Rarely", "At times", "Mostly", "Yes", "Always"] as const;
export const CHECK_IN_QUESTION = "Still how you work?";
/** The lowest answer that counts as the rule holding (SM-2: 3 and up). */
const HOLDS_FROM = 3;

/** A YYYY-MM-DD day as a day number (days since the epoch). */
function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** The day `iso` falls on, on the clock of `timeZone` (the browser's if the name is unknown). */
export function localDay(iso: string, timeZone: string): string {
  const moment = new Date(iso);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(moment);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(moment);
  }
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(dayNumber(to) - dayNumber(from));
}

/** "Tue 24 Nov" for a YYYY-MM-DD day. */
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  }).format(new Date(dayNumber(day) * DAY_MS));
}

/** When `day` is, seen from `today`: "today", "tomorrow", "in 3 days", else "on Tue 24 Nov". */
export function whenLabel(day: string, today: string): string {
  const days = daysBetween(today, day);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  return `on ${formatDay(day)}`;
}

/** The quiet line on a due check-in: when it was last answered, or that this is the first. */
export function lastCheckInLine(c: RuleCheckIn, today: string, timeZone: string): string {
  if (!c.last_reviewed_at) return "First check-in on this rule";
  const days = daysBetween(localDay(c.last_reviewed_at, timeZone), today);
  if (days <= 0) return "Last checked today";
  if (days === 1) return "Last checked yesterday";
  return `Last checked ${days} days ago`;
}

/** The line on a rule that is not due yet: "Next check-in tomorrow". */
export function nextCheckInLine(c: RuleCheckIn, today: string): string {
  return `Next check-in ${whenLabel(c.next_due_on, today)}`;
}

/** What a card says once answered. A "no" is information, never a failure. */
export function answeredLine(quality: number, reviewed: CheckInReviewed, today: string): string {
  const when = whenLabel(reviewed.next_due_on, today);
  if (quality < HOLDS_FROM) {
    return `Noted — I'll ask again ${when}. If it no longer fits, you can forget it.`;
  }
  return `Noted — I'll check in again ${when}.`;
}

/** Whether the user has any rule at all: only then is the page empty. */
export function hasRules(list: RuleCheckInList): boolean {
  return list.due_trackers.length + list.upcoming_trackers.length > 0;
}

/** The line shown when rules exist but none is due today: when the next one comes. */
export function nothingDueLine(list: RuleCheckInList): string | null {
  if (list.due_trackers.length > 0 || list.upcoming_trackers.length === 0) return null;
  const soonest = list.upcoming_trackers.reduce((a, b) => (b.next_due_on < a.next_due_on ? b : a));
  return `Nothing to check in on today. The next one is ${whenLabel(soonest.next_due_on, list.today)}.`;
}
