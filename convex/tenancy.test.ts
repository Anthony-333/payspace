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

  test("catalog functions refuse shop A's data to a member of shop B", async () => {
    const { t, alice, bob, shopA, shopB, categoryA } = await setup();
    const a = shopA.tenantId;
    const b = shopB.tenantId;
    const stockItemA = await t.run((ctx) => ctx.db.insert("stockItems", {
      tenantId: a, name: "Fresh milk", baseUnit: "ml", onHand: 0, avgCost: 11, reorderPoint: 0,
    }));
    const groupA = await alice.mutation(api.modifiers.create, {
      tenantId: a, name: "Milk", minSelect: 0, maxSelect: 1,
      options: [{ name: "Oat milk", priceDelta: 2000, recipeDelta: [{ stockItemId: stockItemA, qty: 150 }] }],
    });
    const productA = await alice.mutation(api.products.create, {
      tenantId: a, name: "Iced latte", price: 14000, kind: "recipe", categoryId: categoryA, modifierGroupIds: [groupA],
    });
    const paginationOpts = { numItems: 10, cursor: null };
    const product = { name: "Hacked", price: 1, modifierGroupIds: [] };
    const group = { name: "Hacked", minSelect: 0, maxSelect: 1 };

    // Through shop A's tenantId: no membership.
    for (const call of [
      () => bob.query(api.products.list, { tenantId: a, paginationOpts }),
      () => bob.query(api.products.search, { tenantId: a, term: "latte" }),
      () => bob.query(api.products.forSale, { tenantId: a }),
      () => bob.query(api.products.get, { tenantId: a, productId: productA }),
      () => bob.query(api.modifiers.list, { tenantId: a }),
      () => bob.query(api.templates.available, { tenantId: a }),
      () => bob.mutation(api.products.create, { tenantId: a, ...product, kind: "service" }),
      () => bob.mutation(api.products.update, { tenantId: a, productId: productA, ...product }),
      () => bob.mutation(api.products.setArchived, { tenantId: a, productId: productA, archived: true }),
      () => bob.mutation(api.products.generateUploadUrl, { tenantId: a }),
      () => bob.mutation(api.products.importBatch, { tenantId: a, rows: [] }),
      () => bob.mutation(api.modifiers.remove, { tenantId: a, modifierGroupId: groupA }),
      () => bob.mutation(api.categories.move, { tenantId: a, categoryId: categoryA, direction: "down" }),
      () => bob.mutation(api.categories.remove, { tenantId: a, categoryId: categoryA }),
      () => bob.mutation(api.templates.apply, { tenantId: a }),
    ]) {
      await expect(call()).rejects.toThrow(/access/);
    }

    // Through shop B's own tenantId, with IDs that belong to shop A.
    for (const call of [
      () => bob.query(api.products.get, { tenantId: b, productId: productA }),
      () => bob.mutation(api.products.update, { tenantId: b, productId: productA, ...product }),
      () => bob.mutation(api.products.setArchived, { tenantId: b, productId: productA, archived: true }),
      () => bob.mutation(api.products.create, { tenantId: b, ...product, kind: "service", categoryId: categoryA }),
      () => bob.mutation(api.products.create, { tenantId: b, ...product, kind: "service", modifierGroupIds: [groupA] }),
      () => bob.mutation(api.modifiers.update, {
        tenantId: b, modifierGroupId: groupA, ...group, options: [{ name: "X", priceDelta: 0, recipeDelta: [] }],
      }),
      () => bob.mutation(api.modifiers.remove, { tenantId: b, modifierGroupId: groupA }),
      () => bob.mutation(api.modifiers.create, {
        tenantId: b, ...group, options: [{ name: "X", priceDelta: 0, recipeDelta: [{ stockItemId: stockItemA, qty: 1 }] }],
      }),
      () => bob.mutation(api.categories.move, { tenantId: b, categoryId: categoryA, direction: "down" }),
      () => bob.mutation(api.categories.remove, { tenantId: b, categoryId: categoryA }),
    ]) {
      await expect(call()).rejects.toThrow(/Not found/);
    }

    // Shop B's own lists and searches never include shop A's rows.
    expect((await bob.query(api.products.list, { tenantId: b, paginationOpts })).page).toEqual([]);
    expect(await bob.query(api.products.list, { tenantId: b, paginationOpts, categoryId: categoryA }))
      .toMatchObject({ page: [] });
    expect(await bob.query(api.products.search, { tenantId: b, term: "latte" })).toEqual([]);
    expect(await bob.query(api.products.forSale, { tenantId: b })).toEqual([]);
    expect(await bob.query(api.modifiers.list, { tenantId: b })).toEqual([]);
    const after = await alice.query(api.products.get, { tenantId: a, productId: productA });
    expect(after).toMatchObject({ name: "Iced latte", isActive: true });
  });

  test("inventory and recipe functions refuse shop A's data to a member of shop B", async () => {
    const { t, alice, bob, shopA, shopB } = await setup();
    const a = shopA.tenantId;
    const b = shopB.tenantId;
    const milkA = await alice.mutation(api.inventory.createItem, { tenantId: a, name: "Fresh milk", baseUnit: "ml", reorderPoint: 0, avgCost: 11 });
    const latteA = await alice.mutation(api.products.create, {
      tenantId: a, name: "Latte", kind: "recipe", price: 12000, modifierGroupIds: [], recipe: [{ stockItemId: milkA, qty: 180 }],
    });
    const recipeB = await bob.mutation(api.products.create, { tenantId: b, name: "Taho", kind: "recipe", price: 3000, modifierGroupIds: [] });
    const paginationOpts = { numItems: 10, cursor: null };
    const line = { stockItemId: milkA, qty: 1, unit: "base" as const, totalCost: 100 };

    for (const tenantId of [a, b]) {
      const expected = tenantId === a ? /access/ : /Not found/;
      for (const call of [
        () => bob.query(api.inventory.getItem, { tenantId, stockItemId: milkA }),
        () => bob.query(api.inventory.movements, { tenantId, stockItemId: milkA, paginationOpts }),
        () => bob.query(api.recipes.forProduct, { tenantId, productId: latteA }),
        () => bob.mutation(api.inventory.updateItem, { tenantId, stockItemId: milkA, name: "Hacked", reorderPoint: 0 }),
        () => bob.mutation(api.inventory.removeItem, { tenantId, stockItemId: milkA }),
        () => bob.mutation(api.inventory.receive, { tenantId, lines: [line] }),
        () => bob.mutation(api.inventory.logWaste, { tenantId, stockItemId: milkA, qty: 1 }),
        () => bob.mutation(api.inventory.adjust, { tenantId, stockItemId: milkA, counted: 0 }),
        () => bob.mutation(api.inventory.submitCount, { tenantId, counts: [{ stockItemId: milkA, counted: 0 }] }),
      ]) {
        await expect(call()).rejects.toThrow(expected);
      }
    }
    await expect(bob.query(api.inventory.listItems, { tenantId: a })).rejects.toThrow(/access/);
    await expect(bob.mutation(api.inventory.createItem, { tenantId: a, name: "X", baseUnit: "pc", reorderPoint: 0 }))
      .rejects.toThrow(/access/);
    // Shop A's ingredient can't be put into shop B's recipe.
    await expect(bob.mutation(api.products.create, {
      tenantId: b, name: "Stolen", kind: "recipe", price: 1, modifierGroupIds: [], recipe: [{ stockItemId: milkA, qty: 1 }],
    })).rejects.toThrow(/Not found/);
    await expect(bob.mutation(api.products.update, {
      tenantId: b, productId: recipeB, name: "Taho", price: 3000, modifierGroupIds: [], recipe: [{ stockItemId: milkA, qty: 1 }],
    })).rejects.toThrow(/Not found/);

    expect(await bob.query(api.inventory.listItems, { tenantId: b })).toEqual([]);
    const milk = await t.run((ctx) => ctx.db.get(milkA));
    expect(milk).toMatchObject({ name: "Fresh milk", onHand: 0, avgCost: 11 });
    const movements = await t.run((ctx) => ctx.db.query("stockMovements").collect());
    expect(movements).toEqual([]);
  });

  test("a batch that sneaks in another shop's item is refused as a whole", async () => {
    const { t, alice, bob, shopA, shopB } = await setup();
    const b = shopB.tenantId;
    const milkA = await alice.mutation(api.inventory.createItem, { tenantId: shopA.tenantId, name: "Fresh milk", baseUnit: "ml", reorderPoint: 0 });
    const waterB = await bob.mutation(api.inventory.createItem, { tenantId: b, name: "Water", baseUnit: "pc", reorderPoint: 0 });

    await expect(bob.mutation(api.inventory.receive, {
      tenantId: b,
      lines: [
        { stockItemId: waterB, qty: 24, unit: "base", totalCost: 24000 },
        { stockItemId: milkA, qty: 1000, unit: "base", totalCost: 1 },
      ],
    })).rejects.toThrow(/Not found/);
    await expect(bob.mutation(api.inventory.submitCount, {
      tenantId: b, counts: [{ stockItemId: waterB, counted: 5 }, { stockItemId: milkA, counted: 0 }],
    })).rejects.toThrow(/Not found/);

    // The valid first lines were rolled back with the rest.
    expect(await t.run((ctx) => ctx.db.get(waterB))).toMatchObject({ onHand: 0, avgCost: 0 });
    expect(await t.run((ctx) => ctx.db.get(waterB))).not.toHaveProperty("lastReceivedAt");
    expect(await t.run((ctx) => ctx.db.query("stockMovements").collect())).toEqual([]);
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
    await expect(alice.mutation(api.tenants.updateSettings, { tenantId, timezone: "Nope/Nope" }))
      .rejects.toThrow(/time zone/);
    await expect(alice.mutation(api.tenants.updateSettings, { tenantId, currency: "pesos" }))
      .rejects.toThrow(/3-letter/);
    await expect(alice.mutation(api.tenants.updateSettings, { tenantId, receiptFooter: "x".repeat(201) }))
      .rejects.toThrow(/footer/);
    await alice.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0, pricesIncludeTax: false });
    expect(await alice.query(api.tenants.get, { tenantId })).toMatchObject({ taxRateBps: 0, pricesIncludeTax: false });
  });
});
