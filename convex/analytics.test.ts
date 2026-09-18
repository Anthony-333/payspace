import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

// Analytics reads only the rollups checkout writes, so the thing worth proving is that the
// numbers it shows reconcile exactly with the sales that produced them.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** 10:00 in Manila on a given day, which is 02:00 UTC. */
const manilaMorning = (date: string) => new Date(`${date}T02:00:00Z`).getTime();

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user_owner", name: "Owner" });
  const { tenantId } = await owner.mutation(api.tenants.create, {
    name: "Brew Lab", slug: "brewlab", businessType: "cafe",
  });

  const water = await owner.mutation(api.products.create, {
    tenantId, name: "Bottled water", kind: "stocked", price: 6000, cost: 2500, modifierGroupIds: [],
  });
  const cake = await owner.mutation(api.products.create, {
    tenantId, name: "Cake slice", kind: "stocked", price: 12000, cost: 3000, modifierGroupIds: [],
  });

  let ref = 0;
  /** Rings up a real sale at a chosen moment, so the rollups are written the normal way. */
  const sell = async (productId: Id<"products">, qty: number, when: string, method: "cash" | "ewallet" = "cash") => {
    vi.setSystemTime(manilaMorning(when));
    const price = productId === water ? 6000 : 12000;
    return owner.mutation(api.sales.checkout, {
      tenantId,
      clientRef: `analytics-ref-${++ref}`,
      lines: [{ productId, qty, optionKeys: [] }],
      payments: [{ method, amount: price * qty }],
    });
  };

  const as = async (userId: string, role: "manager" | "cashier") => {
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId, name: userId, role, status: "active" }));
    return t.withIdentity({ subject: userId, name: userId });
  };

  return { t, owner, tenantId, water, cake, sell, as };
}

describe("summary", () => {
  test("totals, profit and the payment mix reconcile with the sales behind them", async () => {
    const { owner, tenantId, water, cake, sell } = await setup();
    await sell(water, 2, "2026-09-18");            // ₱120 revenue, ₱50 cost
    await sell(cake, 1, "2026-09-18", "ewallet");  // ₱120 revenue, ₱30 cost

    const summary = await owner.query(api.analytics.summary, {
      tenantId, from: "2026-09-18", to: "2026-09-18",
    });
    expect(summary.current).toMatchObject({
      revenue: 24000, cogs: 8000, profit: 16000, orders: 2,
      cash: 12000, ewallet: 12000, card: 0,
      averageTicket: 12000,
    });
    // ₱160 profit on ₱240 of sales is 66.67%.
    expect(summary.current.marginBps).toBe(6667);

    const sales = await owner.query(api.sales.recent, { tenantId });
    expect(sales.reduce((sum, sale) => sum + sale.total, 0)).toBe(summary.current.revenue);
  });

  test("compares with the same weekday a week earlier, not with yesterday", async () => {
    const { owner, tenantId, water, sell } = await setup();
    await sell(water, 1, "2026-09-11"); // the Friday before
    await sell(water, 3, "2026-09-17"); // the day before: must not be the comparison
    await sell(water, 2, "2026-09-18");

    const summary = await owner.query(api.analytics.summary, {
      tenantId, from: "2026-09-18", to: "2026-09-18",
    });
    expect(summary.current.revenue).toBe(12000);
    expect(summary.previous.revenue).toBe(6000); // the 11th, not the 17th
  });

  test("buckets revenue by the shop's hour, and by weekday for the heatmap", async () => {
    const { owner, tenantId, water, sell } = await setup();
    await sell(water, 1, "2026-09-18"); // 10:00 Manila, a Friday

    const summary = await owner.query(api.analytics.summary, {
      tenantId, from: "2026-09-18", to: "2026-09-18",
    });
    expect(summary.byHour.length).toBe(24);
    expect(summary.byHour[10]).toBe(6000);
    expect(summary.byHour.reduce((sum, hour) => sum + hour, 0)).toBe(6000);
    expect(summary.byWeekdayHour.length).toBe(7);
    expect(summary.byWeekdayHour[5][10]).toBe(6000); // Friday
  });

  test("fills quiet days so a trend line has no gaps", async () => {
    const { owner, tenantId, water, sell } = await setup();
    await sell(water, 1, "2026-09-16");
    await sell(water, 1, "2026-09-18");

    const summary = await owner.query(api.analytics.summary, {
      tenantId, from: "2026-09-16", to: "2026-09-18",
    });
    expect(summary.daily.map((day) => [day.date, day.revenue])).toEqual([
      ["2026-09-16", 6000],
      ["2026-09-17", 0],
      ["2026-09-18", 6000],
    ]);
  });

  test("an empty range reads as zero rather than failing", async () => {
    const { owner, tenantId } = await setup();
    const summary = await owner.query(api.analytics.summary, {
      tenantId, from: "2026-09-01", to: "2026-09-18",
    });
    expect(summary.current).toMatchObject({ revenue: 0, orders: 0, averageTicket: 0, marginBps: null });
  });

  test("refuses a backwards, malformed or overlong range", async () => {
    const { owner, tenantId } = await setup();
    const ask = (from: string, to: string) => owner.query(api.analytics.summary, { tenantId, from, to });
    await expect(ask("2026-09-18", "2026-09-01")).rejects.toThrow(/comes after/);
    await expect(ask("18-09-2026", "2026-09-18")).rejects.toThrow(/valid date range/);
    await expect(ask("2024-01-01", "2026-09-18")).rejects.toThrow(/up to 366 days/);
  });
});

