import { PolarCore } from "@polar-sh/sdk/core.js";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { customersCreate } from "@polar-sh/sdk/funcs/customersCreate.js";
import { customersGetExternal } from "@polar-sh/sdk/funcs/customersGetExternal.js";
import { customerSessionsCreate } from "@polar-sh/sdk/funcs/customerSessionsCreate.js";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { FREE_LIMITS, isPro, isProStatus, TRIAL_DAYS } from "./lib/plan";
import { requireRole, tenantAction, tenantQuery, type TenantActionCtx } from "./lib/tenant";

// Pro subscriptions through Polar, the merchant of record. One subscription per shop, carrying
// the shop's id as metadata.orgId. The Polar customer is the owner, not the shop: Polar allows
// one customer per email, so an owner's shops share it, keyed by their Better Auth id
// (externalId). convex/http.ts verifies webhooks, and applySubscription below copies each
// subscription onto tenants.billing, which is what every plan check reads (convex/lib/plan.ts).
//
// Convex env: POLAR_ORGANIZATION_TOKEN, POLAR_WEBHOOK_SECRET, POLAR_PRO_PRODUCT_ID,
// POLAR_SERVER ("sandbox" or "production"), SITE_URL.

/** The shop's plan. Any member may read it (the UI shows what's locked); owners get the details. */
export const status = tenantQuery({
  args: {},
  handler: async (ctx) => {
    const pro = isPro(ctx.tenant);
    const billing = ctx.tenant.billing;
    const sub = billing?.subscription;
    return {
      plan: pro ? ("pro" as const) : ("free" as const),
      limits: FREE_LIMITS,
      trialDays: TRIAL_DAYS,
      details: ctx.member.role !== "owner" ? null : {
        status: sub?.status ?? null,
        trialEnd: sub?.status === "trialing" ? (sub.trialEnd ?? null) : null,
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        cancelAt: sub?.cancelAt ?? null,
        canTrial: !billing?.trialUsed,
        hasBillingAccount: billing !== undefined,
      },
    };
  },
});

function billingConfig() {
  const accessToken = process.env.POLAR_ORGANIZATION_TOKEN;
  const productId = process.env.POLAR_PRO_PRODUCT_ID;
  const siteUrl = process.env.SITE_URL;
  if (!accessToken || !productId || !siteUrl) {
    throw new ConvexError("Billing isn't set up yet. Try again later.");
  }
  const server = process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
  return { client: new PolarCore({ accessToken, server }), productId, siteUrl };
}

/** Logs Polar's error for us and gives the owner a plain message. */
function polarFailed(what: string, error: unknown): never {
  console.error(`Polar ${what} failed:`, error);
  throw new ConvexError("Couldn't reach the payment service. Try again.");
}

/** Starts Polar Checkout for Pro, with a free trial if the shop hasn't had one. Owners only. */
export const startCheckout = tenantAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    requireRole(ctx.member, "owner");
    if (isPro(ctx.tenant)) throw new ConvexError("This shop is already on Pro. Use Manage billing to change it.");
    const { client, productId, siteUrl } = billingConfig();
    const customerId = await ensureCustomer(ctx, client);
    const settings = `${siteUrl}/${ctx.tenant.slug}/settings`;

    const checkout = await checkoutsCreate(client, {
      products: [productId],
      customerId,
      successUrl: `${settings}?billing=success`,
      returnUrl: `${settings}?billing=canceled`,
      // Copied onto the subscription, which is how its webhooks find the shop.
      metadata: { orgId: ctx.tenantId },
      allowDiscountCodes: true,
      ...(!ctx.tenant.billing?.trialUsed && { trialInterval: "day" as const, trialIntervalCount: TRIAL_DAYS }),
    });
    if (!checkout.ok) polarFailed("checkout", checkout.error);
    return checkout.value.url;
  },
});

/** Polar's customer portal: change card, cancel, download invoices. Owners only. */
export const openPortal = tenantAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    requireRole(ctx.member, "owner");
    const customerId = ctx.tenant.billing?.polarCustomerId;
    if (!customerId) throw new ConvexError("This shop doesn't have a billing account yet.");
    const { client, siteUrl } = billingConfig();
    const session = await customerSessionsCreate(client, {
      customerId,
      returnUrl: `${siteUrl}/${ctx.tenant.slug}/settings`,
    });
    if (!session.ok) polarFailed("portal", session.error);
    return session.value.customerPortalUrl;
  },
});

