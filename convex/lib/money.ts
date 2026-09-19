import { ConvexError } from "convex/values";

// All money is an integer in minor units (centavos): ₱140.00 → 14000. CLAUDE.md rule 5.
// This file is shared by Convex functions and the Next.js forms.

/** ₱10,000,000.00: far above any single price, well inside safe integer range. */
export const MAX_MONEY = 1_000_000_000;

/**
 * Parses what a person types ("140", "140.5", "₱1,400.00") into minor units.
 * Returns null for anything that isn't a plain amount with at most 2 decimals.
 */
export function parseMoney(input: string, { allowNegative = false } = {}): number | null {
  const cleaned = input.trim().replace(/^₱|^PHP\s*/i, "").replace(/,/g, "").trim();
  const match = /^(-)?(\d*)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match || (match[2] === "" && match[3] === undefined)) return null;
  const [, minus, whole, fraction = ""] = match;
  if (minus && !allowNegative) return null;
  const minor = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > MAX_MONEY) return null;
  return minus ? -minor : minor;
}

/** "₱1,400.50". Uses fixed formatting so the server and every browser agree. */
export function formatMoney(minor: number, symbol = "₱") {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (abs % 100).toString().padStart(2, "0");
  return `${sign}${symbol}${whole}.${fraction}`;
}

/** Minor units back to the plain text a form input shows ("1400.50"). */
export function moneyToInput(minor: number) {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, "0")}`;
}

/** Rounds a fractional minor amount (e.g. qty × average cost) half away from zero. */
export function roundMinor(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Server-side guard: throws a user-facing error unless `value` is valid money. */
export function assertMoney(label: string, value: number, { allowNegative = false } = {}) {
  const min = allowNegative ? -MAX_MONEY : 0;
  if (!Number.isSafeInteger(value) || value < min || value > MAX_MONEY) {
    throw new ConvexError(`${label} must be an amount between ${formatMoney(min)} and ${formatMoney(MAX_MONEY)}.`);
  }
  return value;
}

/** The price without tax: for tax-inclusive prices, price ÷ (1 + rate). */
export function netOfTax(price: number, taxRateBps: number, pricesIncludeTax: boolean) {
  return pricesIncludeTax ? roundMinor((price * 10_000) / (10_000 + taxRateBps)) : price;
}

/** Gross margin in basis points (6090 = 60.9%), or null when the net price is zero. */
export function grossMarginBps(price: number, unitCost: number, taxRateBps: number, pricesIncludeTax: boolean) {
  const net = netOfTax(price, taxRateBps, pricesIncludeTax);
  if (net <= 0) return null;
  return Math.round(((net - unitCost) * 10_000) / net);
}

/**
 * Splits an order total into net and VAT. With tax-inclusive prices the VAT is already inside
 * the subtotal; otherwise it's added on top. Rounded once, on the order, to whole centavos.
 */
export function taxBreakdown(subtotal: number, taxRateBps: number, pricesIncludeTax: boolean) {
  if (pricesIncludeTax) {
    const net = netOfTax(subtotal, taxRateBps, true);
    return { net, tax: subtotal - net, total: subtotal };
  }
  const tax = roundMinor((subtotal * taxRateBps) / 10_000);
  return { net: subtotal, tax, total: subtotal + tax };
}

/**
 * Reads the VAT a sale was rung up at back out of its own totals, so a receipt keeps the
 * rate it was issued with even after the shop changes — or switches off — its VAT
 * (CLAUDE.md rule 7). Returns null when the sale carried no tax.
 */
export function taxFromTotals(sale: { subtotal: number; tax: number; total: number }) {
  if (sale.tax <= 0) return null;
  const net = sale.total - sale.tax; // true whether or not the prices included the tax
  return {
    rateBps: net > 0 ? Math.round((sale.tax * 10_000) / net) : 0,
    includedInPrices: sale.total === sale.subtotal,
  };
}

export function formatBps(bps: number) {
  return `${(bps / 100).toFixed(1)}%`;
}
