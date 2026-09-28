import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { addDays } from "./businessDate";
import type { TenantQueryCtx } from "./tenant";

// Free vs Pro (components/marketing/content.ts PLAN_ROWS is the public version of this).
// The plan comes from tenants.billing, which the Polar webhook keeps current, so a check
// costs no extra reads. Every limit is enforced here, on the server; the UI only explains it.

export const FREE_LIMITS = { products: 50, historyDays: 7 } as const;
export const TRIAL_DAYS = 14;

// past_due stays Pro while Polar retries the card. unpaid, canceled, incomplete and paused don't.
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isProStatus(status: string | undefined) {
  return status !== undefined && PRO_STATUSES.has(status);
}

export function isPro(tenant: Doc<"tenants">) {
  return isProStatus(tenant.billing?.subscription?.status);
}

const UPGRADE = "Upgrade to Pro in Settings.";

export function requirePro(tenant: Doc<"tenants">, feature: string) {
  if (!isPro(tenant)) throw new ConvexError(`${feature} is part of Pro. ${UPGRADE}`);
}

/** How many more active products the shop may have: Infinity on Pro. Reads at most 50 rows. */
export async function productRoom(ctx: TenantQueryCtx) {
  if (isPro(ctx.tenant)) return Infinity;
  const active = await ctx.db
    .query("products")
    .withIndex("by_tenant_active", (q) => q.eq("tenantId", ctx.tenantId).eq("isActive", true))
    .take(FREE_LIMITS.products);
  return FREE_LIMITS.products - active.length;
}

export const PRODUCT_LIMIT_MESSAGE =
  `The Free plan includes up to ${FREE_LIMITS.products} active products. Archive one, or upgrade to Pro in Settings.`;

export async function assertProductRoom(ctx: TenantQueryCtx) {
  if ((await productRoom(ctx)) < 1) throw new ConvexError(PRODUCT_LIMIT_MESSAGE);
}

/**
 * The Free plan shows the last 7 days of history. "Last" is counted back from the shop's most
 * recent day of sales rather than the clock, because queries can't read the time reliably;
 * a shop can't move that date except by ringing up sales.
 */
export async function assertHistory(ctx: TenantQueryCtx, from: string) {
  if (isPro(ctx.tenant)) return;
  const latest = await ctx.db
    .query("dailyStats")
    .withIndex("by_tenant_date", (q) => q.eq("tenantId", ctx.tenantId))
    .order("desc")
    .first();
  if (!latest) return; // no sales yet, so nothing older to hide
  if (from < addDays(latest.businessDate, -(FREE_LIMITS.historyDays - 1))) {
    throw new ConvexError(`The Free plan shows the last ${FREE_LIMITS.historyDays} days. ${UPGRADE}`);
  }
}
