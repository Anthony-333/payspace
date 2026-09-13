import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { businessType } from "./schema";
import { requireRole, tenantMutation, tenantQuery, userMutation, userQuery } from "./lib/tenant";
import { validateSlug } from "./lib/slugs";

// Philippine launch defaults (CLAUDE.md "Market defaults").
const DEFAULTS = {
  currency: "PHP",
  timezone: "Asia/Manila",
  taxRateBps: 1200,
  pricesIncludeTax: true,
  targetMarginBps: 6000,
  discountLimitBps: 1000,
};

const MAX_RECEIPT_FOOTER = 200;

/** Settings that later code relies on (businessDate uses the timezone), so they're checked on the way in. */
function checkLocale(args: { currency?: string; timezone?: string; receiptFooter?: string }) {
  if (args.currency !== undefined && !/^[A-Z]{3}$/.test(args.currency)) {
    throw new ConvexError("Currency must be a 3-letter code, like PHP.");
  }
  if (args.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: args.timezone });
    } catch {
      throw new ConvexError("That time zone isn't recognized. Use a name like Asia/Manila.");
    }
  }
  if (args.receiptFooter !== undefined && args.receiptFooter.length > MAX_RECEIPT_FOOTER) {
    throw new ConvexError(`Keep the receipt footer under ${MAX_RECEIPT_FOOTER} characters.`);
  }
}

function checkBps(label: string, value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new ConvexError(`${label} must be between 0% and 100%.`);
  }
}

/** Onboarding: creates the business and makes the caller its owner, in one transaction. */
export const create = userMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    businessType,
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    taxRateBps: v.optional(v.number()),
    pricesIncludeTax: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ConvexError("Enter a business name between 2 and 80 characters.");
    }
    checkBps("Tax rate", args.taxRateBps);
    checkLocale(args);
    const slug = validateSlug(args.slug);

    const taken = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (taken) throw new ConvexError("That shop link is taken. Try another one.");

    const tenantId = await ctx.db.insert("tenants", {
      ...DEFAULTS,
      name,
      slug,
      businessType: args.businessType,
      currency: args.currency ?? DEFAULTS.currency,
      timezone: args.timezone ?? DEFAULTS.timezone,
      taxRateBps: args.taxRateBps ?? DEFAULTS.taxRateBps,
      pricesIncludeTax: args.pricesIncludeTax ?? DEFAULTS.pricesIncludeTax,
    });
    await ctx.db.insert("members", {
      tenantId,
      userId: ctx.userId,
      name: ctx.identity.name ?? ctx.identity.email ?? "Owner",
      role: "owner",
      status: "active",
    });
    return { tenantId, slug };
  },
});

/** Shops the caller is an active member of, for the shop switcher and post-sign-in redirect. */
export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", ctx.userId))
      .collect();
    const shops = [];
    for (const m of memberships) {
      if (m.status !== "active") continue;
      const tenant = await ctx.db.get(m.tenantId);
      if (tenant) shops.push({ tenantId: tenant._id, name: tenant.name, slug: tenant.slug, role: m.role });
    }
    return shops;
  },
});

/** Resolves a URL slug to a shop, but only for its active members; otherwise null. */
export const bySlug = userQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug.toLowerCase()))
      .unique();
    if (!tenant) return null;
    const member = await ctx.db
      .query("members")
      .withIndex("by_tenant_user", (q) => q.eq("tenantId", tenant._id).eq("userId", ctx.userId))
      .unique();
    if (!member || member.status !== "active") return null;
    return { tenantId: tenant._id, name: tenant.name, slug: tenant.slug, role: member.role, memberName: member.name };
  },
});

export const get = tenantQuery({
  args: {},
  handler: async (ctx) => ({ ...ctx.tenant, role: ctx.member.role }),
});

export const updateSettings = tenantMutation({
  args: {
    name: v.optional(v.string()),
    businessType: v.optional(businessType),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    taxRateBps: v.optional(v.number()),
    pricesIncludeTax: v.optional(v.boolean()),
    targetMarginBps: v.optional(v.number()),
    discountLimitBps: v.optional(v.number()),
    receiptFooter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireRole(ctx.member, "owner");
    checkBps("Tax rate", args.taxRateBps);
    checkBps("Target margin", args.targetMarginBps);
    checkBps("Discount limit", args.discountLimitBps);
    checkLocale(args);
    const name = args.name?.trim();
    if (name !== undefined && (name.length < 2 || name.length > 80)) {
      throw new ConvexError("Enter a business name between 2 and 80 characters.");
    }
    await ctx.db.patch(ctx.tenantId, { ...args, ...(name !== undefined && { name }) });

    // Margin flags depend on these, so re-flag every product in the background.
    const { tenant } = ctx;
    if ((args.targetMarginBps !== undefined && args.targetMarginBps !== tenant.targetMarginBps)
      || (args.taxRateBps !== undefined && args.taxRateBps !== tenant.taxRateBps)
      || (args.pricesIncludeTax !== undefined && args.pricesIncludeTax !== tenant.pricesIncludeTax)) {
      await ctx.scheduler.runAfter(0, internal.costing.refreshAllProducts, { tenantId: ctx.tenantId, cursor: null });
    }
  },
});
