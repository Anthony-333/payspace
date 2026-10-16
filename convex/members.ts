import { requireRole, tenantMutation, tenantQuery } from "./lib/tenant";

export const list = tenantQuery({
  args: {},
  handler: async (ctx) => {
    requireRole(ctx.member, "owner", "manager");
    const members = await ctx.db
      .query("members")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
    // Never send pinHash to the client.
    return members.map((m) => ({
      _id: m._id,
      userId: m.userId,
      name: m.name,
      role: m.role,
      status: m.status,
      hasPin: m.pinHash !== undefined,
    }));
  },
});

/** Whether the caller has finished or skipped the welcome tour in this shop. */
export const tour = tenantQuery({
  args: {},
  handler: async (ctx) => ({ completed: ctx.member.tourCompletedAt !== undefined }),
});

/** Marks the welcome tour done for the caller only. Skipping counts as done. */
export const completeTour = tenantMutation({
  args: {},
  handler: async (ctx) => {
    if (ctx.member.tourCompletedAt === undefined) {
      await ctx.db.patch(ctx.member._id, { tourCompletedAt: Date.now() });
    }
    return null;
  },
});
