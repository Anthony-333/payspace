import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { MAX_MONEY, assertMoney, roundMinor, taxBreakdown } from "./money";
import { roundQty } from "./quantity";
import { MAX_RECIPE_LINES, productCost } from "./stock";
import { getOwned, type TenantQueryCtx } from "./tenant";

// Server-side pricing for checkout (CLAUDE.md rule 6): the client sends product IDs,
// quantities and option refs, never prices. Everything here re-reads the catalog.

export const MAX_SALE_LINES = 100;
/** Kept in step with MAX_LINE_QTY in components/pos/cart-store.ts. */
export const MAX_LINE_QTY = 999;
export const MAX_PAYMENTS = 5;
export const MAX_PAYMENT_REF = 30;

/** "groupId:key", as the cart stores a chosen option (see components/pos/pricing.ts). */
export type OptionRef = string;

export type SaleLineInput = { productId: Id<"products">; qty: number; optionKeys: OptionRef[] };

export type PricedLine = {
  productId: Id<"products">;
  name: string;
  optionNames: string[];
  qty: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  /** Base units to take off the shelf for ONE of this product, already including its options. */
  uses: { stockItemId: Id<"stockItems">; qty: number }[];
};

type Tenant = Pick<Doc<"tenants">, "taxRateBps" | "pricesIncludeTax">;

function assertLineQty(name: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) {
    throw new ConvexError(`Choose 1 to ${MAX_LINE_QTY} of “${name}”.`);
  }
  return qty;
}

/**
 * Resolves the chosen options against the live modifier groups: the group must be one this
 * product offers, the key must still exist, and the number chosen must respect the group's
 * min and max. Returns the names, the price change and the extra ingredients.
 */
async function resolveOptions(ctx: TenantQueryCtx, product: Doc<"products">, refs: OptionRef[]) {
  const offered = new Set<string>(product.modifierGroupIds);
  const chosen = new Map<string, string[]>();
  for (const ref of refs) {
    const split = ref.indexOf(":");
    const groupId = split === -1 ? "" : ref.slice(0, split);
    const key = split === -1 ? "" : ref.slice(split + 1);
    if (!offered.has(groupId)) throw new ConvexError(`“${product.name}” does not offer one of the chosen options.`);
    const keys = chosen.get(groupId) ?? [];
    if (keys.includes(key)) throw new ConvexError(`“${product.name}” has the same option twice.`);
    keys.push(key);
    chosen.set(groupId, keys);
  }

  const optionNames: string[] = [];
  const uses: { stockItemId: Id<"stockItems">; qty: number }[] = [];
  let priceDelta = 0;

  // The product's own order, so the receipt reads the same way every time.
  for (const groupId of product.modifierGroupIds) {
    const group = await ctx.db.get(groupId);
    if (!group || group.tenantId !== ctx.tenantId) continue; // a deleted group drops out, as in the cart
    const keys = chosen.get(groupId) ?? [];
    if (keys.length < group.minSelect || keys.length > group.maxSelect) {
      throw new ConvexError(
        group.minSelect === group.maxSelect
          ? `Choose ${group.minSelect} for “${group.name}”.`
          : `Choose ${group.minSelect} to ${group.maxSelect} for “${group.name}”.`,
      );
    }
    for (const key of keys) {
      const option = group.options.find((o) => o.key === key);
      if (!option) {
        throw new ConvexError(`“${group.name}” no longer has that option. Remove the item and add it again.`);
      }
      optionNames.push(option.name);
      priceDelta += option.priceDelta;
      for (const delta of option.recipeDelta) uses.push({ stockItemId: delta.stockItemId, qty: delta.qty });
    }
  }
  return { optionNames, priceDelta, uses };
}

/** What one of this product takes off the shelf, before its options are added. */
async function baseUses(ctx: TenantQueryCtx, product: Doc<"products">) {
  if (product.kind === "stocked") {
    return product.stockItemId ? [{ stockItemId: product.stockItemId, qty: 1 }] : [];
  }
  if (product.kind === "service") return [];
  const lines = await ctx.db
    .query("recipeLines")
    .withIndex("by_tenant_product", (q) => q.eq("tenantId", ctx.tenantId).eq("productId", product._id))
    .take(MAX_RECIPE_LINES);
  return lines.map((line) => ({ stockItemId: line.stockItemId, qty: line.qty }));
}

