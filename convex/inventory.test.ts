import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const page = { numItems: 100, cursor: null };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user_owner", name: "Owner" });
  const { tenantId } = await owner.mutation(api.tenants.create, { name: "Brew Lab", slug: "brewlab", businessType: "cafe" });
  const as = async (userId: string, role: "manager" | "cashier") => {
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId, name: userId, role, status: "active" }));
    return t.withIdentity({ subject: userId, name: userId });
  };
  const item = (name: string, baseUnit: "g" | "ml" | "pc", avgCost: number, purchaseUnit?: { name: string; factor: number }) =>
    owner.mutation(api.inventory.createItem, { tenantId, name, baseUnit, avgCost, reorderPoint: 0, purchaseUnit });
  const runScheduled = () => t.finishAllScheduledFunctions(vi.runAllTimers);
  /** Σ ledger quantities for an item, which must always equal its on-hand cache. */
  const ledgerTotal = async (stockItemId: Id<"stockItems">) => {
    const rows = await t.run((ctx) => ctx.db
      .query("stockMovements")
      .withIndex("by_tenant_item", (q) => q.eq("tenantId", tenantId).eq("stockItemId", stockItemId))
      .collect());
    return Math.round(rows.reduce((sum, r) => sum + r.qty, 0) * 1000) / 1000;
  };
  return { t, owner, tenantId, as, item, runScheduled, ledgerTotal };
}

describe("receiving", () => {
  test("blends the average cost and writes the ledger, in base or purchase units", async () => {
    const { owner, tenantId, item, ledgerTotal } = await setup();
    const milk = await item("Fresh milk", "ml", 11, { name: "1 L carton", factor: 1000 });

    // 2 cartons for ₱220 → 11 c/ml; nothing on hand, so the average is the delivery's cost.
    await owner.mutation(api.inventory.receive, {
      tenantId, lines: [{ stockItemId: milk, qty: 2, unit: "purchase", totalCost: 22000 }], note: "Supplier A",
    });
    // 1,000 ml for ₱140 → 14 c/ml, blended with 2,000 ml at 11 → 12 c/ml
    await owner.mutation(api.inventory.receive, {
      tenantId, lines: [{ stockItemId: milk, qty: 1000, unit: "base", totalCost: 14000 }],
    });

    const got = await owner.query(api.inventory.getItem, { tenantId, stockItemId: milk });
    expect(got).toMatchObject({ onHand: 3000, avgCost: 12, status: "ok" });
    expect(got.lastReceivedAt).toBeTypeOf("number");

    const ledger = await owner.query(api.inventory.movements, { tenantId, stockItemId: milk, paginationOpts: page });
    expect(ledger.page.map((m) => [m.type, m.qty, m.unitCost, m.note])).toEqual([
      ["receive", 1000, 14, undefined],
      ["receive", 2000, 11, "Supplier A"],
    ]);
    expect(ledger.page[0].memberName).toBe("Owner");
    expect(await ledgerTotal(milk)).toBe(3000);
  });

  test("an item listed twice in one delivery blends both lines", async () => {
    const { owner, tenantId, item } = await setup();
    const beans = await item("Beans", "g", 0);
    await owner.mutation(api.inventory.receive, {
      tenantId,
      lines: [
        { stockItemId: beans, qty: 1000, unit: "base", totalCost: 100000 },
        { stockItemId: beans, qty: 1000, unit: "base", totalCost: 140000 },
      ],
    });
    expect(await owner.query(api.inventory.getItem, { tenantId, stockItemId: beans })).toMatchObject({ onHand: 2000, avgCost: 120 });
  });

  test("rejects bad lines", async () => {
    const { owner, tenantId, item } = await setup();
    const cups = await item("Cups", "pc", 600);
    const receive = (line: { qty: number; unit: "base" | "purchase"; totalCost: number }) =>
      owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: cups, ...line }] });
    await expect(receive({ qty: 0, unit: "base", totalCost: 100 })).rejects.toThrow(/more than 0/);
    await expect(receive({ qty: 5, unit: "base", totalCost: 10.5 })).rejects.toThrow(/total cost/);
    await expect(receive({ qty: 5, unit: "purchase", totalCost: 100 })).rejects.toThrow(/no purchase unit/);
    await expect(owner.mutation(api.inventory.receive, { tenantId, lines: [] })).rejects.toThrow(/between 1/);
  });
});

