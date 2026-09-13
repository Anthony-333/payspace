import { ConvexError, v } from "convex/values";
import { MAX_RECIPE_LINES } from "./lib/stock";
import { getOwned, requireRole, tenantQuery } from "./lib/tenant";

// Recipes are saved with their product (products.create / products.update take `recipe`),
// so a product and its cost never disagree. This reads them back for the editor.

/** A recipe product's ingredient lines, in base units per product sold. Owners and managers only. */
export const forProduct = tenantQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    requireRole(ctx.member, "owner", "manager");
    const product = await getOwned(ctx, ctx.tenantId, productId);
    if (product.kind !== "recipe") throw new ConvexError("Only products made from ingredients have a recipe.");
    const lines = await ctx.db
      .query("recipeLines")
      .withIndex("by_tenant_product", (q) => q.eq("tenantId", ctx.tenantId).eq("productId", productId))
      .take(MAX_RECIPE_LINES);
    return lines.map((line) => ({ stockItemId: line.stockItemId, qty: line.qty }));
  },
});
