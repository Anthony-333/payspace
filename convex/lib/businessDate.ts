// Reports and rollups are keyed by the shop's own calendar day, not the server's
// (CLAUDE.md rule 10). A sale rung at 00:30 in Manila belongs to that Manila date,
// whichever server took it. This file is shared by Convex functions and the Next.js pages.

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string) {
  const cached = formatters.get(timezone);
  if (cached) return cached;
  let made: Intl.DateTimeFormat;
  try {
    made = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    });
  } catch {
    // tenants.ts validates the timezone on the way in; if one ever slips through, UTC
    // keeps the shop selling rather than failing the sale.
    made = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    });
  }
  formatters.set(timezone, made);
  return made;
}

/** The shop-local date ("2026-09-18") and hour (0-23) of an instant, read in one pass. */
export function businessMoment(ms: number, timezone: string) {
  const parts: Record<string, string> = {};
  for (const part of formatter(timezone).formatToParts(ms)) parts[part.type] = part.value;
  const hour = Number(parts.hour);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    // h23 should never give 24, but a stray ICU build shouldn't write past the byHour array.
    hour: Number.isFinite(hour) ? hour % 24 : 0,
  };
}

/** The shop-local date ("2026-09-18") of an instant. */
export function businessDate(ms: number, timezone: string) {
  return businessMoment(ms, timezone).date;
}

/** A business date is a plain calendar day, so date maths treats it as UTC and never shifts. */
export const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

function utcOf(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function isBusinessDate(date: string) {
  return BUSINESS_DATE_PATTERN.test(date) && !Number.isNaN(utcOf(date));
}

/** The business date `days` later (or earlier, for a negative number). */
export function addDays(date: string, days: number) {
  const moved = new Date(utcOf(date) + days * 86_400_000);
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}

/** Whole days from one business date to another, `to` included: same day is 1. */
export function daysBetween(from: string, to: string) {
  return Math.round((utcOf(to) - utcOf(from)) / 86_400_000) + 1;
}

/** 0 is Sunday, matching Date.getUTCDay, for the hour-by-weekday heatmap. */
export function weekdayOf(date: string) {
  return new Date(utcOf(date)).getUTCDay();
}

/** "18 Sep 2026" from a business date, without dragging the reader's timezone back in. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatBusinessDate(date: string) {
  const [year, month, day] = date.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${Number(day)} ${name} ${year}` : date;
}