describe("waste, adjustments and counts", () => {
  test("the ledger always adds up to on-hand stock, and stock may go negative", async () => {
    const { owner, tenantId, as, item, ledgerTotal } = await setup();
    const milk = await item("Fresh milk", "ml", 11);
    const cashier = await as("user_cashier", "cashier");

    await owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 1000, unit: "base", totalCost: 11000 }] });
    await cashier.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 0.1, note: "Spilled" });
    await cashier.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 0.2 });
    expect(await owner.mutation(api.inventory.adjust, { tenantId, stockItemId: milk, counted: 950 })).toEqual({ diff: -49.7 });
    // More than is on hand: a cashier is refused, a manager or owner can write it off.
    await expect(cashier.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 1200 }))
      .rejects.toThrow(/more than the 950 ml/);
    await owner.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 1200 });

    const got = await owner.query(api.inventory.getItem, { tenantId, stockItemId: milk });
    expect(got).toMatchObject({ onHand: -250, status: "negative" });
    expect(await ledgerTotal(milk)).toBe(-250);

    const ledger = await owner.query(api.inventory.movements, { tenantId, stockItemId: milk, paginationOpts: page });
    expect(ledger.page.map((m) => m.type)).toEqual(["waste", "adjust", "waste", "waste", "receive"]);
    expect(ledger.page[0].memberName).toBe("Owner");
    expect(ledger.page[2].memberName).toBe("user_cashier");
  });

  test("a count writes only the differences, measured when it's saved", async () => {
    const { owner, tenantId, item, ledgerTotal } = await setup();
    const beans = await item("Beans", "g", 120);
    const cups = await item("Cups", "pc", 600);
    const syrup = await item("Syrup", "ml", 5);
    await owner.mutation(api.inventory.receive, {
      tenantId,
      lines: [
        { stockItemId: beans, qty: 1000, unit: "base", totalCost: 120000 },
        { stockItemId: cups, qty: 50, unit: "base", totalCost: 30000 },
      ],
    });
    // Sold 2 cups while the count was going on (a sale would write this row in Week 4).
    await owner.mutation(api.inventory.logWaste, { tenantId, stockItemId: cups, qty: 2 });

    const result = await owner.mutation(api.inventory.submitCount, {
      tenantId,
      counts: [{ stockItemId: beans, counted: 980 }, { stockItemId: cups, counted: 48 }, { stockItemId: syrup, counted: 500 }],
    });
    expect(result).toEqual({ changed: 2, unchanged: 1 });
    const items = await owner.query(api.inventory.listItems, { tenantId });
    expect(items.map((i) => [i.name, i.onHand])).toEqual([["Beans", 980], ["Cups", 48], ["Syrup", 500]]);
    for (const id of [beans, cups, syrup]) {
      const got = items.find((i) => i._id === id)!;
      expect(await ledgerTotal(id)).toBe(got.onHand);
    }

    await expect(owner.mutation(api.inventory.submitCount, {
      tenantId, counts: [{ stockItemId: beans, counted: 1 }, { stockItemId: beans, counted: 2 }],
    })).rejects.toThrow(/counted twice/);
    await expect(owner.mutation(api.inventory.submitCount, {
      tenantId, counts: [{ stockItemId: beans, counted: -1 }],
    })).rejects.toThrow(/negative/);
  });
});