describe("topProducts", () => {
  test("ranks by revenue and by profit, which are not the same list", async () => {
    const { owner, tenantId, water, cake, sell } = await setup();
    // Water sells more, cake earns more: exactly the gap the page exists to show.
    await sell(water, 20, "2026-09-18"); // ₱1,200 revenue, ₱700 profit
    await sell(cake, 8, "2026-09-18");   // ₱960 revenue, ₱720 profit

    const top = await owner.query(api.analytics.topProducts, {
      tenantId, from: "2026-09-18", to: "2026-09-18",
    });
    expect(top.byRevenue.map((item) => item.name)).toEqual(["Bottled water", "Cake slice"]);
    expect(top.byProfit.map((item) => item.name)).toEqual(["Cake slice", "Bottled water"]);
    expect(top.byRevenue[0]).toMatchObject({ qty: 20, revenue: 120000, profit: 70000 });
    expect(top.byProfit[0]).toMatchObject({ qty: 8, revenue: 96000, profit: 72000, marginBps: 7500 });
    expect(top.capped).toBe(false);
  });

  test("adds a product's days together across the range", async () => {
    const { owner, tenantId, water, sell } = await setup();
    await sell(water, 1, "2026-09-17");
    await sell(water, 2, "2026-09-18");

    const top = await owner.query(api.analytics.topProducts, {
      tenantId, from: "2026-09-17", to: "2026-09-18",
    });
    expect(top.byRevenue[0]).toMatchObject({ qty: 3, revenue: 18000 });
  });

  test("keeps its own range cap", async () => {
    const { owner, tenantId } = await setup();
    await expect(owner.query(api.analytics.topProducts, {
      tenantId, from: "2026-01-01", to: "2026-09-18",
    })).rejects.toThrow(/up to 31 days/);
  });
});

