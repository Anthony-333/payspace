import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "user_alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "user_bob", name: "Bob" });
  const shopA = await alice.mutation(api.tenants.create, {
    name: "Brew Lab", slug: "brewlab", businessType: "cafe",
  });
  const shopB = await bob.mutation(api.tenants.create, {
    name: "Sari Mart", slug: "sarimart", businessType: "grocery",
  });
  const categoryA = await alice.mutation(api.categories.create, {
    tenantId: shopA.tenantId, name: "Coffee",
  });
  return { t, alice, bob, shopA, shopB, categoryA };
}

async function addMember(
  t: ReturnType<typeof convexTest>,
  tenantId: Id<"tenants">,
  userId: string,
  role: "owner" | "manager" | "cashier",
  status: "active" | "disabled" = "active",
) {
  await t.run((ctx) =>
    ctx.db.insert("members", { tenantId, userId, name: userId, role, status }));
  return t.withIdentity({ subject: userId, name: userId });
}

describe("onboarding", () => {
  test("creates the shop with PH defaults and makes the caller owner", async () => {
    const { alice, shopA } = await setup();
    const shop = await alice.query(api.tenants.get, { tenantId: shopA.tenantId });
    expect(shop).toMatchObject({
      name: "Brew Lab", slug: "brewlab", currency: "PHP", timezone: "Asia/Manila",
      taxRateBps: 1200, pricesIncludeTax: true, role: "owner",
    });
  });

  test("rejects taken, reserved and malformed slugs", async () => {
    const { bob } = await setup();
    const make = (slug: string) =>
      bob.mutation(api.tenants.create, { name: "Another shop", slug, businessType: "retail" });
    await expect(make("BrewLab")).rejects.toThrow(/taken/);
    await expect(make("api")).rejects.toThrow(/reserved/);
    await expect(make("x")).rejects.toThrow(/3 to 40/);
  });

  test("requires sign-in", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(api.tenants.create, { name: "Ghost", slug: "ghost", businessType: "cafe" }),
    ).rejects.toThrow(/Sign in/);
  });
});

describe("tenant isolation", () => {
  test("a member of shop B can't read shop A through any function", async () => {
    const { bob, shopA } = await setup();
    const tenantId = shopA.tenantId;
    await expect(bob.query(api.tenants.get, { tenantId })).rejects.toThrow(/access/);
    await expect(bob.query(api.members.list, { tenantId })).rejects.toThrow(/access/);
    await expect(bob.query(api.categories.list, { tenantId })).rejects.toThrow(/access/);
    expect(await bob.query(api.tenants.bySlug, { slug: "brewlab" })).toBeNull();
  });

  test("a member of shop B can't write to shop A", async () => {
    const { bob, shopA, categoryA } = await setup();
    const tenantId = shopA.tenantId;
    await expect(bob.mutation(api.categories.create, { tenantId, name: "Hacked" }))
      .rejects.toThrow(/access/);
    await expect(bob.mutation(api.categories.rename, { tenantId, categoryId: categoryA, name: "Hacked" }))
      .rejects.toThrow(/access/);
    await expect(bob.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0 }))
      .rejects.toThrow(/access/);
  });

  test("an ID from shop A is refused even through shop B's own tenantId", async () => {
    const { t, bob, shopB, categoryA } = await setup();
    await expect(
      bob.mutation(api.categories.rename, { tenantId: shopB.tenantId, categoryId: categoryA, name: "Hacked" }),
    ).rejects.toThrow(/Not found/);
    const category = await t.run((ctx) => ctx.db.get(categoryA));
    expect(category?.name).toBe("Coffee");
  });

  test("lists only the caller's own shops and categories", async () => {
    const { alice, bob, shopB } = await setup();
    expect((await alice.query(api.tenants.mine, {})).map((s) => s.slug)).toEqual(["brewlab"]);
    expect((await bob.query(api.tenants.mine, {})).map((s) => s.slug)).toEqual(["sarimart"]);
    expect(await bob.query(api.categories.list, { tenantId: shopB.tenantId })).toEqual([]);
  });

  test("signed-out callers are refused", async () => {
    const { t, shopA } = await setup();
    await expect(t.query(api.categories.list, { tenantId: shopA.tenantId })).rejects.toThrow(/Sign in/);
    await expect(t.query(api.tenants.mine, {})).rejects.toThrow(/Sign in/);
  });

  test("a disabled member loses access immediately", async () => {
    const { t, shopA } = await setup();
    const carol = await addMember(t, shopA.tenantId, "user_carol", "cashier", "disabled");
    await expect(carol.query(api.categories.list, { tenantId: shopA.tenantId })).rejects.toThrow(/access/);
    expect(await carol.query(api.tenants.mine, {})).toEqual([]);
    expect(await carol.query(api.tenants.bySlug, { slug: "brewlab" })).toBeNull();
  });
});

describe("roles", () => {
  test("a cashier can read the catalog but not change it or the settings", async () => {
    const { t, shopA, categoryA } = await setup();
    const tenantId = shopA.tenantId;
    const cashier = await addMember(t, tenantId, "user_cashier", "cashier");
    expect(await cashier.query(api.categories.list, { tenantId })).toHaveLength(1);
    await expect(cashier.mutation(api.categories.create, { tenantId, name: "Tea" })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.categories.rename, { tenantId, categoryId: categoryA, name: "Tea" }))
      .rejects.toThrow(/role/);
    await expect(cashier.query(api.members.list, { tenantId })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0 })).rejects.toThrow(/role/);
  });

  test("a manager can edit the catalog but not the business settings", async () => {
    const { t, shopA } = await setup();
    const tenantId = shopA.tenantId;
    const manager = await addMember(t, tenantId, "user_manager", "manager");
    await manager.mutation(api.categories.create, { tenantId, name: "Tea" });
    expect(await manager.query(api.members.list, { tenantId })).toHaveLength(2);
    await expect(manager.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0 })).rejects.toThrow(/role/);
  });

  test("owner settings are validated", async () => {
    const { alice, shopA } = await setup();
    const tenantId = shopA.tenantId;
    await expect(alice.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 12000 }))
      .rejects.toThrow(/between 0% and 100%/);
    await alice.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0, pricesIncludeTax: false });
    expect(await alice.query(api.tenants.get, { tenantId })).toMatchObject({ taxRateBps: 0, pricesIncludeTax: false });
  });
});
