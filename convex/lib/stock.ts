import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isBelowTarget, recipeCost } from "./costing";
import { MAX_MONEY, roundMinor } from "./money";
import { checkQty, roundQty } from "./quantity";
import { getOwned, type TenantMutationCtx } from "./tenant";

// Server helpers for stock and costing. Every stock change goes through recordMovement,
// so the ledger stays the source of truth (CLAUDE.md rule 8).

export const MAX_RECIPE_LINES = 50;
export const MAX_NOTE = 200;

type Movement = {
  type: Doc<"stockMovements">["type"];
  qty: number; // positive in, negative out
  unitCost: number;
  note?: string;
  saleId?: Id<"sales">;
};

/** Trims a note; empty becomes undefined. */
export function cleanNote(note: string | undefined) {
  const trimmed = note?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_NOTE) throw new ConvexError(`Keep the note under ${MAX_NOTE} characters.`);
  return trimmed;
}

export function assertQty(label: string, qty: number, options?: Parameters<typeof checkQty>[2]) {
  const message = checkQty(label, qty, options);
  if (message) throw new ConvexError(message);
  return roundQty(qty);
}

/**
 * Writes one ledger row and moves the on-hand cache with it, plus any other stock item fields
 * that change in the same step (a receipt's new average cost). Returns the updated item.
 */
export async function recordMovement(
  ctx: TenantMutationCtx,
  item: Doc<"stockItems">,
  movement: Movement,
  patch: Partial<Pick<Doc<"stockItems">, "avgCost" | "lastReceivedAt">> = {},
): Promise<Doc<"stockItems">> {
  const qty = roundQty(movement.qty);
  await ctx.db.insert("stockMovements", {
    tenantId: ctx.tenantId,
    stockItemId: item._id,
    type: movement.type,
    qty,
    unitCost: movement.unitCost,
    memberId: ctx.member._id,
    ...(movement.note !== undefined && { note: movement.note }),
    ...(movement.saleId !== undefined && { saleId: movement.saleId }),
  });
  const onHand = roundQty(item.onHand + qty);
  await ctx.db.patch(item._id, { onHand, ...patch });
  return { ...item, onHand, ...patch };
}

/**
 * What one unit of a product costs now: its stock item's average, its recipe, or a service's fixed
 * cost. Capped at MAX_MONEY so an absurd recipe amount can never store an unsafe integer.
 */
export async function productCost(ctx: QueryCtx, product: Doc<"products">): Promise<number> {
  if (product.kind === "service") return product.unitCost;
  if (product.kind === "stocked") {
    const item = product.stockItemId && (await ctx.db.get(product.stockItemId));
    return item && item.tenantId === product.tenantId ? Math.min(roundMinor(item.avgCost), MAX_MONEY) : product.unitCost;
  }
  const lines = await ctx.db
    .query("recipeLines")
    .withIndex("by_tenant_product", (q) => q.eq("tenantId", product.tenantId).eq("productId", product._id))
    .take(MAX_RECIPE_LINES);
  const items = new Map<Id<"stockItems">, Doc<"stockItems">>();
  for (const line of lines) {
    if (items.has(line.stockItemId)) continue;
    const item = await ctx.db.get(line.stockItemId);
    if (item && item.tenantId === product.tenantId) items.set(line.stockItemId, item);
  }
  return Math.min(recipeCost(lines, items), MAX_MONEY);
}

/** Brings a product's cached cost and margin flag up to date. Pass the product as it is now. */
export async function refreshProductCost(ctx: MutationCtx, tenant: Doc<"tenants">, product: Doc<"products">) {
  const unitCost = await productCost(ctx, product);
  const belowTargetMargin = isBelowTarget(product.price, unitCost, tenant);
  if (unitCost !== product.unitCost || belowTargetMargin !== (product.belowTargetMargin ?? false)) {
    await ctx.db.patch(product._id, { unitCost, belowTargetMargin });
  }
  return { unitCost, belowTargetMargin };
}

/** After an average cost changes, recosts every product that uses the item, in the background. */
export async function scheduleCostRefresh(ctx: MutationCtx, tenantId: Id<"tenants">, stockItemIds: Id<"stockItems">[]) {
  const unique = [...new Set(stockItemIds)];
  if (unique.length === 0) return;
  await ctx.scheduler.runAfter(0, internal.costing.refreshForStockItems, { tenantId, stockItemIds: unique, cursor: null });
}

/** Validates recipe lines: shop-owned items, positive amounts, each item once. */
export async function prepareRecipe(ctx: TenantMutationCtx, lines: { stockItemId: Id<"stockItems">; qty: number }[]) {
  if (lines.length > MAX_RECIPE_LINES) {
    throw new ConvexError(`A recipe can have up to ${MAX_RECIPE_LINES} ingredients.`);
  }
  const seen = new Set<Id<"stockItems">>();
  const cleaned = [];
  for (const line of lines) {
    const item = await getOwned(ctx, ctx.tenantId, line.stockItemId);
    if (seen.has(item._id)) throw new ConvexError(`“${item.name}” is in the recipe twice. Combine the amounts.`);
    seen.add(item._id);
    cleaned.push({ stockItemId: item._id, qty: assertQty(`The amount of “${item.name}”`, line.qty) });
  }
  return cleaned;
}

/** Replaces a recipe product's lines. The caller refreshes the product's cost afterwards. */
export async function writeRecipe(
  ctx: TenantMutationCtx,
  productId: Id<"products">,
  lines: { stockItemId: Id<"stockItems">; qty: number }[],
) {
  const existing = await ctx.db
    .query("recipeLines")
    .withIndex("by_tenant_product", (q) => q.eq("tenantId", ctx.tenantId).eq("productId", productId))
    .take(MAX_RECIPE_LINES * 2);
  for (const line of existing) await ctx.db.delete(line._id);
  for (const line of lines) await ctx.db.insert("recipeLines", { tenantId: ctx.tenantId, productId, ...line });
}