describe("alerts", () => {
  test("lists stock that needs attention, worst first, and thin margins", async () => {
    const { owner, tenantId, water, sell } = await setup();
    const beans = await owner.mutation(api.inventory.createItem, {
      tenantId, name: "Beans", baseUnit: "g", avgCost: 100, reorderPoint: 500,
    });
    await owner.mutation(api.inventory.receive, {
      tenantId, lines: [{ stockItemId: beans, qty: 400, unit: "base", totalCost: 40000 }],
    });
    await sell(water, 2, "2026-09-18"); // water was never received: goes negative

    const alerts = await owner.query(api.analytics.alerts, { tenantId });
    expect(alerts.stock[0]).toMatchObject({ name: "Bottled water", status: "negative", onHand: -2 });
    // Worst first: water went below zero, the cake slice is a stocked product still at zero,
    // and the beans are under their reorder point.
    expect(alerts.stock.map((item) => [item.name, item.status])).toEqual([
      ["Bottled water", "negative"],
      ["Cake slice", "out"],
      ["Beans", "low"],
    ]);
    expect(alerts.targetMarginBps).toBe(6000);
  });

  test("flags a product earning less than the target margin", async () => {
    const { owner, tenantId } = await setup();
    // ₱60 with a ₱50 cost is well under the 60% target.
    await owner.mutation(api.products.create, {
      tenantId, name: "Thin margin", kind: "stocked", price: 6000, cost: 5000, modifierGroupIds: [],
    });
    const alerts = await owner.query(api.analytics.alerts, { tenantId });
    expect(alerts.margin.map((product) => product.name)).toContain("Thin margin");
    expect(alerts.margin.find((product) => product.name === "Thin margin")!.marginBps).toBeLessThan(6000);
  });
});

describe("permissions and isolation", () => {
  test("a cashier can't read sales or profit at all", async () => {
    const { tenantId, as } = await setup();
    const cashier = await as("user_cashier", "cashier");
    const args = { tenantId, from: "2026-09-18", to: "2026-09-18" };
    await expect(cashier.query(api.analytics.summary, args)).rejects.toThrow(/role/);
    await expect(cashier.query(api.analytics.topProducts, args)).rejects.toThrow(/role/);
    await expect(cashier.query(api.analytics.alerts, { tenantId })).rejects.toThrow(/role/);
  });

  test("a manager can, and another shop cannot", async () => {
    const { t, tenantId, water, sell, as } = await setup();
    await sell(water, 1, "2026-09-18");
    const manager = await as("user_manager", "manager");
    const args = { tenantId, from: "2026-09-18", to: "2026-09-18" };
    expect((await manager.query(api.analytics.summary, args)).current.revenue).toBe(6000);

    const mallory = t.withIdentity({ subject: "user_mallory", name: "Mallory" });
    await mallory.mutation(api.tenants.create, { name: "Sari Mart", slug: "sarimart", businessType: "grocery" });
    await expect(mallory.query(api.analytics.summary, args)).rejects.toThrow(/access/);
    await expect(mallory.query(api.analytics.topProducts, args)).rejects.toThrow(/access/);
    await expect(mallory.query(api.analytics.alerts, { tenantId })).rejects.toThrow(/access/);
  });

  test("one shop's sales never show up in another's numbers", async () => {
    const { t, owner, tenantId, water, sell } = await setup();
    await sell(water, 5, "2026-09-18");

    const mallory = t.withIdentity({ subject: "user_mallory", name: "Mallory" });
    const other = await mallory.mutation(api.tenants.create, {
      name: "Sari Mart", slug: "sarimart", businessType: "grocery",
    });
    const theirs = await mallory.mutation(api.products.create, {
      tenantId: other.tenantId, name: "Rice 1 kg", kind: "stocked", price: 6500, cost: 5000, modifierGroupIds: [],
    });
    vi.setSystemTime(manilaMorning("2026-09-18"));
    await mallory.mutation(api.sales.checkout, {
      tenantId: other.tenantId, clientRef: "other-shop-ref",
      lines: [{ productId: theirs, qty: 1, optionKeys: [] }],
      payments: [{ method: "cash", amount: 6500 }],
    });

    const args = { from: "2026-09-18", to: "2026-09-18" };
    expect((await owner.query(api.analytics.summary, { tenantId, ...args })).current.revenue).toBe(30000);
    expect((await mallory.query(api.analytics.summary, { tenantId: other.tenantId, ...args })).current.revenue).toBe(6500);
    const theirTop = await mallory.query(api.analytics.topProducts, { tenantId: other.tenantId, ...args });
    expect(theirTop.byRevenue.map((item) => item.name)).toEqual(["Rice 1 kg"]);
  });
});
