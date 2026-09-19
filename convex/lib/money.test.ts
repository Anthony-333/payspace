import { describe, expect, test } from "vitest";
import { formatMoney, grossMarginBps, moneyToInput, netOfTax, parseMoney, taxBreakdown, taxFromTotals } from "./money";

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

  test("splits VAT out of an order total", () => {
    expect(taxBreakdown(42300, 1200, true)).toEqual({ net: 37768, tax: 4532, total: 42300 });
    expect(taxBreakdown(10000, 1200, false)).toEqual({ net: 10000, tax: 1200, total: 11200 });
    expect(taxBreakdown(0, 1200, true)).toEqual({ net: 0, tax: 0, total: 0 });
  });

  test("reads a sale's own VAT back out of its totals, whichever way it was priced", () => {
    const included = taxBreakdown(42300, 1200, true);
    expect(taxFromTotals({ subtotal: 42300, ...included })).toEqual({ rateBps: 1200, includedInPrices: true });

    const added = taxBreakdown(10000, 1200, false);
    expect(taxFromTotals({ subtotal: 10000, ...added })).toEqual({ rateBps: 1200, includedInPrices: false });

    // A shop with VAT switched off: there is no VAT line to show on the receipt.
    expect(taxFromTotals({ subtotal: 10000, tax: 0, total: 10000 })).toBeNull();
  });
});
