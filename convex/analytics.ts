import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { addDays, daysBetween, isBusinessDate, weekdayOf } from "./lib/businessDate";
import { grossMarginBps } from "./lib/money";
import { stockStatus } from "./lib/quantity";
import { getOwned, requireRole, tenantQuery, type TenantQueryCtx } from "./lib/tenant";

// Reads the rollups checkout writes (docs/mvp-plan.md "Dashboard analytics"), never raw sales,
// so today's numbers are a handful of documents. Convex keeps them live while the owner watches.

/** A year of daily rows is 366 documents: plenty for any range picker the UI offers. */
const MAX_DAYS = 366;
/** Top items read one row per product per day, so the range is capped to keep the page quick. */
const MAX_TOP_DAYS = 31;
const MAX_PRODUCT_ROWS = 5000;
const TOP_ITEMS = 10;
const MAX_ALERTS = 20;
const MAX_STOCK_ITEMS = 1000;

const range = { from: v.string(), to: v.string() };

function assertRange(from: string, to: string, maxDays = MAX_DAYS) {
  if (!isBusinessDate(from) || !isBusinessDate(to)) throw new ConvexError("Choose a valid date range.");
  if (from > to) throw new ConvexError("The start of the range comes after its end.");
  if (daysBetween(from, to) > maxDays) throw new ConvexError(`Choose a range of up to ${maxDays} days.`);
}

function readDays(ctx: TenantQueryCtx, from: string, to: string) {
  return ctx.db
    .query("dailyStats")
    .withIndex("by_tenant_date", (q) =>
      q.eq("tenantId", ctx.tenantId).gte("businessDate", from).lte("businessDate", to))
    .take(MAX_DAYS);
}

/** Everything the KPI tiles need from a set of daily rows. */
function totalsOf(days: Doc<"dailyStats">[]) {
  const totals = { revenue: 0, cogs: 0, orders: 0, cash: 0, ewallet: 0, card: 0 };
  for (const day of days) {
    totals.revenue += day.revenue;
    totals.cogs += day.cogs;
    totals.orders += day.orders;
    totals.cash += day.cash;
    totals.ewallet += day.ewallet;
    totals.card += day.card;
  }
  const profit = totals.revenue - totals.cogs;
  return {
    ...totals,
    profit,
    // Rounded down to the centavo: an average ticket is a guide, not an amount anyone pays.
    averageTicket: totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0,
    marginBps: totals.revenue > 0 ? Math.round((profit * 10_000) / totals.revenue) : null,
  };
}

/**
 * The KPI tiles, the hourly pattern and the payment mix for a range, each compared with the
 * same span a week earlier: the same weekdays, which is a fairer read than yesterday.
 */
export const summary = tenantQuery({
  args: range,
  handler: async (ctx, { from, to }) => {
    requireRole(ctx.member, "owner", "manager");
    assertRange(from, to);

    const [days, weekBefore] = await Promise.all([
      readDays(ctx, from, to),
      readDays(ctx, addDays(from, -7), addDays(to, -7)),
    ]);

    const byHour = Array.from({ length: 24 }, () => 0);
    // 7 rows of 24, Sunday first, for the "when do I need two baristas?" heatmap.
    const byWeekdayHour = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const day of days) {
      const weekday = weekdayOf(day.businessDate);
      day.byHour.forEach((revenue, hour) => {
        byHour[hour] += revenue;
        byWeekdayHour[weekday][hour] += revenue;
      });
    }

    return {
      from,
      to,
      targetMarginBps: ctx.tenant.targetMarginBps,
      current: totalsOf(days),
      previous: totalsOf(weekBefore),
      byHour,
      byWeekdayHour,
      // Every day in the range, including the quiet ones, so a trend line has no gaps.
      daily: (() => {
        const found = new Map(days.map((day) => [day.businessDate, day]));
        const out = [];
        for (let date = from; date <= to; date = addDays(date, 1)) {
          const day = found.get(date);
          out.push({
            date,
            revenue: day?.revenue ?? 0,
            profit: day ? day.revenue - day.cogs : 0,
            orders: day?.orders ?? 0,
          });
        }
        return out;
      })(),
    };
  },
});

/**
 * What sells most, and what actually earns most. They are rarely the same list, and the gap
 * between them is the most useful thing on the page.
 */
