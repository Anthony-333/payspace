import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { subscriptionArgs } from "./billing";
import schema from "./schema";
import { makePro, modules } from "./test.setup";

// Free vs Pro (convex/lib/plan.ts) and the Polar sync (convex/billing.ts). Other suites run
// their shops on Pro; these check what a Free shop can't do, and how the plan changes.

const page = { numItems: 500, cursor: null };
const soda = { name: "Soda", price: 4500, modifierGroupIds: [], kind: "stocked" as const };

async function setup(businessType: "cafe" | "grocery" = "grocery") {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user_owner", name: "Owner", email: "owner@example.com" });
  const { tenantId } = await owner.mutation(api.tenants.create, { name: "Test shop", slug: "testshop", businessType });
  const as = async (userId: string, role: "manager" | "cashier") => {
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId, name: userId, role, status: "active" }));
    return t.withIdentity({ subject: userId, name: userId });
  };
  return { t, owner, tenantId, as };
}

async function fillProducts(t: Awaited<ReturnType<typeof setup>>["t"], tenantId: Id<"tenants">, count: number) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      await ctx.db.insert("products", {
        tenantId, name: `Item ${i}`, kind: "service", price: 1000, unitCost: 0, modifierGroupIds: [], isActive: true,
      });
    }
  });
}

describe("Free plan limits", () => {
  test("up to 50 active products; archiving makes room, unarchiving needs it", async () => {
    const { t, owner, tenantId } = await setup();
    await fillProducts(t, tenantId, 49);
    const last = await owner.mutation(api.products.create, { tenantId, ...soda });
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, name: "One too many" }))
      .rejects.toThrow(/up to 50 active products/);

    await owner.mutation(api.products.setArchived, { tenantId, productId: last, archived: true });
    const replacement = await owner.mutation(api.products.create, { tenantId, ...soda, name: "Replacement" });
    await expect(owner.mutation(api.products.setArchived, { tenantId, productId: last, archived: false }))
      .rejects.toThrow(/up to 50 active products/);

    // Archiving is always allowed, and so is editing what's already there.
    await owner.mutation(api.products.setArchived, { tenantId, productId: replacement, archived: true });
    await owner.mutation(api.products.setArchived, { tenantId, productId: last, archived: false });
    await owner.mutation(api.products.update, { tenantId, productId: last, name: "Soda", price: 5000, modifierGroupIds: [] });
  });

  test("an import stops at the limit and reports the rest row by row", async () => {
    const { t, owner, tenantId } = await setup();
    await fillProducts(t, tenantId, 47);
    const rows = Array.from({ length: 5 }, (_, i) => ({ row: i + 2, name: `Imported ${i}`, price: 2000, kind: "stocked" as const }));
    const result = await owner.mutation(api.products.importBatch, { tenantId, rows });
    expect(result.created).toBe(3);
    expect(result.errors).toEqual([
      { row: 5, message: expect.stringMatching(/up to 50 active products/) },
      { row: 6, message: expect.stringMatching(/up to 50 active products/) },
    ]);
  });

  test("recipes: can't create or change one, but a starter menu item's price can be edited", async () => {
    const { owner, tenantId } = await setup("cafe");
    await owner.mutation(api.templates.apply, { tenantId });
    const { page: products } = await owner.query(api.products.list, { tenantId, paginationOpts: page });
    const latte = products.find((p) => p.kind === "recipe")!;
    const recipe = await owner.query(api.recipes.forProduct, { tenantId, productId: latte._id });

    const edit = { tenantId, productId: latte._id, name: latte.name, price: latte.price + 500, modifierGroupIds: latte.modifierGroupIds };
    await owner.mutation(api.products.update, edit);
    await expect(owner.mutation(api.products.update, { ...edit, recipe: recipe.slice(1) }))
      .rejects.toThrow(/Editing recipes is part of Pro/);
    await expect(owner.mutation(api.products.create, {
      tenantId, name: "Mocha", price: 16000, modifierGroupIds: [], kind: "recipe", recipe,
    })).rejects.toThrow(/Recipe costing is part of Pro/);
  });

  test("alerts are locked, and history reaches back 7 days from the last day of sales", async () => {
    const { t, owner, tenantId } = await setup();
    const alerts = await owner.query(api.analytics.alerts, { tenantId });
    expect(alerts).toMatchObject({ locked: true, stock: [], margin: [] });

    await t.run((ctx) => ctx.db.insert("dailyStats", {
      tenantId, businessDate: "2026-09-20", revenue: 10000, cogs: 4000, orders: 2, cash: 10000, ewallet: 0, card: 0,
      byHour: Array.from({ length: 24 }, () => 0),
    }));
    await owner.query(api.analytics.summary, { tenantId, from: "2026-09-14", to: "2026-09-20" });
    await owner.query(api.analytics.topProducts, { tenantId, from: "2026-09-14", to: "2026-09-20" });
    await expect(owner.query(api.analytics.summary, { tenantId, from: "2026-09-13", to: "2026-09-20" }))
      .rejects.toThrow(/last 7 days/);
    await expect(owner.query(api.analytics.topProducts, { tenantId, from: "2026-08-21", to: "2026-09-20" }))
      .rejects.toThrow(/last 7 days/);
  });

  test("Pro lifts every limit", async () => {
    const { t, owner, tenantId } = await setup();
    await makePro(t, tenantId);
    await fillProducts(t, tenantId, 50);
    await owner.mutation(api.products.create, { tenantId, ...soda });
    expect(await owner.query(api.analytics.alerts, { tenantId })).toMatchObject({ locked: false });
    await t.run((ctx) => ctx.db.insert("dailyStats", {
      tenantId, businessDate: "2026-09-20", revenue: 0, cogs: 0, orders: 0, cash: 0, ewallet: 0, card: 0,
      byHour: Array.from({ length: 24 }, () => 0),
    }));
    await owner.query(api.analytics.summary, { tenantId, from: "2026-01-01", to: "2026-09-20" });
  });
});