/**
 * The owner's Polar customer, found by their Better Auth id and created once. Never matched
 * by email: sign-up doesn't verify emails, so an email match could be someone else's account.
 */
async function ensureCustomer(ctx: TenantActionCtx, client: PolarCore) {
  const { tenantId } = ctx;
  const existing = ctx.tenant.billing?.polarCustomerId;
  if (existing) return existing;
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new ConvexError("Your account needs an email address to start billing.");
  const externalId = identity.subject;

  const find = async () => {
    const found = await customersGetExternal(client, { externalId });
    return found.ok ? found.value.id : null;
  };
  let customerId = await find();
  if (!customerId) {
    const created = await customersCreate(client, { email: identity.email, name: identity.name, externalId });
    // A double click can lose the race to create; the winner is then found by the same id.
    customerId = created.ok ? created.value.id : await find();
    if (!customerId) {
      console.error(`Polar customer for ${externalId} couldn't be created:`, created.ok ? null : created.error);
      throw new ConvexError(
        "This email already has a Payspace billing account under another sign-in. Contact support to link it.",
      );
    }
  }
  return await ctx.runMutation(internal.billing.saveCustomer, { tenantId, polarCustomerId: customerId });
}

/** Records the shop's Polar customer, unless another request already did. Returns the one kept. */
export const saveCustomer = internalMutation({
  args: { tenantId: v.id("tenants"), polarCustomerId: v.string() },
  handler: async (ctx, { tenantId, polarCustomerId }): Promise<string> => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) throw new ConvexError("Business not found.");
    if (tenant.billing) return tenant.billing.polarCustomerId;
    await ctx.db.patch(tenantId, { billing: { polarCustomerId, trialUsed: false } });
    return polarCustomerId;
  },
});

/**
 * Copies a subscription from a verified Polar webhook onto its shop. Events can arrive out
 * of order, so an older event never overwrites a newer one, and an ended subscription never
 * replaces a different one that is still live.
 */
export const applySubscription = internalMutation({
  args: {
    orgId: v.string(),
    customerId: v.string(),
    subscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    eventAt: v.number(),
  },
  handler: async (ctx, { orgId, customerId, subscriptionId, eventAt, ...fields }) => {
    const tenantId = ctx.db.normalizeId("tenants", orgId);
    const tenant = tenantId && (await ctx.db.get(tenantId));
    if (!tenantId || !tenant) {
      console.warn(`Polar subscription ${subscriptionId} names no known shop (orgId "${orgId}").`);
      return;
    }
    // Only the shop's own Polar customer can change its plan.
    if (tenant.billing && tenant.billing.polarCustomerId !== customerId) {
      console.warn(`Polar subscription ${subscriptionId} belongs to another customer than shop ${tenantId}.`);
      return;
    }
    const current = tenant.billing?.subscription;
    if (current?.id === subscriptionId && eventAt < current.eventAt) return;
    if (current && current.id !== subscriptionId && isProStatus(current.status) && !isProStatus(fields.status)) return;

    await ctx.db.patch(tenantId, {
      billing: {
        polarCustomerId: customerId,
        trialUsed: true,
        subscription: { id: subscriptionId, eventAt, ...fields },
      },
    });
  },
});

const ms = (date: Date | null | undefined) => date?.getTime();

/** A subscription webhook, as convex/lib/polarWebhook.ts reads it. */
export type SubscriptionEvent = {
  timestamp: Date;
  data: {
    id: string;
    status: string;
    customerId: string;
    metadata: Record<string, unknown>;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
    endsAt: Date | null;
    cancelAtPeriodEnd: boolean;
  };
};

/** A subscription webhook, as applySubscription's arguments. */
export function subscriptionArgs(event: SubscriptionEvent) {
  const sub = event.data;
  const orgId = sub.metadata.orgId;
  return {
    orgId: typeof orgId === "string" ? orgId : "",
    customerId: sub.customerId,
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: ms(sub.currentPeriodEnd),
    trialEnd: ms(sub.trialEnd),
    // endsAt is set once a cancellation is scheduled; cancelAtPeriodEnd covers the moment before.
    cancelAt: ms(sub.endsAt ?? (sub.cancelAtPeriodEnd ? sub.currentPeriodEnd : null)),
    eventAt: event.timestamp.getTime(),
  };
}
