import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { blendAvgCost, isBelowTarget, recipeCost, suggestedPrice } from "./costing";
import { checkQty, formatQty, parseQty, roundQty, stockStatus } from "./quantity";

const shop = { taxRateBps: 1200, pricesIncludeTax: true, targetMarginBps: 6000 };
const id = (s: string) => s as Id<"stockItems">;

describe("weighted average cost", () => {
  test("blends old stock with the delivery", () => {
    // 1,000 ml at 11 c/ml, then 2,000 ml for ₱260 (13 c/ml) → 12.3333 c/ml
    expect(blendAvgCost(1000, 11, 2000, 13)).toBe(12.3333);
  });

  test("uses the delivery's cost when nothing, or less than nothing, is on hand", () => {
    expect(blendAvgCost(0, 11, 1000, 15)).toBe(15);
    expect(blendAvgCost(-200, 11, 1000, 15)).toBe(15);
  });

  test("keeps fractional centavos per base unit", () => {
    // A ₱1,199 bag of 1,000 g
    expect(blendAvgCost(0, 0, 1000, 119900 / 1000)).toBe(119.9);
  });
});

describe("recipe cost and margin", () => {
  // docs/mvp-plan.md worked example: 16 oz iced latte
  const items = new Map([[id("beans"), { avgCost: 120 }], [id("milk"), { avgCost: 11 }], [id("cup"), { avgCost: 750 }]]);
  const latte = [
    { stockItemId: id("beans"), qty: 18 },
    { stockItemId: id("milk"), qty: 180 },
    { stockItemId: id("cup"), qty: 1 },
  ];

  test("matches the iced latte example", () => {
    expect(recipeCost(latte, items)).toBe(4890);
    expect(isBelowTarget(14000, 4890, shop)).toBe(false); // 60.9%
    expect(isBelowTarget(12000, 4890, shop)).toBe(true);
  });

  test("a product with no cost yet isn't flagged, but a free product with a cost is", () => {
    expect(isBelowTarget(14000, 0, shop)).toBe(false);
    expect(isBelowTarget(0, 100, shop)).toBe(true);
  });

  test("suggests the lowest ₱5 price that meets the target", () => {
    expect(suggestedPrice(4890, shop)).toBe(14000);
    expect(suggestedPrice(4890, { ...shop, pricesIncludeTax: false })).toBe(12500);
    expect(suggestedPrice(0, shop)).toBeNull();
    expect(suggestedPrice(4890, { ...shop, targetMarginBps: 10000 })).toBeNull();
    const price = suggestedPrice(3333, shop)!;
    expect(isBelowTarget(price, 3333, shop)).toBe(false);
    expect(isBelowTarget(price - 500, 3333, shop)).toBe(true);
  });
});

describe("quantities", () => {
  test("parse what people type", () => {
    expect(parseQty("1,250")).toBe(1250);
    expect(parseQty("0.5")).toBe(0.5);
    expect(parseQty(".125")).toBe(0.125);
    expect(parseQty("-60", { allowNegative: true })).toBe(-60);
    for (const bad of ["", "-60", "1.2345", "abc", "1e3", "99999999"]) expect(parseQty(bad)).toBeNull();
  });

  test("format with separators and no float noise", () => {
    expect(formatQty(1250, "g")).toBe("1,250 g");
    expect(formatQty(0.1 + 0.2, "ml")).toBe("0.3 ml");
    expect(formatQty(-3)).toBe("-3");
    expect(roundQty(-0.0001)).toBe(0);
  });

  test("check limits", () => {
    expect(checkQty("Qty", 0)).toMatch(/more than 0/);
    expect(checkQty("Qty", 0, { allowZero: true })).toBeNull();
    expect(checkQty("Qty", -1)).toMatch(/negative/);
    expect(checkQty("Qty", Number.NaN)).toMatch(/valid/);
  });

  test("stock status", () => {
    expect(stockStatus({ onHand: -1, reorderPoint: 0 })).toBe("negative");
    expect(stockStatus({ onHand: 0, reorderPoint: 0 })).toBe("out");
    expect(stockStatus({ onHand: 500, reorderPoint: 1000 })).toBe("low");
    expect(stockStatus({ onHand: 1000, reorderPoint: 1000 })).toBe("low");
    expect(stockStatus({ onHand: 1001, reorderPoint: 1000 })).toBe("ok");
  });
});
