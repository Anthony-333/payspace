import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { baseUnit } from "./schema";
import { blendAvgCost, roundAvgCost } from "./lib/costing";
import { MAX_MONEY } from "./lib/money";
import { canSeeCost } from "./lib/products";
import { checkQty, roundQty, stockStatus } from "./lib/quantity";
import { assertQty, cleanNote, recordMovement, scheduleCostRefresh } from "./lib/stock";
import { getOwned, requireRole, tenantMutation, tenantQuery, type TenantQueryCtx } from "./lib/tenant";

// Stock items, receiving, waste, adjustments, counts and the ledger (docs/mvp-plan.md "Inventory").
// Quantities are base units. Receiving blends the average cost and recosts products in the background.

const MAX_ITEMS = 1000;
const MAX_RECEIVE_LINES = 100;
const MAX_COUNT_LINES = 500;

const purchaseUnit = v.object({ name: v.string(), factor: v.number() });

function toClientItem(ctx: TenantQueryCtx, item: Doc<"stockItems">) {
  return {
    _id: item._id,
    _creationTime: item._creationTime,
    name: item.name,
    baseUnit: item.baseUnit,
    purchaseUnit: item.purchaseUnit,
    onHand: item.onHand,
    reorderPoint: item.reorderPoint,
    lastReceivedAt: item.lastReceivedAt,
    status: stockStatus(item),
    // Cashiers log waste, so they see stock levels, but never costs.
    avgCost: canSeeCost(ctx.member) ? item.avgCost : null,
  };
}

function cleanItemName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) throw new ConvexError("Enter an item name up to 60 characters.");
  return trimmed;
}

function cleanPurchaseUnit(unit: { name: string; factor: number } | undefined) {
  if (unit === undefined) return undefined;
  const name = unit.name.trim();
  if (name.length < 1 || name.length > 30) throw new ConvexError("Name the purchase unit in up to 30 characters, like “1 kg bag”.");
  return { name, factor: assertQty("The purchase unit size", unit.factor) };
}

function assertAvgCost(cost: number) {
  if (!Number.isFinite(cost) || cost < 0 || cost > MAX_MONEY) throw new ConvexError("Enter a valid cost.");
  return roundAvgCost(cost);
}

/** Every stock item in the shop, by name. */
export const listItems = tenantQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("stockItems")
      .withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId))
      .take(MAX_ITEMS);
    return items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => toClientItem(ctx, item));
  },
});

/** One item, with the products that use it (so people know what a change affects). */
export const getItem = tenantQuery({
  args: { stockItemId: v.id("stockItems") },
  handler: async (ctx, { stockItemId }) => {
    const item = await getOwned(ctx, ctx.tenantId, stockItemId);
    const [stocked, lines] = await Promise.all([
      ctx.db
        .query("products")
        .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", ctx.tenantId).eq("stockItemId", stockItemId))
        .take(5),
      ctx.db
        .query("recipeLines")
        .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", ctx.tenantId).eq("stockItemId", stockItemId))
        .take(50),
    ]);
    const usedIn: { _id: Id<"products">; name: string; isActive: boolean }[] = [];
    const seen = new Set<Id<"products">>();
    for (const productId of [...stocked.map((p) => p._id), ...lines.map((l) => l.productId)]) {
      if (seen.has(productId)) continue;
      seen.add(productId);
      const product = await ctx.db.get(productId);
      if (product) usedIn.push({ _id: product._id, name: product.name, isActive: product.isActive });
    }
    return { ...toClientItem(ctx, item), sellsAs: stocked[0]?._id ?? null, usedIn };
  },
});