describe("billing status and checkout", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("everyone sees the plan; only the owner sees the billing details", async () => {
    const { owner, tenantId, as } = await setup();
    expect(await owner.query(api.billing.status, { tenantId })).toMatchObject({
      plan: "free",
      details: { status: null, canTrial: true, hasBillingAccount: false },
    });
    const cashier = await as("user_cashier", "cashier");
    expect(await cashier.query(api.billing.status, { tenantId })).toMatchObject({ plan: "free", details: null });
  });

  test("only the shop's owner can start checkout or open the portal", async () => {
    const { t, owner, tenantId, as } = await setup();
    const manager = await as("user_manager", "manager");
    await expect(manager.action(api.billing.startCheckout, { tenantId })).rejects.toThrow(/role/);
    await expect(manager.action(api.billing.openPortal, { tenantId })).rejects.toThrow(/role/);

    const mallory = t.withIdentity({ subject: "user_mallory", name: "Mallory" });
    await mallory.mutation(api.tenants.create, { name: "Sari Mart", slug: "sarimart", businessType: "grocery" });
    await expect(mallory.action(api.billing.startCheckout, { tenantId })).rejects.toThrow(/access/);
    await expect(t.action(api.billing.startCheckout, { tenantId })).rejects.toThrow(/Sign in/);

    // The owner gets through the checks; with no Polar token set, billing says so plainly.
    vi.stubEnv("POLAR_ORGANIZATION_TOKEN", "");
    await expect(owner.action(api.billing.startCheckout, { tenantId })).rejects.toThrow(/isn't set up/);
    await expect(owner.action(api.billing.openPortal, { tenantId })).rejects.toThrow(/billing account/);
  });

  test("a shop already on Pro can't start a second subscription", async () => {
    const { t, owner, tenantId } = await setup();
    await makePro(t, tenantId);
    await expect(owner.action(api.billing.startCheckout, { tenantId })).rejects.toThrow(/already on Pro/);
  });

  test("the first Polar customer saved for a shop is kept", async () => {
    const { t, tenantId } = await setup();
    expect(await t.mutation(internal.billing.saveCustomer, { tenantId, polarCustomerId: "cus_1" })).toBe("cus_1");
    expect(await t.mutation(internal.billing.saveCustomer, { tenantId, polarCustomerId: "cus_2" })).toBe("cus_1");
  });
});

