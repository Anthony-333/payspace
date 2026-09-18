import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { businessMoment } from "./lib/businessDate";
import { canSeeCost } from "./lib/products";
import { roundQty } from "./lib/quantity";
import {
  MAX_PAYMENTS,
  MAX_SALE_LINES,
  computeTotals,
  priceLines,
  settlePayments,
  type PricedLine,
} from "./lib/sale";
import { recordMovement } from "./lib/stock";
import {
  getOwned,
  publicQuery,
  tenantMutation,
  tenantQuery,
  type TenantMutationCtx,
  type TenantQueryCtx,
} from "./lib/tenant";

// Checkout (docs/mvp-plan.md "Selling"). One transaction writes the sale, the stock ledger
// and the rollups the dashboard reads. The client never sends a price (CLAUDE.md rule 6).

const RECENT_SALES = 50;

const payMethod = v.union(v.literal("cash"), v.literal("ewallet"), v.literal("card"));

/**
 * The cashier's open shift, opened on their first sale of the day. Week 5 adds opening with a
 * float and closing with a blind count; until then every sale still lands in a real shift, so
 * nothing needs backfilling later.
 */
async function requireOpenShift(ctx: TenantMutationCtx) {
  const open = await ctx.db
    .query("shifts")
    .withIndex("by_tenant_status", (q) => q.eq("tenantId", ctx.tenantId).eq("status", "open"))
    .take(20);
  const mine = open.find((shift) => shift.memberId === ctx.member._id);
  if (mine) return mine;
  const shiftId = await ctx.db.insert("shifts", {
    tenantId: ctx.tenantId,
    memberId: ctx.member._id,
    status: "open",
    openingCash: 0,
  });
  const created = await ctx.db.get(shiftId);
  if (!created) throw new ConvexError("Could not start your shift. Try again.");
  return created;
}

/** Sale numbers are sequential per shop and never reset. */
async function nextSaleNumber(ctx: TenantMutationCtx) {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_tenant_name", (q) => q.eq("tenantId", ctx.tenantId).eq("name", "sale"))
    .unique();
  if (!counter) {
    await ctx.db.insert("counters", { tenantId: ctx.tenantId, name: "sale", value: 1 });
    return 1;
  }
  const value = counter.value + 1;
  await ctx.db.patch(counter._id, { value });
  return value;
}

/** 32 hex characters: the only thing protecting a public receipt, so it has to be unguessable. */
function newReceiptToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

/**
 * Takes the sold ingredients off the shelf through the ledger (CLAUDE.md rule 8), one movement
 * per stock item. Stock is allowed to go negative: a queue is no place to argue with a count.
 */
async function deductStock(ctx: TenantMutationCtx, priced: PricedLine[], saleId: Id<"sales">) {
  const needed = new Map<Id<"stockItems">, number>();
  for (const line of priced) {
    for (const use of line.uses) {
      needed.set(use.stockItemId, roundQty((needed.get(use.stockItemId) ?? 0) + use.qty * line.qty));
    }
  }
  for (const [stockItemId, qty] of needed) {
    if (qty === 0) continue;
    const item = await getOwned(ctx, ctx.tenantId, stockItemId);
    await recordMovement(ctx, item, { type: "sale", qty: -qty, unitCost: item.avgCost, saleId });
  }
}

/**
 * Keeps the rollups the dashboard reads in step, in the same transaction as the sale, so the
 * numbers can never drift from sales history (docs/mvp-plan.md "Dashboard analytics").
 */