describe("costing", () => {
  test("receiving milk at a higher price updates the latte's cost and margin flag, in the background", async () => {
    const { t, owner, tenantId, item, runScheduled } = await setup();
    const beans = await item("Beans", "g", 120);
    const milk = await item("Fresh milk", "ml", 11);
    const cup = await item("Iced cup", "pc", 750);
    const latte = await owner.mutation(api.products.create, {
      tenantId, name: "Iced latte", kind: "recipe", price: 14000, modifierGroupIds: [],
      recipe: [{ stockItemId: beans, qty: 18 }, { stockItemId: milk, qty: 180 }, { stockItemId: cup, qty: 1 }],
    });
    expect(await owner.query(api.products.get, { tenantId, productId: latte }))
      .toMatchObject({ unitCost: 4890, belowTargetMargin: false });
    expect(await owner.query(api.recipes.forProduct, { tenantId, productId: latte })).toHaveLength(3);

    // Milk jumps to ₱0.30/ml: 18×120 + 180×30 + 750 = 8,310 → 33.5% margin, under the 60% target.
    await owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 1000, unit: "base", totalCost: 30000 }] });
    await runScheduled();
    expect(await owner.query(api.products.get, { tenantId, productId: latte }))
      .toMatchObject({ unitCost: 8310, belowTargetMargin: true });

    const flagged = await t.run((ctx) => ctx.db
      .query("products")
      .withIndex("by_tenant_below_margin", (q) => q.eq("tenantId", tenantId).eq("belowTargetMargin", true))
      .collect());
    expect(flagged.map((p) => p.name)).toEqual(["Iced latte"]);

    // Raising the price clears the flag straight away.
    await owner.mutation(api.products.update, { tenantId, productId: latte, name: "Iced latte", price: 25000, modifierGroupIds: [] });
    expect(await owner.query(api.products.get, { tenantId, productId: latte })).toMatchObject({ belowTargetMargin: false });
  });

  test("editing a recipe recosts it immediately and rejects bad lines", async () => {
    const { owner, tenantId, item } = await setup();
    const beans = await item("Beans", "g", 120);
    const productId = await owner.mutation(api.products.create, {
      tenantId, name: "Espresso", kind: "recipe", price: 9000, modifierGroupIds: [],
    });
    expect(await owner.query(api.products.get, { tenantId, productId })).toMatchObject({ unitCost: 0, belowTargetMargin: false });

    const save = (recipe: { stockItemId: Id<"stockItems">; qty: number }[]) =>
      owner.mutation(api.products.update, { tenantId, productId, name: "Espresso", price: 9000, modifierGroupIds: [], recipe });
    await save([{ stockItemId: beans, qty: 18.5 }]);
    expect(await owner.query(api.products.get, { tenantId, productId })).toMatchObject({ unitCost: 2220 });

    await expect(save([{ stockItemId: beans, qty: 9 }, { stockItemId: beans, qty: 9 }])).rejects.toThrow(/twice/);
    await expect(save([{ stockItemId: beans, qty: -1 }])).rejects.toThrow(/negative/);

    const soda = await owner.mutation(api.products.create, { tenantId, name: "Soda", kind: "stocked", price: 4500, modifierGroupIds: [] });
    await expect(owner.mutation(api.products.update, {
      tenantId, productId: soda, name: "Soda", price: 4500, modifierGroupIds: [], recipe: [],
    })).rejects.toThrow(/Only products made from ingredients/);
  });

  test("once stock is received, its cost can only change by receiving", async () => {
    const { owner, tenantId, runScheduled } = await setup();
    const soda = await owner.mutation(api.products.create, {
      tenantId, name: "Soda", kind: "stocked", price: 4500, cost: 3000, modifierGroupIds: [],
    });
    const { stockItemId } = await owner.query(api.products.get, { tenantId, productId: soda });
    const edit = { tenantId, productId: soda, name: "Soda", price: 4500, modifierGroupIds: [] };
    const itemEdit = { tenantId, stockItemId: stockItemId!, name: "Soda", reorderPoint: 12 };

    // Before any delivery, either screen can set it.
    await owner.mutation(api.inventory.updateItem, { ...itemEdit, avgCost: 3100 });
    await runScheduled();
    expect(await owner.query(api.products.get, { tenantId, productId: soda })).toMatchObject({ unitCost: 3100 });

    await owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: stockItemId!, qty: 24, unit: "base", totalCost: 81600 }] });
    await runScheduled();
    expect(await owner.query(api.products.get, { tenantId, productId: soda })).toMatchObject({ unitCost: 3400 });

    await expect(owner.mutation(api.products.update, { ...edit, cost: 2000 })).rejects.toThrow(/Receive a delivery/);
    await expect(owner.mutation(api.inventory.updateItem, { ...itemEdit, avgCost: 1 })).rejects.toThrow(/Receive a delivery/);
    // Sending the current cost back unchanged is fine.
    await owner.mutation(api.products.update, { ...edit, cost: 3400 });
    await owner.mutation(api.inventory.updateItem, { ...itemEdit, avgCost: 3400 });
  });

  test("changing the target margin re-flags every product", async () => {
    const { owner, tenantId, runScheduled } = await setup();
    const productId = await owner.mutation(api.products.create, {
      tenantId, name: "Tote bag", kind: "service", price: 11200, cost: 5000, modifierGroupIds: [],
    });
    // Net ₱100, cost ₱50 → 50% margin, under the default 60%.
    expect(await owner.query(api.products.get, { tenantId, productId })).toMatchObject({ belowTargetMargin: true });
    await owner.mutation(api.tenants.updateSettings, { tenantId, targetMarginBps: 4000 });
    await runScheduled();
    expect(await owner.query(api.products.get, { tenantId, productId })).toMatchObject({ belowTargetMargin: false });
  });
});

