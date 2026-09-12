import { ConvexError, v } from "convex/values";
import { getOwned, requireRole, tenantMutation, tenantQuery } from "./lib/tenant";

function cleanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    throw new ConvexError("Enter a category name up to 60 characters.");
  }
  return trimmed;
}

export const list = tenantQuery({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("categories")
      .withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId))
      .take(1000),
});

export const create = tenantMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    requireRole(ctx.member, "owner", "manager");
    const last = await ctx.db
      .query("categories")
      .withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId))
      .order("desc")
      .first();
    return ctx.db.insert("categories", {
      tenantId: ctx.tenantId,
      name: cleanName(name),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    });
  },
});

export const rename = tenantMutation({
  args: { categoryId: v.id("categories"), name: v.string() },
  handler: async (ctx, { categoryId, name }) => {
    requireRole(ctx.member, "owner", "manager");
    await getOwned(ctx, ctx.tenantId, categoryId);
    await ctx.db.patch(categoryId, { name: cleanName(name) });
  },
});

/** Swaps a category with its neighbour, which sets the tab order on the POS. */
export const move = tenantMutation({
  args: { categoryId: v.id("categories"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { categoryId, direction }) => {
    requireRole(ctx.member, "owner", "manager");
    const category = await getOwned(ctx, ctx.tenantId, categoryId);
    const neighbour = await ctx.db
      .query("categories")
      .withIndex("by_tenant", (q) =>
        direction === "up"
          ? q.eq("tenantId", ctx.tenantId).lt("sortOrder", category.sortOrder)
          : q.eq("tenantId", ctx.tenantId).gt("sortOrder", category.sortOrder))
      .order(direction === "up" ? "desc" : "asc")
      .first();
    if (!neighbour) return;
    await ctx.db.patch(categoryId, { sortOrder: neighbour.sortOrder });
    await ctx.db.patch(neighbour._id, { sortOrder: category.sortOrder });
  },
});

/** Only an empty category can be deleted; otherwise move or archive its products first. */
export const remove = tenantMutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    requireRole(ctx.member, "owner", "manager");
    await getOwned(ctx, ctx.tenantId, categoryId);
    for (const isActive of [true, false]) {
      const used = await ctx.db
        .query("products")
        .withIndex("by_tenant_active_category", (q) =>
          q.eq("tenantId", ctx.tenantId).eq("isActive", isActive).eq("categoryId", categoryId))
        .first();
      if (used) {
        throw new ConvexError(
          isActive
            ? "This category still has products. Move them to another category first."
            : "Archived products still use this category. Move them to another category first.",
        );
      }
    }
    await ctx.db.delete(categoryId);
  },
});
