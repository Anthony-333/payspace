import type { Doc } from "../_generated/dataModel";

// Stock quantities are in base units (g, ml, pc), CLAUDE.md "Products vs stock items".
// Kept to 3 decimals so the ledger adds up exactly to the on-hand cache.
// This file is shared by Convex functions and the Next.js forms.

export type BaseUnit = Doc<"stockItems">["baseUnit"];

/** 10,000 kg or 10,000 L: far above any single delivery or count. */
export const MAX_QTY = 10_000_000;

export const UNIT_NAME: Record<BaseUnit, string> = { pc: "pieces", g: "grams", ml: "millilitres" };

/** Rounds to 3 decimals, which is how every stored quantity is kept. */
export function roundQty(qty: number) {
  const rounded = Math.round(qty * 1000) / 1000;
  return rounded === 0 ? 0 : rounded; // no -0
}

/** Returns an error message, or null when `qty` is a usable quantity. */
export function checkQty(label: string, qty: number, { allowZero = false, allowNegative = false } = {}) {
  if (!Number.isFinite(qty) || Math.abs(qty) > MAX_QTY) return `${label} is not a valid quantity.`;
  if (!allowNegative && qty < 0) return `${label} can't be negative.`;
  if (!allowZero && roundQty(qty) === 0) return `${label} must be more than 0.`;
  return null;
}

/** Parses what a person types ("1,250", "0.5", "-60") into a quantity with at most 3 decimals. */
export function parseQty(input: string, { allowNegative = false } = {}): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  const match = /^(-)?(\d*)(?:\.(\d{1,3}))?$/.exec(cleaned);
  if (!match || (match[2] === "" && match[3] === undefined)) return null;
  if (match[1] && !allowNegative) return null;
  const qty = Number(cleaned);
  return Number.isFinite(qty) && Math.abs(qty) <= MAX_QTY ? roundQty(qty) : null;
}

/** "1,250 g", "0.5 ml", "-3 pc". Fixed formatting so the server and every browser agree. */
export function formatQty(qty: number, unit?: BaseUnit) {
  const rounded = roundQty(qty);
  const sign = rounded < 0 ? "-" : "";
  const [whole, fraction] = Math.abs(rounded).toString().split(".");
  const text = `${sign}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? `.${fraction}` : ""}`;
  return unit ? `${text} ${unit}` : text;
}

/** Plain text for a form input ("1250.5"). */
export function qtyToInput(qty: number) {
  return roundQty(qty).toString();
}

export type StockStatus = "negative" | "out" | "low" | "ok";

/** Negative stock is allowed but flagged (CLAUDE.md rule 8); low means at or under the reorder point. */
export function stockStatus(item: Pick<Doc<"stockItems">, "onHand" | "reorderPoint">): StockStatus {
  if (item.onHand < 0) return "negative";
  if (item.onHand === 0) return "out";
  if (item.onHand <= item.reorderPoint) return "low";
  return "ok";
}
