import { grossMarginBps, netOfTax, roundMinor } from "@/convex/lib/money";

// Worked costing examples for marketing pages and articles. The numbers go through the same
// money helpers as the app (integer cents, margin on the price without tax), so an example
// always matches what Payspace would show for the same inputs.

/** One ingredient or item: how much one sale uses, and how it was bought. */
export type CostLine = {
  item: string;
  use: number;
  unit: "g" | "ml" | "pc";
  /** Purchase price in cents for `size` units, e.g. $24.00 for 1,000 g. */
  buyPrice: number;
  buySize: number;
  buyLabel: string;
};

export type CostExample = {
  product: string;
  lines: CostLine[];
  /** Selling price in cents. */
  price: number;
  /** 1000 = 10% tax (VAT, GST) included in the price; 0 for a shop that doesn't charge tax. */
  taxRateBps: number;
};

export function lineCost(line: CostLine) {
  return roundMinor((line.use * line.buyPrice) / line.buySize);
}

export function summarize({ lines, price, taxRateBps }: CostExample) {
  const cost = lines.reduce((sum, l) => sum + lineCost(l), 0);
  const net = netOfTax(price, taxRateBps, true);
  const marginBps = grossMarginBps(price, cost, taxRateBps, true) ?? 0;
  return { cost, net, tax: price - net, profit: net - cost, marginBps, foodCostBps: 10_000 - marginBps };
}
