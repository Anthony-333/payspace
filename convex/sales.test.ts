import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { taxFromTotals } from "./lib/money";
import schema from "./schema";
import { modules } from "./test.setup";

// Checkout: server pricing, idempotency, the stock ledger and the rollups the dashboard reads.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user_owner", name: "Owner" });
  const { tenantId } = await owner.mutation(api.tenants.create, {
    name: "Brew Lab", slug: "brewlab", businessType: "cafe",
  });

  const as = async (userId: string, role: "manager" | "cashier") => {
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId, name: userId, role, status: "active" }));
    return t.withIdentity({ subject: userId, name: userId });
  };
  const item = (name: string, baseUnit: "g" | "ml" | "pc", avgCost: number) =>
    owner.mutation(api.inventory.createItem, { tenantId, name, baseUnit, avgCost, reorderPoint: 0 });
  const onHand = async (stockItemId: Id<"stockItems">) =>
    (await owner.query(api.inventory.getItem, { tenantId, stockItemId })).onHand;
  /** Σ ledger quantities, which must always equal the on-hand cache (CLAUDE.md rule 8). */
  const ledgerTotal = async (stockItemId: Id<"stockItems">) => {
    const rows = await t.run((ctx) => ctx.db
      .query("stockMovements")
      .withIndex("by_tenant_item", (q) => q.eq("tenantId", tenantId).eq("stockItemId", stockItemId))
      .collect());
    return Math.round(rows.reduce((sum, r) => sum + r.qty, 0) * 1000) / 1000;
  };
  const cash = (amount: number) => [{ method: "cash" as const, amount }];
  return { t, owner, tenantId, as, item, onHand, ledgerTotal, cash };
}

/** A café: a latte made from a recipe, with a milk option, plus a bottled drink off the shelf. */
async function cafe() {
  const base = await setup();
  const { owner, tenantId, item } = base;
  const milk = await item("Fresh milk", "ml", 12);
  const oat = await item("Oat milk", "ml", 30);
  const beans = await item("Beans", "g", 120);

  const milkGroup = await owner.mutation(api.modifiers.create, {
    tenantId,
    name: "Milk",
    minSelect: 1,
    maxSelect: 1,
    options: [
      { name: "Fresh milk", priceDelta: 0, recipeDelta: [{ stockItemId: milk, qty: 150 }] },
      { name: "Oat milk", priceDelta: 2000, recipeDelta: [{ stockItemId: oat, qty: 150 }] },
    ],
  });

  // ₱140 latte: 18 g of beans, and the milk comes from the chosen option.
  const latte = await owner.mutation(api.products.create, {
    tenantId, name: "Latte", kind: "recipe", price: 14000,
    modifierGroupIds: [milkGroup], recipe: [{ stockItemId: beans, qty: 18 }],
  });
  // ₱60 bottled water, its own stock item, ₱25 a piece.
  const water = await owner.mutation(api.products.create, {
    tenantId, name: "Bottled water", kind: "stocked", price: 6000, cost: 2500, modifierGroupIds: [],
  });
  const waterItem = (await owner.query(api.products.get, { tenantId, productId: water })).stockItemId!;

  const groups = await owner.query(api.modifiers.list, { tenantId });
  const group = groups.find((g) => g._id === milkGroup)!;
  const option = (name: string) => `${milkGroup}:${group.options.find((o) => o.name === name)!.key}`;

  return { ...base, milk, oat, beans, latte, water, waterItem, milkGroup, option };
}