/** The cost of the extra ingredients an option adds, at today's average cost. */
async function usesCost(ctx: TenantQueryCtx, uses: { stockItemId: Id<"stockItems">; qty: number }[]) {
  let total = 0;
  for (const use of uses) {
    const item = await ctx.db.get(use.stockItemId);
    if (item && item.tenantId === ctx.tenantId) total += use.qty * item.avgCost;
  }
  return total;
}

/**
 * Prices every line from the catalog as it stands right now, snapshotting the name, unit
 * price and unit cost (CLAUDE.md rule 7). Archived products and vanished options are refused
 * rather than guessed at, so a stale tablet cannot sell what the shop stopped selling.
 */
export async function priceLines(ctx: TenantQueryCtx, lines: SaleLineInput[]): Promise<PricedLine[]> {
  if (lines.length === 0) throw new ConvexError("Add something to the order first.");
  if (lines.length > MAX_SALE_LINES) throw new ConvexError(`An order can have up to ${MAX_SALE_LINES} lines.`);

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const product = await getOwned(ctx, ctx.tenantId, line.productId);
    if (!product.isActive) throw new ConvexError(`“${product.name}” is no longer sold. Remove it from the order.`);
    const qty = assertLineQty(product.name, line.qty);
    const { optionNames, priceDelta, uses: optionUses } = await resolveOptions(ctx, product, line.optionKeys);

    // A negative modifier (a discount option) can never push a line below zero.
    const unitPrice = Math.min(Math.max(0, product.price + priceDelta), MAX_MONEY);
    const baseCost = await productCost(ctx, product);
    const unitCost = Math.min(roundMinor(baseCost + (await usesCost(ctx, optionUses))), MAX_MONEY);

    const uses = new Map<Id<"stockItems">, number>();
    for (const use of [...(await baseUses(ctx, product)), ...optionUses]) {
      uses.set(use.stockItemId, roundQty((uses.get(use.stockItemId) ?? 0) + use.qty));
    }

    priced.push({
      productId: product._id,
      name: product.name,
      optionNames,
      qty,
      unitPrice,
      unitCost,
      discount: 0, // line discounts arrive in Week 5 with the manager PIN
      uses: [...uses].map(([stockItemId, used]) => ({ stockItemId, qty: used })),
    });
  }
  return priced;
}

/** Order totals, with the VAT split rounded once on the order (see money.ts). */
export function computeTotals(priced: PricedLine[], tenant: Tenant) {
  const subtotal = priced.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  assertMoney("The order total", subtotal);
  const { tax, total } = taxBreakdown(subtotal, tenant.taxRateBps, tenant.pricesIncludeTax);
  const cogs = priced.reduce((sum, line) => sum + line.unitCost * line.qty, 0);
  return { subtotal, discount: 0, tax, total, cogs };
}

export type PaymentInput = {
  method: Doc<"sales">["payments"][number]["method"];
  amount: number;
  ref?: string;
  photoId?: Id<"_storage">;
};

/**
 * Payments must cover the total. Only cash may overpay, and the excess is the change given;
 * an e-wallet or card that overpays is a typo, not a tip, so it is refused.
 */
export function settlePayments(total: number, payments: PaymentInput[]) {
  if (payments.length === 0) throw new ConvexError("Take a payment first.");
  if (payments.length > MAX_PAYMENTS) throw new ConvexError(`Split an order across up to ${MAX_PAYMENTS} payments.`);

  const cleaned = payments.map((payment) => {
    assertMoney("A payment", payment.amount);
    if (payment.amount <= 0) throw new ConvexError("Every payment has to be more than zero.");
    const ref = payment.ref?.trim();
    if (ref && ref.length > MAX_PAYMENT_REF) {
      throw new ConvexError(`Keep the reference under ${MAX_PAYMENT_REF} characters.`);
    }
    return {
      method: payment.method,
      amount: payment.amount,
      ...(ref ? { ref } : {}),
      ...(payment.photoId ? { photoId: payment.photoId } : {}),
    };
  });

  const paid = cleaned.reduce((sum, payment) => sum + payment.amount, 0);
  if (paid < total) throw new ConvexError("That does not cover the order total yet.");
  const cash = cleaned.reduce((sum, payment) => sum + (payment.method === "cash" ? payment.amount : 0), 0);
  const change = paid - total;
  if (change > cash) throw new ConvexError("A card or e-wallet payment cannot be more than the amount due.");
  return { payments: cleaned, paid, changeGiven: change };
}