describe("stock items", () => {
  test("create, edit and delete only when nothing uses the item", async () => {
    const { owner, tenantId, item } = await setup();
    await expect(owner.mutation(api.inventory.createItem, { tenantId, name: " ", baseUnit: "g", reorderPoint: 0 }))
      .rejects.toThrow(/item name/);
    await expect(owner.mutation(api.inventory.createItem, {
      tenantId, name: "Beans", baseUnit: "g", reorderPoint: 0, purchaseUnit: { name: "Bag", factor: 0 },
    })).rejects.toThrow(/purchase unit size/);

    const spare = await item("Spare", "pc", 0);
    const oat = await item("Oat milk", "ml", 25);
    const beans = await item("Beans", "g", 120);
    await owner.mutation(api.inventory.updateItem, {
      tenantId, stockItemId: oat, name: "Oat milk (Oatside)", reorderPoint: 2000, purchaseUnit: { name: "1 L carton", factor: 1000 },
    });
    expect(await owner.query(api.inventory.getItem, { tenantId, stockItemId: oat }))
      .toMatchObject({ name: "Oat milk (Oatside)", reorderPoint: 2000, purchaseUnit: { name: "1 L carton", factor: 1000 } });

    await owner.mutation(api.modifiers.create, {
      tenantId, name: "Milk", minSelect: 0, maxSelect: 1,
      options: [{ name: "Oat", priceDelta: 2000, recipeDelta: [{ stockItemId: oat, qty: 150 }] }],
    });
    const espresso = await owner.mutation(api.products.create, {
      tenantId, name: "Espresso", kind: "recipe", price: 9000, modifierGroupIds: [], recipe: [{ stockItemId: beans, qty: 18 }],
    });
    expect((await owner.query(api.inventory.getItem, { tenantId, stockItemId: beans })).usedIn)
      .toEqual([{ _id: espresso, name: "Espresso", isActive: true }]);

    await expect(owner.mutation(api.inventory.removeItem, { tenantId, stockItemId: oat })).rejects.toThrow(/modifier/);
    await expect(owner.mutation(api.inventory.removeItem, { tenantId, stockItemId: beans })).rejects.toThrow(/recipe/);
    await owner.mutation(api.inventory.logWaste, { tenantId, stockItemId: spare, qty: 1 });
    await expect(owner.mutation(api.inventory.removeItem, { tenantId, stockItemId: spare })).rejects.toThrow(/history/);

    const unused = await item("Unused", "pc", 0);
    await owner.mutation(api.inventory.removeItem, { tenantId, stockItemId: unused });
    expect((await owner.query(api.inventory.listItems, { tenantId })).map((i) => i.name))
      .toEqual(["Beans", "Oat milk (Oatside)", "Spare"]);
  });
});

