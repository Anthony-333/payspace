import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { refreshProductCost } from "./lib/stock";

// Background recosting (docs/mvp-plan.md "Costing"). When a stock item's average cost changes,
// every product that uses it gets a fresh cached unitCost and margin flag. Past sales keep
// the cost they were sold at, so reports never shift.

const BATCH = 100;

async function refreshBatch(ctx: MutationCtx, tenantId: Id<"tenants">, productIds: Id<"products">[]) {
  const tenant = await ctx.db.get(tenantId);
  if (!tenant) return;
  for (const id of productIds.slice(0, BATCH)) {
    const product = await ctx.db.get(id);
    if (product && product.tenantId === tenantId) await refreshProductCost(ctx, tenant, product);
  }
  const rest = productIds.slice(BATCH);
  if (rest.length) await ctx.scheduler.runAfter(0, internal.costing.refreshProducts, { tenantId, productIds: rest });
}

/** Finds products that use these stock items, directly (stocked) or through a recipe, and recosts them. */
export const refreshForStockItems = internalMutation({
  args: { tenantId: v.id("tenants"), stockItemIds: v.array(v.id("stockItems")) },
  handler: async (ctx, { tenantId, stockItemIds }) => {
    const productIds = new Set<Id<"products">>();
    for (const stockItemId of new Set(stockItemIds)) {
      const [stocked, lines] = await Promise.all([
        ctx.db
          .query("products")
          .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", tenantId).eq("stockItemId", stockItemId))
          .take(100),
        ctx.db
          .query("recipeLines")
          .withIndex("by_tenant_stock_item", (q) => q.eq("tenantId", tenantId).eq("stockItemId", stockItemId))
          .take(5000),
      ]);
      for (const p of stocked) productIds.add(p._id);
      for (const line of lines) productIds.add(line.productId);
    }
    await refreshBatch(ctx, tenantId, [...productIds]);
  },
});

export const refreshProducts = internalMutation({
  args: { tenantId: v.id("tenants"), productIds: v.array(v.id("products")) },
  handler: (ctx, { tenantId, productIds }) => refreshBatch(ctx, tenantId, productIds),
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
      .paginate({ numItems: BATCH, cursor });
    for (const product of page.page) await refreshProductCost(ctx, tenant, product);
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.costing.refreshAllProducts, { tenantId, cursor: page.continueCursor });
    }
  },
});
