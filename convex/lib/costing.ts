import type { Doc, Id } from "../_generated/dataModel";
import { roundMinor } from "./money";

type Line = { stockItemId: Id<"stockItems">; qty: number };

/** Σ (recipe qty × stock item avgCost), rounded to whole minor units. Missing items cost 0. */
export function recipeCost(lines: Line[], stockItems: Map<Id<"stockItems">, Pick<Doc<"stockItems">, "avgCost">>) {
  let total = 0;
  for (const line of lines) total += line.qty * (stockItems.get(line.stockItemId)?.avgCost ?? 0);
  return roundMinor(total);
}