describe("checkout", () => {
  test("prices the order on the server, from product IDs and option refs alone", async () => {
    const { owner, tenantId, latte, option, cash } = await cafe();

    const sale = await owner.mutation(api.sales.checkout, {
      tenantId,
      clientRef: "ref-latte-oat",
      lines: [{ productId: latte, qty: 2, optionKeys: [option("Oat milk")] }],
      payments: cash(40000),
    });

    // ₱140 + ₱20 oat = ₱160 each, ₱320 for two. VAT is inside the price (12%).
    expect(sale).toMatchObject({ number: 1, total: 32000, changeGiven: 8000, repeat: false });
    const full = await owner.query(api.sales.get, { tenantId, saleId: sale.saleId });
    expect(full).toMatchObject({ subtotal: 32000, tax: 3429, total: 32000, itemCount: 2 });
    expect(full.lines[0]).toMatchObject({
      name: "Latte", optionNames: ["Oat milk"], qty: 2, unitPrice: 16000,
      // 18 g of beans at ₱1.20 = ₱21.60, plus 150 ml of oat at ₱0.30 = ₱45 → ₱66.60
      unitCost: 6660,
    });
    expect(full.cogs).toBe(13320);
  });

  test("a shop with VAT switched off rings up no tax at all", async () => {
    const { owner, tenantId, latte, option, cash } = await cafe();
    // Switching VAT off is a 0% rate, so there is only one answer to what this shop charges.
    await owner.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0 });

    const sale = await owner.mutation(api.sales.checkout, {
      tenantId,
      clientRef: "ref-no-vat",
      lines: [{ productId: latte, qty: 2, optionKeys: [option("Oat milk")] }],
      payments: cash(32000),
    });

    const full = await owner.query(api.sales.get, { tenantId, saleId: sale.saleId });
    // The same ₱320 order as above: the customer pays the shelf price, and none of it is VAT.
    expect(full).toMatchObject({ subtotal: 32000, tax: 0, total: 32000 });
  });

  test("a receipt keeps the VAT it was issued with after the shop switches VAT off", async () => {
    const { owner, tenantId, water, cash } = await cafe();
    const sale = await owner.mutation(api.sales.checkout, {
      tenantId,
      clientRef: "ref-vat-then-off",
      lines: [{ productId: water, qty: 1, optionKeys: [] }],
      payments: cash(6000),
    });
    const before = await owner.query(api.sales.get, { tenantId, saleId: sale.saleId });
    expect(before.tax).toBeGreaterThan(0);

    await owner.mutation(api.tenants.updateSettings, { tenantId, taxRateBps: 0 });

    const receipt = await owner.query(api.sales.byToken, { token: before.receiptToken });
    expect(receipt).not.toBeNull();
    expect(receipt!.tax).toBe(before.tax);
    // 12%, read back out of the sale's own totals rather than the shop's settings today.
    expect(taxFromTotals(receipt!)).toEqual({ rateBps: 1200, includedInPrices: true });
  });

  test("a repeated clientRef returns the first sale instead of ringing it up twice", async () => {
    const { owner, tenantId, water, waterItem, onHand, cash } = await cafe();
    const args = {
      tenantId,
      clientRef: "ref-double-tap",
      lines: [{ productId: water, qty: 3, optionKeys: [] }],
      payments: cash(20000),
    };
    const first = await owner.mutation(api.sales.checkout, args);
    const retry = await owner.mutation(api.sales.checkout, args);

    expect(retry.saleId).toBe(first.saleId);
    expect(retry).toMatchObject({ number: first.number, total: first.total, repeat: true });
    expect(await onHand(waterItem)).toBe(-3); // deducted once, not twice
    expect((await owner.query(api.sales.recent, { tenantId })).length).toBe(1);
  });

  test("deducts the recipe, the option's ingredients and stocked items through the ledger", async () => {
    const { owner, tenantId, latte, water, waterItem, milk, oat, beans, option, onHand, ledgerTotal, cash } = await cafe();
    await owner.mutation(api.inventory.receive, {
      tenantId,
      lines: [
        { stockItemId: beans, qty: 1000, unit: "base" as const, totalCost: 120000 },
        { stockItemId: milk, qty: 2000, unit: "base" as const, totalCost: 24000 },
      ],
    });

    await owner.mutation(api.sales.checkout, {
      tenantId,
      clientRef: "ref-mixed",
      lines: [
        { productId: latte, qty: 2, optionKeys: [option("Fresh milk")] },
        { productId: latte, qty: 1, optionKeys: [option("Oat milk")] },
        { productId: water, qty: 2, optionKeys: [] },
      ],
      payments: cash(60000),
    });

    expect(await onHand(beans)).toBe(1000 - 54);   // 18 g × 3 lattes
    expect(await onHand(milk)).toBe(2000 - 300);   // 150 ml × 2 fresh
    expect(await onHand(oat)).toBe(-150);          // never received: allowed, and flagged
    expect(await onHand(waterItem)).toBe(-2);
    for (const stockItem of [beans, milk, oat, waterItem]) {
      expect(await ledgerTotal(stockItem)).toBe(await onHand(stockItem));
    }
    const got = await owner.query(api.inventory.getItem, { tenantId, stockItemId: oat });
    expect(got.status).toBe("negative");
  });

  test("updates the daily and per-product rollups in the same transaction", async () => {
    const { owner, tenantId, latte, water, option, cash } = await cafe();
    await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-daily-a",
      lines: [{ productId: latte, qty: 1, optionKeys: [option("Fresh milk")] }],
      payments: cash(14000),
    });
    await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-daily-b",
      lines: [{ productId: water, qty: 2, optionKeys: [] }],
      payments: [{ method: "ewallet" as const, amount: 12000, ref: "GC-99" }],
    });

    const day = await owner.run(async (ctx) =>
      ctx.db.query("dailyStats").withIndex("by_tenant_date", (q) => q.eq("tenantId", tenantId)).unique());
    expect(day).toMatchObject({ revenue: 26000, orders: 2, cash: 14000, ewallet: 12000, card: 0 });
    expect(day!.byHour.reduce((sum, hour) => sum + hour, 0)).toBe(26000);
    expect(day!.byHour.length).toBe(24);

    const perProduct = await owner.run(async (ctx) =>
      ctx.db.query("productDailyStats").withIndex("by_tenant_date_product", (q) => q.eq("tenantId", tenantId)).collect());
    expect(perProduct.map((row) => [row.productId, row.qty, row.revenue]).sort()).toEqual(
      [[latte, 1, 14000], [water, 2, 12000]].sort(),
    );
    // The rollups must reconcile with sales history exactly.
    const sales = await owner.query(api.sales.recent, { tenantId });
    expect(sales.reduce((sum, sale) => sum + sale.total, 0)).toBe(day!.revenue);
  });

  test("numbers sales sequentially and opens a shift for the cashier", async () => {
    const { owner, tenantId, as, water, cash } = await cafe();
    const cashier = await as("user_cashier", "cashier");
    const first = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-seq-1", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });
    const second = await cashier.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-seq-2", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });
    expect([first.number, second.number]).toEqual([1, 2]);

    const shifts = await owner.run((ctx) =>
      ctx.db.query("shifts").withIndex("by_tenant_status", (q) => q.eq("tenantId", tenantId).eq("status", "open")).collect());
    expect(shifts.length).toBe(2); // one each, and the second sale reuses the cashier's
    await cashier.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-seq-3", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });
    expect((await owner.run((ctx) =>
      ctx.db.query("shifts").withIndex("by_tenant_status", (q) => q.eq("tenantId", tenantId).eq("status", "open")).collect())).length)
      .toBe(2);
  });
});

