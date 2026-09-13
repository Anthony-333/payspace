import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { isBelowTarget, recipeCost } from "./lib/costing";
import { insertProduct } from "./lib/products";
import { TEMPLATES } from "./lib/templateData";
import { requireRole, tenantMutation, tenantQuery, type TenantQueryCtx } from "./lib/tenant";

async function catalogIsEmpty(ctx: TenantQueryCtx) {
  const [category, product, stockItem] = await Promise.all([
    ctx.db.query("categories").withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId)).first(),
    ctx.db.query("products").withIndex("by_tenant_active", (q) => q.eq("tenantId", ctx.tenantId)).first(),
    ctx.db.query("stockItems").withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId)).first(),
  ]);
  return !category && !product && !stockItem;
}

/** Whether this shop can still load a starter catalog, and how big it is. */
export const available = tenantQuery({
  args: {},
  handler: async (ctx) => {
    const template = TEMPLATES[ctx.tenant.businessType];
    if (!template || !(await catalogIsEmpty(ctx))) return null;
    return {
      businessType: ctx.tenant.businessType,
      products: template.products.length,
      categories: template.categories.length,
      stockItems: template.stockItems.length,
    };
  },
});

/**
 * Loads the starter catalog for the shop's business type in one transaction: categories,
 * ingredients (0 on hand, so the empty ledger still matches), modifier groups, products
 * and recipes, with each recipe product's cost worked out. Only runs on an empty catalog.
 */
export const apply = tenantMutation({
  args: {},
  handler: async (ctx) => {
    requireRole(ctx.member, "owner");
    const template = TEMPLATES[ctx.tenant.businessType];
    if (!template) throw new ConvexError("There's no starter menu for this type of business yet.");
    if (!(await catalogIsEmpty(ctx))) {
      throw new ConvexError("A starter menu can only be added to an empty catalog.");
    }
    const { tenantId } = ctx;

    const categoryIds = new Map<string, Id<"categories">>();
    for (const [index, name] of template.categories.entries()) {
      categoryIds.set(name, await ctx.db.insert("categories", { tenantId, name, sortOrder: index + 1 }));
    }

    const stockItemIds = new Map<string, Id<"stockItems">>();
    const avgCosts = new Map<Id<"stockItems">, { avgCost: number }>();
    for (const { key, ...item } of template.stockItems) {
      const id = await ctx.db.insert("stockItems", { tenantId, ...item, onHand: 0 });
      stockItemIds.set(key, id);
      avgCosts.set(id, { avgCost: item.avgCost });
    }
    const lines = (recipe: [string, number][]) =>
      recipe.map(([key, qty]) => {
        const stockItemId = stockItemIds.get(key);
        if (!stockItemId) throw new Error(`Template recipe uses unknown stock item "${key}"`);
        return { stockItemId, qty };
      });

    const groupIds = new Map<string, Id<"modifierGroups">>();
    for (const { key, options, ...group } of template.modifierGroups) {
      groupIds.set(key, await ctx.db.insert("modifierGroups", {
        tenantId,
        ...group,
        options: options.map(({ recipe, ...option }) => ({ ...option, recipeDelta: lines(recipe ?? []) })),
      }));
    }

    for (const product of template.products) {
      const categoryId = categoryIds.get(product.category);
      if (product.kind === "stocked") {
        await insertProduct(ctx, "stocked", {
          name: product.name, price: product.price, categoryId, modifierGroupIds: [],
          barcode: undefined, sku: undefined, imageId: undefined,
        }, product.cost);
        continue;
      }
      const recipe = lines(product.recipe);
      const unitCost = recipeCost(recipe, avgCosts);
      const productId = await ctx.db.insert("products", {
        tenantId,
        categoryId,
        name: product.name,
        kind: "recipe",
        price: product.price,
        unitCost,
        belowTargetMargin: isBelowTarget(product.price, unitCost, ctx.tenant),
        modifierGroupIds: (product.groups ?? []).map((key) => {
          const id = groupIds.get(key);
          if (!id) throw new Error(`Template product uses unknown modifier group "${key}"`);
          return id;
        }),
        isActive: true,
      });
      for (const line of recipe) await ctx.db.insert("recipeLines", { tenantId, productId, ...line });
    }
    return { products: template.products.length };
  },
});
