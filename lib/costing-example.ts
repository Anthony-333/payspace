import { grossMarginBps, netOfTax, roundMinor } from "@/convex/lib/money";

// Worked costing examples for marketing pages and articles. The numbers go through the same
// money helpers as the app (integer centavos, margin on the price without VAT), so an example
// always matches what Payspace would show for the same inputs.

/** One ingredient or item: how much one sale uses, and how it was bought. */
export type CostLine = {
  item: string;
  use: number;
  unit: "g" | "ml" | "pc";
  /** Purchase price in centavos for `size` units, e.g. ₱1,200.00 for 1,000 g. */
  buyPrice: number;
  buySize: number;
  buyLabel: string;
};

export type CostExample = {
  product: string;
  lines: CostLine[];
  /** Selling price in centavos. */
  price: number;
  /** 1200 = 12% VAT included in the price; 0 for a shop that doesn't charge VAT. */
  vatRateBps: number;
};

export function lineCost(line: CostLine) {
  return roundMinor((line.use * line.buyPrice) / line.buySize);
}

export function summarize({ lines, price, vatRateBps }: CostExample) {
  const cost = lines.reduce((sum, l) => sum + lineCost(l), 0);
  const net = netOfTax(price, vatRateBps, true);
  const marginBps = grossMarginBps(price, cost, vatRateBps, true) ?? 0;
  return { cost, net, vat: price - net, profit: net - cost, marginBps, foodCostBps: 10_000 - marginBps };
}
