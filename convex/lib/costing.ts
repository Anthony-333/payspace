import type { Doc, Id } from "../_generated/dataModel";
import { grossMarginBps, roundMinor } from "./money";

// Weighted average costing (docs/mvp-plan.md "Costing"). Pure functions, shared with the forms.
// Stock item costs are minor units per base unit and may be fractional ($11.99 for 1,000 g is
// 1.199 cents a gram); anything a product or sale stores is rounded to whole cents.

type Line = { stockItemId: Id<"stockItems">; qty: number };
type Tenant = Pick<Doc<"tenants">, "taxRateBps" | "pricesIncludeTax" | "targetMarginBps">;

/** Stock item costs keep 4 decimals of a cent, plenty for a gram of saffron or a ml of milk. */
export function roundAvgCost(cost: number) {
  return Math.round(cost * 10_000) / 10_000;
}

/**
 * Blends a delivery into the average cost:
 * (onHand × avgCost + qtyIn × unitCostIn) ÷ (onHand + qtyIn), or the new unit cost when
 * nothing (or less than nothing) was on hand.
 */
export function blendAvgCost(onHand: number, avgCost: number, qtyIn: number, unitCostIn: number) {
  if (onHand <= 0) return roundAvgCost(unitCostIn);
  return roundAvgCost((onHand * avgCost + qtyIn * unitCostIn) / (onHand + qtyIn));
}

/** Σ (recipe qty × stock item avgCost), rounded to whole minor units. Missing items cost 0. */
export function recipeCost(lines: Line[], stockItems: Map<Id<"stockItems">, Pick<Doc<"stockItems">, "avgCost">>) {
  let total = 0;
  for (const line of lines) total += line.qty * (stockItems.get(line.stockItemId)?.avgCost ?? 0);
  return roundMinor(total);
}

/** True when a product with a known cost earns less than the shop's target margin. */
export function isBelowTarget(price: number, unitCost: number, tenant: Tenant) {
  if (unitCost <= 0) return false; // no cost yet: nothing to judge
  const margin = grossMarginBps(price, unitCost, tenant.taxRateBps, tenant.pricesIncludeTax);
  return margin === null || margin < tenant.targetMarginBps;
}

/** Round price steps in minor units: 0.05, 0.10, 0.25, 0.50, 1, 5, 10, 50, 100… */
const PRICE_STEPS = [5, 10, 25, 50, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000];

/**
 * The lowest friendly price that meets the target margin: cost ÷ (1 − target), plus tax when
 * prices include it, rounded up to a step that suits its size in any currency ($4.50, ₱140,
 * ₹190). Null when there's no cost to work from.
 */
export function suggestedPrice(unitCost: number, tenant: Tenant, step?: number) {
  if (unitCost <= 0 || tenant.targetMarginBps >= 10_000) return null;
  const net = (unitCost * 10_000) / (10_000 - tenant.targetMarginBps);
  const gross = Math.round(tenant.pricesIncludeTax ? (net * (10_000 + tenant.taxRateBps)) / 10_000 : net);
  const round = step ?? PRICE_STEPS.filter((s) => s <= gross / 15).pop() ?? PRICE_STEPS[0];
  return Math.ceil(gross / round) * round;
}
