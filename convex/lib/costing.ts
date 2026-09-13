import type { Doc, Id } from "../_generated/dataModel";
import { grossMarginBps, roundMinor } from "./money";

// Weighted average costing (docs/mvp-plan.md "Costing"). Pure functions, shared with the forms.
// Stock item costs are minor units per base unit and may be fractional (₱1,199 for 1,000 g is
// 119.9 centavos a gram); anything a product or sale stores is rounded to whole centavos.

type Line = { stockItemId: Id<"stockItems">; qty: number };
type Tenant = Pick<Doc<"tenants">, "taxRateBps" | "pricesIncludeTax" | "targetMarginBps">;

/** Stock item costs keep 4 decimals of a centavo, plenty for a gram of saffron or a ml of milk. */
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

/**
 * The lowest friendly price (a multiple of `step`, ₱5 by default) that meets the target margin:
 * cost ÷ (1 − target), plus tax when prices include it. Null when there's no cost to work from.
 */
export function suggestedPrice(unitCost: number, tenant: Tenant, step = 500) {
  if (unitCost <= 0 || tenant.targetMarginBps >= 10_000) return null;
  const net = (unitCost * 10_000) / (10_000 - tenant.targetMarginBps);
  const gross = tenant.pricesIncludeTax ? (net * (10_000 + tenant.taxRateBps)) / 10_000 : net;
  return Math.ceil(Math.round(gross) / step) * step;
}