describe("checkout refuses bad orders", () => {
  test("an order that is not covered, and a card that overpays", async () => {
    const { owner, tenantId, water, cash } = await cafe();
    const line = [{ productId: water, qty: 2, optionKeys: [] }];
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-short", lines: line, payments: cash(11999),
    })).rejects.toThrow(/does not cover/);
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-overcard", lines: line, payments: [{ method: "card" as const, amount: 20000 }],
    })).rejects.toThrow(/cannot be more than the amount due/);
    // Split across methods, with the cash covering the change, is fine.
    const split = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-split",
      lines: line,
      payments: [{ method: "ewallet" as const, amount: 5000, ref: "GC-1" }, { method: "cash" as const, amount: 10000 }],
    });
    expect(split.changeGiven).toBe(3000);
  });

  test("an empty order, a silly quantity, and an archived product", async () => {
    const { owner, tenantId, water, cash } = await cafe();
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-empty", lines: [], payments: cash(1000),
    })).rejects.toThrow(/Add something/);
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-big-qty", lines: [{ productId: water, qty: 1000, optionKeys: [] }], payments: cash(100000),
    })).rejects.toThrow(/Choose 1 to 999/);

    await owner.mutation(api.products.setArchived, { tenantId, productId: water, archived: true });
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-archived", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    })).rejects.toThrow(/no longer sold/);
  });

  test("a missing option, one that was deleted, and an option from another product", async () => {
    const { owner, tenantId, latte, water, milkGroup, option, cash } = await cafe();
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-nochoice", lines: [{ productId: latte, qty: 1, optionKeys: [] }], payments: cash(14000),
    })).rejects.toThrow(/Choose 1 for/);
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-notoffered",
      lines: [{ productId: water, qty: 1, optionKeys: [option("Oat milk")] }],
      payments: cash(6000),
    })).rejects.toThrow(/does not offer/);
    await expect(owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-gone",
      lines: [{ productId: latte, qty: 1, optionKeys: [`${milkGroup}:almond`] }],
      payments: cash(14000),
    })).rejects.toThrow(/no longer has that option/);
  });

  test("a negative modifier can never take a line below zero", async () => {
    const { owner, tenantId, item } = await cafe();
    const cup = await item("Cup", "pc", 100);
    const group = await owner.mutation(api.modifiers.create, {
      tenantId, name: "Deal", minSelect: 1, maxSelect: 1,
      options: [{ name: "Half off", priceDelta: -90000, recipeDelta: [{ stockItemId: cup, qty: 1 }] }],
    });
    const product = await owner.mutation(api.products.create, {
      tenantId, name: "Snack", kind: "service", price: 5000, cost: 0, modifierGroupIds: [group],
    });
    const groups = await owner.query(api.modifiers.list, { tenantId });
    const key = groups.find((g) => g._id === group)!.options[0].key;

    const sale = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-free", lines: [{ productId: product, qty: 1, optionKeys: [`${group}:${key}`] }],
      payments: [{ method: "cash" as const, amount: 1 }],
    });
    // ₱50 − ₱900 clamps to ₱0, and the sale is still valid.
    expect(sale.total).toBe(0);
    expect(sale.changeGiven).toBe(1);
  });
});