describe("roles", () => {
  test("cashiers see stock and log waste, but can't see costs or change stock otherwise", async () => {
    const { owner, tenantId, as, item } = await setup();
    const milk = await item("Fresh milk", "ml", 11);
    const recipeProduct = await owner.mutation(api.products.create, {
      tenantId, name: "Latte", kind: "recipe", price: 12000, modifierGroupIds: [], recipe: [{ stockItemId: milk, qty: 180 }],
    });
    const cashier = await as("user_cashier", "cashier");

    const [listed] = await cashier.query(api.inventory.listItems, { tenantId });
    expect(listed).toMatchObject({ name: "Fresh milk", avgCost: null });
    expect(await cashier.query(api.inventory.getItem, { tenantId, stockItemId: milk })).toMatchObject({ avgCost: null });
    expect(await cashier.query(api.products.get, { tenantId, productId: recipeProduct })).toMatchObject({ unitCost: null, belowTargetMargin: null });
    const listedProducts = await cashier.query(api.products.list, { tenantId, paginationOpts: page });
    expect(listedProducts.page[0]).toMatchObject({ unitCost: null, belowTargetMargin: null });
    expect((await cashier.query(api.products.search, { tenantId, term: "Latte" }))[0]).toMatchObject({ unitCost: null, belowTargetMargin: null });

    // Nothing on hand yet, so even a little waste needs a manager.
    await expect(cashier.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 10 })).rejects.toThrow(/Ask a manager/);
    await owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 100, unit: "base", totalCost: 1100 }] });
    await cashier.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 10 });
    await cashier.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 90 });

    for (const call of [
      () => cashier.query(api.inventory.movements, { tenantId, stockItemId: milk, paginationOpts: page }),
      () => cashier.query(api.recipes.forProduct, { tenantId, productId: recipeProduct }),
      () => cashier.mutation(api.inventory.createItem, { tenantId, name: "X", baseUnit: "pc", reorderPoint: 0 }),
      () => cashier.mutation(api.inventory.updateItem, { tenantId, stockItemId: milk, name: "X", reorderPoint: 0 }),
      () => cashier.mutation(api.inventory.removeItem, { tenantId, stockItemId: milk }),
      () => cashier.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 1, unit: "base", totalCost: 1 }] }),
      () => cashier.mutation(api.inventory.adjust, { tenantId, stockItemId: milk, counted: 5 }),
      () => cashier.mutation(api.inventory.submitCount, { tenantId, counts: [{ stockItemId: milk, counted: 5 }] }),
    ]) {
      await expect(call()).rejects.toThrow(/role/);
    }

    const manager = await as("user_manager", "manager");
    await manager.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 1000, unit: "base", totalCost: 11000 }] });
    await manager.mutation(api.inventory.submitCount, { tenantId, counts: [{ stockItemId: milk, counted: 900 }] });
    expect(await manager.query(api.inventory.getItem, { tenantId, stockItemId: milk })).toMatchObject({ onHand: 900, avgCost: 11 });
  });

  test("a disabled member can't change stock", async () => {
    const { t, owner, tenantId, item } = await setup();
    const milk = await item("Fresh milk", "ml", 11);
    await owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 1000, unit: "base", totalCost: 11000 }] });
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId: "user_gone", name: "Gone", role: "manager", status: "disabled" }));
    const gone = t.withIdentity({ subject: "user_gone" });
    await expect(gone.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: 1 })).rejects.toThrow(/access/);
    await expect(gone.mutation(api.inventory.receive, {
      tenantId, lines: [{ stockItemId: milk, qty: 1, unit: "base", totalCost: 1 }],
    })).rejects.toThrow(/access/);
    await expect(gone.query(api.inventory.listItems, { tenantId })).rejects.toThrow(/access/);
  });
});