describe("Polar webhook mapping", () => {
  const sub = {
    id: "sub_1",
    status: "active" as const,
    customerId: "cus_1",
    metadata: { orgId: "shop_1" },
    currentPeriodEnd: new Date(1_800_000_000_000),
    trialEnd: null,
    endsAt: null,
    cancelAtPeriodEnd: false,
  };
  const at = new Date(1_700_000_000_000);

  test("dates become ms and the event's timestamp orders updates", () => {
    expect(subscriptionArgs({ timestamp: at, data: sub })).toEqual({
      orgId: "shop_1", customerId: "cus_1", subscriptionId: "sub_1", status: "active",
      currentPeriodEnd: 1_800_000_000_000, trialEnd: undefined, cancelAt: undefined, eventAt: 1_700_000_000_000,
    });
  });

  test("a scheduled cancellation sets cancelAt, from endsAt or else the period end", () => {
    expect(subscriptionArgs({ timestamp: at, data: { ...sub, cancelAtPeriodEnd: true } }).cancelAt).toBe(1_800_000_000_000);
    expect(subscriptionArgs({ timestamp: at, data: { ...sub, endsAt: new Date(1_750_000_000_000) } }).cancelAt)
      .toBe(1_750_000_000_000);
  });

  test("a subscription without a shop id maps to no shop", () => {
    expect(subscriptionArgs({ timestamp: at, data: { ...sub, metadata: {} } }).orgId).toBe("");
    expect(subscriptionArgs({ timestamp: at, data: { ...sub, metadata: { orgId: 7 } } }).orgId).toBe("");
  });
});

describe("Polar subscription sync", () => {
  const event = (tenantId: string, over: Partial<{
    customerId: string; subscriptionId: string; status: string; eventAt: number; cancelAt: number;
  }> = {}) => ({
    orgId: tenantId,
    customerId: "cus_1",
    subscriptionId: "sub_1",
    status: "trialing",
    currentPeriodEnd: 1_800_000_000_000,
    trialEnd: 1_800_000_000_000,
    eventAt: 100,
    ...over,
  });
  const billingOf = (t: Awaited<ReturnType<typeof setup>>["t"], tenantId: Id<"tenants">) =>
    t.run(async (ctx) => (await ctx.db.get(tenantId))!.billing);

  test("a trial makes the shop Pro, uses up its trial, and a cancellation ends it", async () => {
    const { t, owner, tenantId } = await setup();
    await t.mutation(internal.billing.saveCustomer, { tenantId, polarCustomerId: "cus_1" });
    await t.mutation(internal.billing.applySubscription, event(tenantId));
    expect(await owner.query(api.billing.status, { tenantId })).toMatchObject({
      plan: "pro",
      details: { status: "trialing", trialEnd: 1_800_000_000_000, canTrial: false },
    });

    await t.mutation(internal.billing.applySubscription, event(tenantId, { status: "active", eventAt: 200, cancelAt: 1_900_000_000_000 }));
    expect(await owner.query(api.billing.status, { tenantId })).toMatchObject({
      plan: "pro", details: { status: "active", cancelAt: 1_900_000_000_000 },
    });
    await t.mutation(internal.billing.applySubscription, event(tenantId, { status: "canceled", eventAt: 300 }));
    expect(await owner.query(api.billing.status, { tenantId })).toMatchObject({ plan: "free", details: { canTrial: false } });
  });

  test("an older event never overwrites a newer one", async () => {
    const { t, tenantId } = await setup();
    await t.mutation(internal.billing.applySubscription, event(tenantId, { status: "active", eventAt: 200 }));
    await t.mutation(internal.billing.applySubscription, event(tenantId, { status: "incomplete", eventAt: 150 }));
    expect((await billingOf(t, tenantId))?.subscription?.status).toBe("active");
  });

  test("an old subscription ending doesn't cancel a newer live one", async () => {
    const { t, tenantId } = await setup();
    await t.mutation(internal.billing.applySubscription, event(tenantId, { subscriptionId: "sub_new", status: "active", eventAt: 200 }));
    await t.mutation(internal.billing.applySubscription, event(tenantId, { subscriptionId: "sub_old", status: "canceled", eventAt: 300 }));
    expect((await billingOf(t, tenantId))?.subscription).toMatchObject({ id: "sub_new", status: "active" });
  });

  test("an event for another customer or an unknown shop changes nothing", async () => {
    const { t, tenantId } = await setup();
    await t.mutation(internal.billing.saveCustomer, { tenantId, polarCustomerId: "cus_1" });
    await t.mutation(internal.billing.applySubscription, event(tenantId, { customerId: "cus_someone_else", status: "active" }));
    expect((await billingOf(t, tenantId))?.subscription).toBeUndefined();
    await t.mutation(internal.billing.applySubscription, event("not-a-shop-id", { status: "active" }));
  });
});
