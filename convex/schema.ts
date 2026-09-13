import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const tenantId = v.id("tenants");
const money = v.number(); // integer minor units: ₱140.00 → 14000
const role = v.union(v.literal("owner"), v.literal("manager"), v.literal("cashier"));
const payMethod = v.union(v.literal("cash"), v.literal("ewallet"), v.literal("card"));

export const businessType = v.union(
  v.literal("cafe"),
  v.literal("grocery"),
  v.literal("bakery"),
  v.literal("retail"),
);

export const productKind = v.union(v.literal("stocked"), v.literal("recipe"), v.literal("service"));
export const baseUnit = v.union(v.literal("pc"), v.literal("g"), v.literal("ml"));

export default defineSchema({
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    businessType,
    currency: v.string(),            // "PHP"
    timezone: v.string(),            // "Asia/Manila"
    taxRateBps: v.number(),          // 1200 = 12%
    pricesIncludeTax: v.boolean(),
    targetMarginBps: v.number(),     // 6000 = 60%, drives margin alerts
    discountLimitBps: v.number(),    // max cashier discount without a manager PIN
    receiptFooter: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  members: defineTable({
    tenantId,
    userId: v.string(),              // Better Auth user ID (identity.subject)
    name: v.string(),
    role,
    status: v.union(v.literal("active"), v.literal("disabled")),
    pinHash: v.optional(v.string()), // manager overrides at the counter
  })
    .index("by_tenant_user", ["tenantId", "userId"])
    .index("by_user", ["userId"]),

  categories: defineTable({ tenantId, name: v.string(), sortOrder: v.number() })
    .index("by_tenant", ["tenantId", "sortOrder"]),

  products: defineTable({
    tenantId,
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    kind: productKind,
    stockItemId: v.optional(v.id("stockItems")), // when kind is "stocked"
    price: money,
    unitCost: money,                 // cached, recomputed when costs change
    barcode: v.optional(v.string()),
    sku: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    modifierGroupIds: v.array(v.id("modifierGroups")),
    isActive: v.boolean(),           // archive instead of delete
    belowTargetMargin: v.optional(v.boolean()), // kept in step with price and cost changes
  })
    .index("by_tenant_active", ["tenantId", "isActive"])
    .index("by_tenant_below_margin", ["tenantId", "belowTargetMargin"])
    .index("by_tenant_active_category", ["tenantId", "isActive", "categoryId"])
    .index("by_tenant_barcode", ["tenantId", "barcode"])
    .index("by_tenant_stock_item", ["tenantId", "stockItemId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["tenantId", "isActive"] }),

  modifierGroups: defineTable({
    tenantId,
    name: v.string(),                // "Size", "Milk", "Add-ons"
    minSelect: v.number(),
    maxSelect: v.number(),
    options: v.array(v.object({
      key: v.string(),
      name: v.string(),              // "Oat milk"
      priceDelta: money,             // +2000
      recipeDelta: v.array(v.object({ stockItemId: v.id("stockItems"), qty: v.number() })),
    })),
  }).index("by_tenant", ["tenantId"]),

  stockItems: defineTable({
    tenantId,
    name: v.string(),
    baseUnit,
    purchaseUnit: v.optional(v.object({ name: v.string(), factor: v.number() })),
    onHand: v.number(),              // base units, cache of the ledger
    avgCost: v.number(),             // minor units per base unit (can be fractional)
    reorderPoint: v.number(),
    supplierId: v.optional(v.id("suppliers")),
    lastReceivedAt: v.optional(v.number()), // once set, avgCost only changes by receiving stock
  }).index("by_tenant", ["tenantId"]),

  recipeLines: defineTable({
    tenantId,
    productId: v.id("products"),
    stockItemId: v.id("stockItems"),
    qty: v.number(),                 // base units per 1 product sold
  })
    .index("by_tenant_product", ["tenantId", "productId"])
    .index("by_tenant_stock_item", ["tenantId", "stockItemId"]),

  stockMovements: defineTable({
    tenantId,
    stockItemId: v.id("stockItems"),
    type: v.union(v.literal("receive"), v.literal("sale"), v.literal("refund"),
      v.literal("adjust"), v.literal("waste")),
    qty: v.number(),                 // positive in, negative out
    unitCost: v.number(),
    saleId: v.optional(v.id("sales")),
    memberId: v.id("members"),
    note: v.optional(v.string()),
  }).index("by_tenant_item", ["tenantId", "stockItemId"]),

  suppliers: defineTable({ tenantId, name: v.string(), phone: v.optional(v.string()) })
    .index("by_tenant", ["tenantId"]),

  shifts: defineTable({
    tenantId,
    memberId: v.id("members"),
    status: v.union(v.literal("open"), v.literal("closed")),
    openingCash: money,
    expectedCash: v.optional(money),
    countedCash: v.optional(money),
    closedAt: v.optional(v.number()),
  }).index("by_tenant_status", ["tenantId", "status"]),

  sales: defineTable({
    tenantId,
    number: v.number(),              // sequential per tenant, never reset
    clientRef: v.string(),           // idempotency key generated on the device
    shiftId: v.id("shifts"),
    memberId: v.id("members"),
    businessDate: v.string(),        // "2026-09-11" in the shop's timezone
    lines: v.array(v.object({
      productId: v.id("products"),
      name: v.string(),
      optionNames: v.array(v.string()),
      qty: v.number(),
      unitPrice: money,
      unitCost: money,               // snapshot at checkout
      discount: money,
    })),
    subtotal: money, discount: money, tax: money, total: money, cogs: money,
    payments: v.array(v.object({ method: payMethod, amount: money, ref: v.optional(v.string()) })),
    changeGiven: money,
    status: v.union(v.literal("completed"), v.literal("voided"), v.literal("refunded")),
    receiptToken: v.string(),        // unguessable, for the public receipt link
  })
    .index("by_tenant_date", ["tenantId", "businessDate"])
    .index("by_tenant_clientRef", ["tenantId", "clientRef"])
    .index("by_receipt_token", ["receiptToken"]),

  dailyStats: defineTable({
    tenantId,
    businessDate: v.string(),
    revenue: money, cogs: money, orders: v.number(),
    cash: money, ewallet: money, card: money,
    byHour: v.array(v.number()),     // 24 revenue buckets
  }).index("by_tenant_date", ["tenantId", "businessDate"]),

  productDailyStats: defineTable({
    tenantId,
    businessDate: v.string(),
    productId: v.id("products"),
    qty: v.number(), revenue: money, cogs: money,
  }).index("by_tenant_date_product", ["tenantId", "businessDate", "productId"]),

  exports: defineTable({
    tenantId,
    requestedBy: v.id("members"),
    dataset: v.union(v.literal("products"), v.literal("stockItems"), v.literal("stockMovements"),
      v.literal("sales"), v.literal("saleLines"), v.literal("shifts"),
      v.literal("dailySummary"), v.literal("productPerformance"), v.literal("fullBackup")),
    from: v.optional(v.string()),    // business dates, for date-ranged datasets
    to: v.optional(v.string()),
    status: v.union(v.literal("working"), v.literal("ready"), v.literal("failed")),
    fileId: v.optional(v.id("_storage")),
    rowCount: v.optional(v.number()),
    error: v.optional(v.string()),
    expiresAt: v.optional(v.number()), // file deleted by a daily cron after 7 days
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_expires", ["expiresAt"]),

  counters: defineTable({ tenantId, name: v.string(), value: v.number() })
    .index("by_tenant_name", ["tenantId", "name"]),
});
