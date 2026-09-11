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
      .collect(),
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
