import { ConvexError, v } from "convex/values";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Doc, Id, TableNames } from "../_generated/dataModel";

// The only file allowed to import the raw `query` and `mutation` (see eslint.config.mjs).

export type Role = Doc<"members">["role"];

type TenantExtras = { tenantId: Id<"tenants">; tenant: Doc<"tenants">; member: Doc<"members"> };
/** The ctx a tenantQuery/tenantMutation handler receives, for helpers outside the handler. */
export type TenantQueryCtx = QueryCtx & TenantExtras;
export type TenantMutationCtx = MutationCtx & TenantExtras;

async function requireIdentity(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Sign in to continue.");
  return identity;
}

async function loadMembership(ctx: QueryCtx, tenantId: Id<"tenants">) {
  const identity = await requireIdentity(ctx);

  const member = await ctx.db
    .query("members")
    .withIndex("by_tenant_user", (q) =>
      q.eq("tenantId", tenantId).eq("userId", identity.subject))
    .unique();
  if (!member || member.status !== "active") {
    throw new ConvexError("You don't have access to this business.");
  }

  const tenant = await ctx.db.get(tenantId);
  if (!tenant) throw new ConvexError("Business not found.");
  return { tenant, member };
}

const tenantArgs = { tenantId: v.id("tenants") };

/** Tenant-scoped query: the caller must be an active member of `tenantId`. */
export const tenantQuery = customQuery(query, {
  args: tenantArgs,
  input: async (ctx, { tenantId }) => ({
    ctx: { tenantId, ...(await loadMembership(ctx, tenantId)) },
    args: {},
  }),
});

/** Tenant-scoped mutation: the caller must be an active member of `tenantId`. */
export const tenantMutation = customMutation(mutation, {
  args: tenantArgs,
  input: async (ctx, { tenantId }) => ({
    ctx: { tenantId, ...(await loadMembership(ctx, tenantId)) },
    args: {},
  }),
});

/** Signed-in but not tied to a shop yet: listing my shops, creating a shop. */
export const userQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const identity = await requireIdentity(ctx);
    return { ctx: { identity, userId: identity.subject }, args: {} };
  },
});

export const userMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const identity = await requireIdentity(ctx);
    return { ctx: { identity, userId: identity.subject }, args: {} };
  },
});

export function requireRole(member: Doc<"members">, ...allowed: Role[]) {
  if (!allowed.includes(member.role)) {
    throw new ConvexError("Your role can't do this. Ask the owner or a manager.");
  }
}

type TenantTable = {
  [T in TableNames]: Doc<T> extends { tenantId: Id<"tenants"> } ? T : never;
}[TableNames];

/** Every ID that arrives from the client is re-checked against the tenant. */
export async function getOwned<T extends TenantTable>(
  ctx: QueryCtx,
  tenantId: Id<"tenants">,
  id: Id<T>,
): Promise<Doc<T>> {
  const doc = (await ctx.db.get(id)) as (Doc<T> & { tenantId: Id<"tenants"> }) | null;
  if (!doc || doc.tenantId !== tenantId) throw new ConvexError("Not found.");
  return doc;
}