async function bumpStats(
  ctx: TenantMutationCtx,
  businessDate: string,
  hour: number,
  priced: PricedLine[],
  totals: ReturnType<typeof computeTotals>,
  payments: Doc<"sales">["payments"],
) {
  const paid = { cash: 0, ewallet: 0, card: 0 };
  for (const payment of payments) paid[payment.method] += payment.amount;

  const day = await ctx.db
    .query("dailyStats")
    .withIndex("by_tenant_date", (q) => q.eq("tenantId", ctx.tenantId).eq("businessDate", businessDate))
    .unique();
  if (day) {
    const byHour = [...day.byHour];
    byHour[hour] = (byHour[hour] ?? 0) + totals.total;
    await ctx.db.patch(day._id, {
      revenue: day.revenue + totals.total,
      cogs: day.cogs + totals.cogs,
      orders: day.orders + 1,
      cash: day.cash + paid.cash,
      ewallet: day.ewallet + paid.ewallet,
      card: day.card + paid.card,
      byHour,
    });
  } else {
    const byHour = Array.from({ length: 24 }, () => 0);
    byHour[hour] = totals.total;
    await ctx.db.insert("dailyStats", {
      tenantId: ctx.tenantId,
      businessDate,
      revenue: totals.total,
      cogs: totals.cogs,
      orders: 1,
      ...paid,
      byHour,
    });
  }

  // One row per product per day, so "top items" never scans raw sales.
  const perProduct = new Map<Id<"products">, { qty: number; revenue: number; cogs: number }>();
  for (const line of priced) {
    const row = perProduct.get(line.productId) ?? { qty: 0, revenue: 0, cogs: 0 };
    row.qty += line.qty;
    row.revenue += line.unitPrice * line.qty;
    row.cogs += line.unitCost * line.qty;
    perProduct.set(line.productId, row);
  }
  for (const [productId, row] of perProduct) {
    const existing = await ctx.db
      .query("productDailyStats")
      .withIndex("by_tenant_date_product", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("businessDate", businessDate).eq("productId", productId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        qty: existing.qty + row.qty,
        revenue: existing.revenue + row.revenue,
        cogs: existing.cogs + row.cogs,
      });
    } else {
      await ctx.db.insert("productDailyStats", { tenantId: ctx.tenantId, businessDate, productId, ...row });
    }
  }
}

/**
 * Rings up an order. Idempotent through `clientRef`: a double tap, or a retry after the Wi-Fi
 * drops, returns the sale that was already made instead of ringing it up twice.
 */