describe("receipts", () => {
  test("the public receipt shows the order but never a cost, and a bad token finds nothing", async () => {
    const { t, owner, tenantId, latte, option, cash } = await cafe();
    const sale = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-receipt",
      lines: [{ productId: latte, qty: 1, optionKeys: [option("Oat milk")] }],
      payments: cash(20000),
    });

    const receipt = await t.query(api.sales.byToken, { token: sale.receiptToken });
    expect(receipt).toMatchObject({
      number: 1, total: 16000, changeGiven: 4000, status: "completed",
      shop: { name: "Brew Lab", currency: "PHP" },
    });
    expect(receipt!.lines[0]).toEqual({ name: "Latte", optionNames: ["Oat milk"], qty: 1, unitPrice: 16000 });
    expect(JSON.stringify(receipt)).not.toContain("unitCost");
    expect(JSON.stringify(receipt)).not.toContain("cogs");
    expect(await t.query(api.sales.byToken, { token: "not-a-real-token" })).toBeNull();
  });

  test("a cashier sees only their own sales, and never a cost", async () => {
    const { owner, tenantId, as, water, cash } = await cafe();
    const cashier = await as("user_cashier", "cashier");
    const mine = await cashier.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-cashier", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });
    const theirs = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-owner", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });

    expect((await cashier.query(api.sales.recent, { tenantId })).map((s) => s.number)).toEqual([mine.number]);
    expect((await owner.query(api.sales.recent, { tenantId })).map((s) => s.number)).toEqual([2, 1]);
    await expect(cashier.query(api.sales.get, { tenantId, saleId: theirs.saleId })).rejects.toThrow(/Not found/);

    const own = await cashier.query(api.sales.get, { tenantId, saleId: mine.saleId });
    expect(own.cogs).toBeNull();
    expect(own.lines[0].unitCost).toBeNull();
  });
});

describe("tenant isolation", () => {
  test("another shop cannot sell, read or receipt this shop's sales", async () => {
    const { t, owner, tenantId, water, cash } = await cafe();
    const sale = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-mine", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });
    const mallory = t.withIdentity({ subject: "user_mallory", name: "Mallory" });
    const other = await mallory.mutation(api.tenants.create, {
      name: "Sari Mart", slug: "sarimart", businessType: "grocery",
    });

    await expect(mallory.mutation(api.sales.checkout, {
      tenantId, clientRef: "ref-theft", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    })).rejects.toThrow(/access/);
    await expect(mallory.query(api.sales.recent, { tenantId })).rejects.toThrow(/access/);
    await expect(mallory.query(api.sales.get, { tenantId, saleId: sale.saleId })).rejects.toThrow(/access/);
    // Not even by naming their own shop while pointing at another shop's sale.
    await expect(mallory.query(api.sales.get, { tenantId: other.tenantId, saleId: sale.saleId }))
      .rejects.toThrow(/Not found/);
    // A product from another shop can never be put on an order.
    await expect(mallory.mutation(api.sales.checkout, {
      tenantId: other.tenantId, clientRef: "ref-cross",
      lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    })).rejects.toThrow(/Not found/);
  });

  test("sale numbers are per shop, and a clientRef only collides inside one shop", async () => {
    const { t, owner, tenantId, water, cash } = await cafe();
    const mallory = t.withIdentity({ subject: "user_mallory", name: "Mallory" });
    const other = await mallory.mutation(api.tenants.create, {
      name: "Sari Mart", slug: "sarimart", businessType: "grocery",
    });
    const theirs = await mallory.mutation(api.products.create, {
      tenantId: other.tenantId, name: "Rice 1 kg", kind: "stocked", price: 6500, cost: 5000, modifierGroupIds: [],
    });

    const a = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: "same-ref", lines: [{ productId: water, qty: 1, optionKeys: [] }], payments: cash(6000),
    });
    const b = await mallory.mutation(api.sales.checkout, {
      tenantId: other.tenantId, clientRef: "same-ref",
      lines: [{ productId: theirs, qty: 1, optionKeys: [] }], payments: cash(6500),
    });
    expect(a.number).toBe(1);
    expect(b.number).toBe(1); // its own counter, not the next one along
    expect(b.saleId).not.toBe(a.saleId);
  });
});