/** The ledger for one item, newest first, with who made each change. Owners and managers only. */
export const movements = tenantQuery({
  args: { stockItemId: v.id("stockItems"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { stockItemId, paginationOpts }) => {
    requireRole(ctx.member, "owner", "manager");
    await getOwned(ctx, ctx.tenantId, stockItemId);
    const result = await ctx.db
      .query("stockMovements")
      .withIndex("by_tenant_item", (q) => q.eq("tenantId", ctx.tenantId).eq("stockItemId", stockItemId))
      .order("desc")
      .paginate(paginationOpts);
    const names = new Map<Id<"members">, string>();
    const page = [];
    for (const m of result.page) {
      if (!names.has(m.memberId)) {
        const member = await ctx.db.get(m.memberId);
        names.set(m.memberId, member?.tenantId === ctx.tenantId ? member.name : "Former staff");
      }
      page.push({
        _id: m._id,
        _creationTime: m._creationTime,
        type: m.type,
        qty: m.qty,
        unitCost: m.unitCost,
        note: m.note,
        saleId: m.saleId,
        memberName: names.get(m.memberId)!,
      });
    }
    return { ...result, page };
  },
});

const itemFields = {
  name: v.string(),
  purchaseUnit: v.optional(purchaseUnit),
  reorderPoint: v.number(),
  /** Minor units per base unit. Only accepted until the item's first delivery is received. */
  avgCost: v.optional(v.number()),
};

export const createItem = tenantMutation({
  args: { ...itemFields, baseUnit },
  handler: async (ctx, args) => {
    requireRole(ctx.member, "owner", "manager");
    return ctx.db.insert("stockItems", {
      tenantId: ctx.tenantId,
      name: cleanItemName(args.name),
      baseUnit: args.baseUnit,
      purchaseUnit: cleanPurchaseUnit(args.purchaseUnit),
      onHand: 0,
      avgCost: args.avgCost === undefined ? 0 : assertAvgCost(args.avgCost),
      reorderPoint: assertQty("The reorder point", args.reorderPoint, { allowZero: true }),
    });
  },
});

/** The base unit can't change: every quantity in the ledger and in recipes is measured in it. */
export const updateItem = tenantMutation({
  args: { stockItemId: v.id("stockItems"), ...itemFields },
  handler: async (ctx, { stockItemId, ...args }) => {
    requireRole(ctx.member, "owner", "manager");
    const item = await getOwned(ctx, ctx.tenantId, stockItemId);
    const patch: Partial<Doc<"stockItems">> = {
      name: cleanItemName(args.name),
      purchaseUnit: cleanPurchaseUnit(args.purchaseUnit),
      reorderPoint: assertQty("The reorder point", args.reorderPoint, { allowZero: true }),
    };
    if (args.avgCost !== undefined) {
      const avgCost = assertAvgCost(args.avgCost);
      if (avgCost !== item.avgCost) {
        if (item.lastReceivedAt !== undefined) {
          throw new ConvexError("This item's cost comes from the stock you receive. Receive a delivery to update it.");
        }
        patch.avgCost = avgCost;
      }
    }
    await ctx.db.patch(stockItemId, patch);
    if (patch.avgCost !== undefined) await scheduleCostRefresh(ctx, ctx.tenantId, [stockItemId]);
  },
});

/** Only items nothing refers to can be deleted: no ledger rows, products, recipes or modifier options. */
export const removeItem = tenantMutation({
  args: { stockItemId: v.id("stockItems") },
  handler: async (ctx, { stockItemId }) => {
    requireRole(ctx.member, "owner", "manager");
    const item = await getOwned(ctx, ctx.tenantId, stockItemId);
    const [movement, product, line, groups] = await Promise.all([
      ctx.db.query("stockMovements")
        .withIndex("by_tenant_item", (q) => q.eq("tenantId", ctx.tenantId).eq("stockItemId", stockItemId)).first(),
      ctx.db.query("products")
        .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", ctx.tenantId).eq("stockItemId", stockItemId)).first(),
      ctx.db.query("recipeLines")
        .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", ctx.tenantId).eq("stockItemId", stockItemId)).first(),
      ctx.db.query("modifierGroups").withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId)).take(200),
    ]);
    if (movement) throw new ConvexError(`“${item.name}” has stock history, so it can't be deleted.`);
    if (product) throw new ConvexError(`“${item.name}” is sold as a product. Archive the product instead.`);
    if (line) throw new ConvexError(`“${item.name}” is used in a recipe. Remove it from the recipe first.`);
    const group = groups.find((g) => g.options.some((o) => o.recipeDelta.some((d) => d.stockItemId === stockItemId)));
    if (group) throw new ConvexError(`“${item.name}” is used by the “${group.name}” modifier. Remove it there first.`);
    await ctx.db.delete(stockItemId);
  },
});

/**
 * Receives a delivery. Each line takes a quantity (in base or purchase units) and the total cost
 * from the supplier's receipt; the unit cost and new average are worked out here.
 */
