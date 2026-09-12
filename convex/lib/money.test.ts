import { describe, expect, test } from "vitest";
import { formatMoney, grossMarginBps, moneyToInput, netOfTax, parseMoney } from "./money";

describe("parseMoney", () => {
  test.each([
    ["140", 14000], ["140.5", 14050], ["140.50", 14050], ["1,400.00", 140000],
    ["₱ 99.99", 9999], ["₱99.99", 9999], [".5", 50], ["0", 0], [" 12 ", 1200],
  ])("%s → %d", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  test.each(["", "abc", "1.234", "-5", "12.3.4", "1e3", ".", "10000001"])("rejects %s", (input) => {
    expect(parseMoney(input)).toBeNull();
  });

  test("allows negatives when asked", () => {
    expect(parseMoney("-20", { allowNegative: true })).toBe(-2000);
  });
});

describe("formatting", () => {
  test("formats with separators and two decimals", () => {
    expect(formatMoney(140000)).toBe("₱1,400.00");
    expect(formatMoney(5)).toBe("₱0.05");
    expect(formatMoney(-2000)).toBe("-₱20.00");
    expect(moneyToInput(14050)).toBe("140.50");
  });
});

describe("tax and margin", () => {
  test("matches the plan's iced latte example", () => {
    // ₱140 incl. 12% VAT → ₱125.00 net; cost ₱48.90 → 60.9% margin
    expect(netOfTax(14000, 1200, true)).toBe(12500);
    expect(grossMarginBps(14000, 4890, 1200, true)).toBe(6088);
    expect(netOfTax(14000, 1200, false)).toBe(14000);
    expect(grossMarginBps(0, 100, 1200, true)).toBeNull();
  });
});