export const checkout = tenantMutation({
  args: {
    clientRef: v.string(),
    lines: v.array(v.object({
      productId: v.id("products"),
      qty: v.number(),
      optionKeys: v.array(v.string()),
    })),
    payments: v.array(v.object({
      method: payMethod,
      amount: v.number(),
      ref: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const clientRef = args.clientRef.trim();
    if (clientRef.length < 8 || clientRef.length > 64) throw new ConvexError("This order is missing its reference.");

    // 1. Retry-safe: the same reference always returns the original sale.
    const existing = await ctx.db
      .query("sales")
      .withIndex("by_tenant_clientRef", (q) => q.eq("tenantId", ctx.tenantId).eq("clientRef", clientRef))
      .unique();
    if (existing) {
      return {
        saleId: existing._id,
        number: existing.number,
        total: existing.total,
        changeGiven: existing.changeGiven,
        receiptToken: existing.receiptToken,
        repeat: true,
      };
    }

    // 2. The server is the only source of prices and costs.
    if (args.lines.length > MAX_SALE_LINES) throw new ConvexError(`An order can have up to ${MAX_SALE_LINES} lines.`);
    if (args.payments.length > MAX_PAYMENTS) throw new ConvexError(`Split an order across up to ${MAX_PAYMENTS} payments.`);
    const shift = await requireOpenShift(ctx);
    const priced = await priceLines(ctx, args.lines);
    const totals = computeTotals(priced, ctx.tenant);
    const settled = settlePayments(totals.total, args.payments);

    // 3. One transaction: sale, stock, ledger, stats.
    const { date, hour } = businessMoment(Date.now(), ctx.tenant.timezone);
    const number = await nextSaleNumber(ctx);
    const receiptToken = newReceiptToken();
    const saleId = await ctx.db.insert("sales", {
      tenantId: ctx.tenantId,
      number,
      clientRef,
      shiftId: shift._id,
      memberId: ctx.member._id,
      businessDate: date,
      // `uses` drives the stock ledger below; the sale stores the snapshot the receipt needs.
      lines: priced.map((line) => ({
        productId: line.productId,
        name: line.name,
        optionNames: line.optionNames,
        qty: line.qty,
        unitPrice: line.unitPrice,
        unitCost: line.unitCost,
        discount: line.discount,
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      cogs: totals.cogs,
      payments: settled.payments,
      changeGiven: settled.changeGiven,
      status: "completed",
      receiptToken,
    });
    await deductStock(ctx, priced, saleId);
    await bumpStats(ctx, date, hour, priced, totals, settled.payments);

    return { saleId, number, total: totals.total, changeGiven: settled.changeGiven, receiptToken, repeat: false };
  },
});

/** Cashiers see the sales they rang up; owners and managers see the whole shop's. */
function canSeeEverySale(member: Doc<"members">) {
  return member.role === "owner" || member.role === "manager";
}

function toSummary(sale: Doc<"sales">, staffName: string) {
  return {
    _id: sale._id,
    number: sale.number,
    at: sale._creationTime,
    businessDate: sale.businessDate,
    total: sale.total,
    itemCount: sale.lines.reduce((sum, line) => sum + line.qty, 0),
    methods: [...new Set(sale.payments.map((payment) => payment.method))],
    status: sale.status,
    receiptToken: sale.receiptToken,
    staffName,
  };
}

/** The latest sales, newest first, for reopening a receipt at the counter. */
export const recent = tenantQuery({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_tenant_date", (q) => q.eq("tenantId", ctx.tenantId))
      .order("desc")
      .take(RECENT_SALES);
    const mine = canSeeEverySale(ctx.member) ? sales : sales.filter((s) => s.memberId === ctx.member._id);
    return Promise.all(mine.map(async (sale) => toSummary(sale, await staffName(ctx, sale.memberId))));
  },
});

async function staffName(ctx: TenantQueryCtx, memberId: Id<"members">) {
  const member = await ctx.db.get(memberId);
  return member?.tenantId === ctx.tenantId ? member.name : "Former staff";
}

/** One sale in full, for the in-app receipt. Cost is hidden from cashiers, as everywhere else. */
export const get = tenantQuery({
  args: { saleId: v.id("sales") },
  handler: async (ctx, { saleId }) => {
    const sale = await getOwned(ctx, ctx.tenantId, saleId);
    if (!canSeeEverySale(ctx.member) && sale.memberId !== ctx.member._id) {
      throw new ConvexError("Not found.");
    }
    return {
      ...toSummary(sale, await staffName(ctx, sale.memberId)),
      lines: sale.lines.map((line) => ({ ...line, unitCost: canSeeCost(ctx.member) ? line.unitCost : null })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      payments: sale.payments,
      changeGiven: sale.changeGiven,
      cogs: canSeeCost(ctx.member) ? sale.cogs : null,
    };
  },
});

/**
 * The public receipt at /r/[token]. No sign-in: the token is the key, so this returns only
 * what a customer should see, and never a cost, a member or an internal ID.
 */
export const byToken = publicQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const sale = await ctx.db
      .query("sales")
      .withIndex("by_receipt_token", (q) => q.eq("receiptToken", token))
      .unique();
    if (!sale) return null;
    const tenant = await ctx.db.get(sale.tenantId);
    if (!tenant) return null;
    return {
      shop: {
        name: tenant.name,
        currency: tenant.currency,
        taxRateBps: tenant.taxRateBps,
        pricesIncludeTax: tenant.pricesIncludeTax,
        receiptFooter: tenant.receiptFooter,
      },
      number: sale.number,
      at: sale._creationTime,
      businessDate: sale.businessDate,
      status: sale.status,
      lines: sale.lines.map((line) => ({
        name: line.name,
        optionNames: line.optionNames,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      total: sale.total,
      payments: sale.payments.map((payment) => ({ method: payment.method, amount: payment.amount, ref: payment.ref })),
      changeGiven: sale.changeGiven,
    };
  },
});