export const receive = tenantMutation({
  args: {
    lines: v.array(v.object({
      stockItemId: v.id("stockItems"),
      qty: v.number(),
      unit: v.union(v.literal("base"), v.literal("purchase")),
      totalCost: v.number(),
    })),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { lines, note }) => {
    requireRole(ctx.member, "owner", "manager");
    if (lines.length < 1 || lines.length > MAX_RECEIVE_LINES) {
      throw new ConvexError(`Receive between 1 and ${MAX_RECEIVE_LINES} items at a time.`);
    }
    const cleanedNote = cleanNote(note);
    const now = Date.now();
    const changedCost: Id<"stockItems">[] = [];

    for (const line of lines) {
      let item = await getOwned(ctx, ctx.tenantId, line.stockItemId);
      if (!Number.isSafeInteger(line.totalCost) || line.totalCost < 0 || line.totalCost > MAX_MONEY) {
        throw new ConvexError(`Enter the total cost for “${item.name}”.`);
      }
      let qty = assertQty(`The quantity of “${item.name}”`, line.qty);
      if (line.unit === "purchase") {
        if (!item.purchaseUnit) throw new ConvexError(`“${item.name}” has no purchase unit. Enter the amount in ${item.baseUnit}.`);
        qty = assertQty(`The quantity of “${item.name}”`, line.qty * item.purchaseUnit.factor);
      }
      const unitCost = roundAvgCost(line.totalCost / qty);
      const avgCost = blendAvgCost(item.onHand, item.avgCost, qty, unitCost);
      if (avgCost !== item.avgCost) changedCost.push(item._id);
      // Re-read on each line so an item listed twice blends both deliveries.
      item = await recordMovement(ctx, item, { type: "receive", qty, unitCost, note: cleanedNote }, { avgCost, lastReceivedAt: now });
    }
    await scheduleCostRefresh(ctx, ctx.tenantId, changedCost);
    return { received: lines.length };
  },
});

/** Spilled milk, expired bread. Any member can log waste; it's costed at the current average. */
export const logWaste = tenantMutation({
  args: { stockItemId: v.id("stockItems"), qty: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { stockItemId, qty, note }) => {
    const item = await getOwned(ctx, ctx.tenantId, stockItemId);
    const amount = assertQty("The amount wasted", qty);
    await recordMovement(ctx, item, { type: "waste", qty: -amount, unitCost: item.avgCost, note: cleanNote(note) });
  },
});

/** Corrects one item to what's really on the shelf, writing the difference to the ledger. */
export const adjust = tenantMutation({
  args: { stockItemId: v.id("stockItems"), counted: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { stockItemId, counted, note }) => {
    requireRole(ctx.member, "owner", "manager");
    const item = await getOwned(ctx, ctx.tenantId, stockItemId);
    const actual = assertQty("The counted amount", counted, { allowZero: true });
    const diff = roundQty(actual - item.onHand);
    if (diff === 0) return { diff };
    await recordMovement(ctx, item, { type: "adjust", qty: diff, unitCost: item.avgCost, note: cleanNote(note) });
    return { diff };
  },
});

/**
 * Saves a stock count in one pass. Each count is compared with on-hand stock when it's saved,
 * not when the count started, so sales rung up during the count aren't lost.
 */
export const submitCount = tenantMutation({
  args: {
    counts: v.array(v.object({ stockItemId: v.id("stockItems"), counted: v.number() })),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { counts, note }) => {
    requireRole(ctx.member, "owner", "manager");
    if (counts.length < 1 || counts.length > MAX_COUNT_LINES) {
      throw new ConvexError(`Count between 1 and ${MAX_COUNT_LINES} items at a time.`);
    }
    const cleanedNote = cleanNote(note) ?? "Stock count";
    const seen = new Set<Id<"stockItems">>();
    let changed = 0;
    for (const { stockItemId, counted } of counts) {
      const item = await getOwned(ctx, ctx.tenantId, stockItemId);
      if (seen.has(item._id)) throw new ConvexError(`“${item.name}” was counted twice.`);
      seen.add(item._id);
      const message = checkQty(`The count for “${item.name}”`, counted, { allowZero: true });
      if (message) throw new ConvexError(message);
      const diff = roundQty(counted - item.onHand);
      if (diff === 0) continue;
      await recordMovement(ctx, item, { type: "adjust", qty: diff, unitCost: item.avgCost, note: cleanedNote });
      changed++;
    }
    return { changed, unchanged: counts.length - changed };
  },
});
