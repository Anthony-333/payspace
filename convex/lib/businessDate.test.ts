import { describe, expect, test } from "vitest";
import { businessDate, businessMoment, formatBusinessDate } from "./businessDate";

// Reports are keyed by the shop's calendar day (CLAUDE.md rule 10), so the boundary cases
// here are the ones that decide which day a late-night sale counts towards.

const manila = "Asia/Manila"; // UTC+8 all year, no daylight saving

describe("businessMoment", () => {
  test("reads the date and hour in the shop's timezone, not the server's", () => {
    // 17:30 UTC is already 01:30 the next day in Manila.
    const at = Date.parse("2026-09-17T17:30:00Z");
    expect(businessMoment(at, manila)).toEqual({ date: "2026-09-18", hour: 1 });
    expect(businessMoment(at, "UTC")).toEqual({ date: "2026-09-17", hour: 17 });
  });

  test("midnight opens the new day, and the last minute stays on the old one", () => {
    expect(businessDate(Date.parse("2026-09-17T16:00:00Z"), manila)).toBe("2026-09-18"); // 00:00
    expect(businessDate(Date.parse("2026-09-17T15:59:59Z"), manila)).toBe("2026-09-17"); // 23:59
    expect(businessMoment(Date.parse("2026-09-17T16:00:00Z"), manila).hour).toBe(0);
    expect(businessMoment(Date.parse("2026-09-17T15:59:59Z"), manila).hour).toBe(23);
  });

  test("the hour always indexes the 24 slots of dailyStats.byHour", () => {
    const day = Date.parse("2026-09-18T00:00:00Z");
    for (let step = 0; step < 24; step++) {
      const { hour } = businessMoment(day + step * 3_600_000, manila);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
    }
  });

  test("follows a timezone that does keep daylight saving", () => {
    // New York is UTC-4 in July and UTC-5 in December.
    expect(businessMoment(Date.parse("2026-07-01T02:30:00Z"), "America/New_York"))
      .toEqual({ date: "2026-06-30", hour: 22 });
    expect(businessMoment(Date.parse("2026-12-01T02:30:00Z"), "America/New_York"))
      .toEqual({ date: "2026-11-30", hour: 21 });
  });

  test("an unusable timezone falls back to UTC rather than failing the sale", () => {
    expect(businessDate(Date.parse("2026-09-17T17:30:00Z"), "Nope/Nope")).toBe("2026-09-17");
  });

  test("pads months and days to a sortable YYYY-MM-DD", () => {
    expect(businessDate(Date.parse("2026-01-05T04:00:00Z"), manila)).toBe("2026-01-05");
  });
});

describe("formatBusinessDate", () => {
  test("reads a business date without dragging the reader's timezone back in", () => {
    expect(formatBusinessDate("2026-09-18")).toBe("18 Sep 2026");
    expect(formatBusinessDate("2026-01-05")).toBe("5 Jan 2026");
    expect(formatBusinessDate("nonsense")).toBe("nonsense");
  });
});
