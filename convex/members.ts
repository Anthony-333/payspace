import { requireRole, tenantQuery } from "./lib/tenant";

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