export const topProducts = tenantQuery({
  args: range,
  handler: async (ctx, { from, to }) => {
    requireRole(ctx.member, "owner", "manager");
    assertRange(from, to, MAX_TOP_DAYS);

    const rows = await ctx.db
      .query("productDailyStats")
      .withIndex("by_tenant_date_product", (q) =>
        q.eq("tenantId", ctx.tenantId).gte("businessDate", from).lte("businessDate", to))
      .take(MAX_PRODUCT_ROWS);

    const totals = new Map<Id<"products">, { qty: number; revenue: number; cogs: number }>();
    for (const row of rows) {
      const total = totals.get(row.productId) ?? { qty: 0, revenue: 0, cogs: 0 };
      total.qty += row.qty;
      total.revenue += row.revenue;
      total.cogs += row.cogs;
      totals.set(row.productId, total);
    }

    const items = [];
    for (const [productId, total] of totals) {
      const product = await ctx.db.get(productId);
      if (!product || product.tenantId !== ctx.tenantId) continue; // never leak another shop's name
      const profit = total.revenue - total.cogs;
      items.push({
        productId,
        name: product.name,
        isActive: product.isActive,
        qty: total.qty,
        revenue: total.revenue,
        profit,
        marginBps: total.revenue > 0 ? Math.round((profit * 10_000) / total.revenue) : null,
      });
    }

    return {
      byRevenue: [...items].sort((a, b) => b.revenue - a.revenue).slice(0, TOP_ITEMS),
      byProfit: [...items].sort((a, b) => b.profit - a.profit).slice(0, TOP_ITEMS),
      // True when the range was busy enough to hit the row cap, so the lists are a sample.
      capped: rows.length === MAX_PRODUCT_ROWS,
    };
  },
});

/** What needs attention now: stock that has run down or gone negative, and thin margins. */
export const alerts = tenantQuery({
  args: {},
  handler: async (ctx) => {
    requireRole(ctx.member, "owner", "manager");

    const items = await ctx.db
      .query("stockItems")
      .withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId))
      .take(MAX_STOCK_ITEMS);
    const flagged = items
      .map((item) => ({ item, status: stockStatus(item) }))
      .filter(({ status }) => status !== "ok")
      // Negative first, then out, then low: the order someone should deal with them.
      .sort((a, b) => ["negative", "out", "low"].indexOf(a.status) - ["negative", "out", "low"].indexOf(b.status));

    const belowMargin = await ctx.db
      .query("products")
      .withIndex("by_tenant_below_margin", (q) => q.eq("tenantId", ctx.tenantId).eq("belowTargetMargin", true))
      .take(MAX_ALERTS + 1);

    return {
      stock: flagged.slice(0, MAX_ALERTS).map(({ item, status }) => ({
        _id: item._id,
        name: item.name,
        onHand: item.onHand,
        reorderPoint: item.reorderPoint,
        baseUnit: item.baseUnit,
        status,
      })),
      stockCount: flagged.length,
      margin: belowMargin.slice(0, MAX_ALERTS).filter((product) => product.isActive).map((product) => ({
        _id: product._id,
        name: product.name,
        price: product.price,
        unitCost: product.unitCost,
        marginBps: grossMarginBps(product.price, product.unitCost, ctx.tenant.taxRateBps, ctx.tenant.pricesIncludeTax),
      })),
      targetMarginBps: ctx.tenant.targetMarginBps,
    };
  },
});

/** One product's day-by-day history, for the sparkline on a product sheet. */
export const forProduct = tenantQuery({
  args: { productId: v.id("products"), ...range },
  handler: async (ctx, { productId, from, to }) => {
    requireRole(ctx.member, "owner", "manager");
    assertRange(from, to, MAX_TOP_DAYS);
    await getOwned(ctx, ctx.tenantId, productId);

    const rows = await ctx.db
      .query("productDailyStats")
      .withIndex("by_tenant_date_product", (q) =>
        q.eq("tenantId", ctx.tenantId).gte("businessDate", from).lte("businessDate", to))
      .take(MAX_PRODUCT_ROWS);

    const mine = new Map(rows.filter((row) => row.productId === productId).map((row) => [row.businessDate, row]));
    const out = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const row = mine.get(date);
      out.push({
        date,
        qty: row?.qty ?? 0,
        revenue: row?.revenue ?? 0,
        profit: row ? row.revenue - row.cogs : 0,
      });
    }
    return out;
  },
});