describe("limits", () => {
  test("rejects non-numbers and out-of-range amounts everywhere", async () => {
    const { owner, tenantId, item } = await setup();
    const milk = await item("Fresh milk", "ml", 11);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 10_000_001]) {
      await expect(owner.mutation(api.inventory.logWaste, { tenantId, stockItemId: milk, qty: bad })).rejects.toThrow(/valid quantity/);
      await expect(owner.mutation(api.inventory.adjust, { tenantId, stockItemId: milk, counted: bad })).rejects.toThrow(/valid quantity/);
      await expect(owner.mutation(api.inventory.submitCount, { tenantId, counts: [{ stockItemId: milk, counted: bad }] }))
        .rejects.toThrow(/valid quantity/);
      await expect(owner.mutation(api.inventory.receive, {
        tenantId, lines: [{ stockItemId: milk, qty: bad, unit: "base", totalCost: 100 }],
      })).rejects.toThrow(/valid quantity/);
      await expect(owner.mutation(api.products.create, {
        tenantId, name: "Bad", kind: "recipe", price: 100, modifierGroupIds: [], recipe: [{ stockItemId: milk, qty: bad }],
      })).rejects.toThrow(/valid quantity/);
    }
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1_000_000_001]) {
      await expect(owner.mutation(api.inventory.createItem, { tenantId, name: "Bad", baseUnit: "g", reorderPoint: 0, avgCost: bad }))
        .rejects.toThrow(/valid cost/);
    }
    // A tiny quantity with a huge total would make an unsafe cost per unit.
    await expect(owner.mutation(api.inventory.receive, {
      tenantId, lines: [{ stockItemId: milk, qty: 0.001, unit: "base", totalCost: 1_000_000_000 }],
    })).rejects.toThrow(/too high/);
    expect(await owner.query(api.inventory.getItem, { tenantId, stockItemId: milk })).toMatchObject({ onHand: 0, avgCost: 11 });
  });

  test("a recipe's cached cost never exceeds the money limit", async () => {
    const { owner, tenantId, item } = await setup();
    const saffron = await item("Saffron", "g", 1_000_000_000); // ₱10M a gram
    const productId = await owner.mutation(api.products.create, {
      tenantId, name: "Gold latte", kind: "recipe", price: 100, modifierGroupIds: [], recipe: [{ stockItemId: saffron, qty: 10_000_000 }],
    });
    const product = await owner.query(api.products.get, { tenantId, productId });
    expect(product.unitCost).toBe(1_000_000_000);
    expect(product.belowTargetMargin).toBe(true);
  });

  test("a shop can have at most 200 modifier groups, so deleting a stock item checks all of them", async () => {
    const { t, owner, tenantId, item } = await setup();
    const oat = await item("Oat milk", "ml", 25);
    const option = (recipeDelta: { stockItemId: Id<"stockItems">; qty: number }[]) => ({ key: "a", name: "A", priceDelta: 0, recipeDelta });
    await t.run(async (ctx) => {
      for (let i = 0; i < 199; i++) {
        await ctx.db.insert("modifierGroups", { tenantId, name: `Group ${i}`, minSelect: 0, maxSelect: 1, options: [option([])] });
      }
      // The last group is the one that uses the item.
      await ctx.db.insert("modifierGroups", {
        tenantId, name: "Milk", minSelect: 0, maxSelect: 1, options: [option([{ stockItemId: oat, qty: 150 }])],
      });
    });
    await expect(owner.mutation(api.modifiers.create, {
      tenantId, name: "One more", minSelect: 0, maxSelect: 1, options: [{ name: "X", priceDelta: 0, recipeDelta: [] }],
    })).rejects.toThrow(/up to 200/);
    await expect(owner.mutation(api.inventory.removeItem, { tenantId, stockItemId: oat })).rejects.toThrow(/“Milk” modifier/);
  });

  test("recosting and re-flagging work through many products, in batches", async () => {
    const { t, owner, tenantId, item, runScheduled } = await setup();
    const milk = await item("Fresh milk", "ml", 10);
    const productIds = await t.run(async (ctx) => {
      const ids: Id<"products">[] = [];
      for (let i = 0; i < 120; i++) {
        const productId = await ctx.db.insert("products", {
          tenantId, name: `Drink ${i}`, kind: "recipe", price: 12000, unitCost: 1000,
          modifierGroupIds: [], isActive: i % 10 !== 0,
        });
        await ctx.db.insert("recipeLines", { tenantId, productId, stockItemId: milk, qty: 100 });
        ids.push(productId);
      }
      return ids;
    });

    // 100 ml at 60 c/ml → ₱60 a drink: 50% margin on ₱120 incl. VAT, under the 60% target.
    await owner.mutation(api.inventory.receive, { tenantId, lines: [{ stockItemId: milk, qty: 1000, unit: "base", totalCost: 60000 }] });
    await runScheduled();
    const products = await t.run((ctx) => Promise.all(productIds.map((id) => ctx.db.get(id))));
    expect(products.every((p) => p?.unitCost === 6000 && p.belowTargetMargin === true)).toBe(true);

    await owner.mutation(api.tenants.updateSettings, { tenantId, targetMarginBps: 4000 });
    await runScheduled();
    const reflagged = await t.run((ctx) => Promise.all(productIds.map((id) => ctx.db.get(id))));
    expect(reflagged.every((p) => p?.belowTargetMargin === false)).toBe(true);
  });
});
