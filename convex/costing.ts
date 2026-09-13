import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { refreshProductCost } from "./lib/stock";

// Background recosting (docs/mvp-plan.md "Costing"). When a stock item's average cost changes,
// every product that uses it gets a fresh cached unitCost and margin flag. Past sales keep
// the cost they were sold at, so reports never shift.
//
// Each run does a small, bounded amount of work and schedules the rest, so a big delivery or a
// big catalog never exceeds a transaction's read limits. Recosting a product twice is harmless.

const PAGE = 50;

/** Recosts products that use the first stock item, one page of its recipe lines per run. */
export const refreshForStockItems = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    stockItemIds: v.array(v.id("stockItems")),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { tenantId, stockItemIds, cursor }) => {
    const [stockItemId, ...rest] = stockItemIds;
    const tenant = await ctx.db.get(tenantId);
    if (!stockItemId || !tenant) return;

    const productIds = new Set<Id<"products">>();
    if (cursor === null) {
      // A stock item sells as at most one stocked product.
      const stocked = await ctx.db
        .query("products")
        .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", tenantId).eq("stockItemId", stockItemId))
        .take(5);
      for (const p of stocked) productIds.add(p._id);
    }
    const lines = await ctx.db
      .query("recipeLines")
      .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", tenantId).eq("stockItemId", stockItemId))
      .paginate({ numItems: PAGE, cursor });
    for (const line of lines.page) productIds.add(line.productId);

    for (const id of productIds) {
      const product = await ctx.db.get(id);
      if (product && product.tenantId === tenantId) await refreshProductCost(ctx, tenant, product);
    }

    const next = lines.isDone ? { stockItemIds: rest, cursor: null } : { stockItemIds, cursor: lines.continueCursor };
    if (next.stockItemIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.costing.refreshForStockItems, { tenantId, ...next });
    }
  },
});

/** After the target margin or tax settings change, re-flags every product, one page at a time. */
export const refreshAllProducts = internalMutation({
  args: { tenantId: v.id("tenants"), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { tenantId, cursor }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) return;
    const page = await ctx.db
      .query("products")
      .withIndex("by_tenant_active", (q) => q.eq("tenantId", tenantId))
      .paginate({ numItems: PAGE, cursor });
    for (const product of page.page) await refreshProductCost(ctx, tenant, product);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.costing.refreshAllProducts, { tenantId, cursor: page.continueCursor });
    }
  },
});
