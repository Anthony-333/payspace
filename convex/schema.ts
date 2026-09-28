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
    // The shop's Pro subscription, copied from Polar webhooks (convex/billing.ts) so every
    // plan check reads the tenant it already has. Absent: never started billing.
    billing: v.optional(v.object({
      /** The owner's Polar customer; an owner's shops share it. */
      polarCustomerId: v.string(),
      /** Set once any subscription has existed, so a shop gets one free trial. */
      trialUsed: v.boolean(),
      subscription: v.optional(v.object({
        id: v.string(),
        status: v.string(),               // Polar's: active, trialing, past_due, canceled, …
        currentPeriodEnd: v.optional(v.number()), // ms
        trialEnd: v.optional(v.number()),         // ms
        /** ms. Set when the subscription is cancelled but runs until this date. */
        cancelAt: v.optional(v.number()),
        /** The webhook's timestamp (ms) of the last applied update; older events are ignored. */
        eventAt: v.number(),
      })),
    })),
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
    .index("by_tenant_image", ["tenantId", "imageId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["tenantId", "isActive"] }),

  // Which shop uploaded each photo, so one shop can never use another's file. A payment photo
  // also records its sale, so the cleanup job keeps it for as long as the sale exists.
  uploads: defineTable({ tenantId, storageId: v.id("_storage"), saleId: v.optional(v.id("sales")) })
    .index("by_tenant_storage", ["tenantId", "storageId"])
    .index("by_storage", ["storageId"]), // global: a file belongs to one shop; used by the cleanup job

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
    payments: v.array(v.object({
      method: payMethod,
      amount: money,
      ref: v.optional(v.string()),
      photoId: v.optional(v.id("_storage")), // proof of payment: staff only, never on the public receipt
    })),
    changeGiven: money,
    status: v.union(v.literal("completed"), v.literal("voided"), v.literal("refunded")),
    receiptToken: v.string(),        // unguessable, for the public receipt link
  })
    .index("by_tenant_date", ["tenantId", "businessDate"])
    .index("by_tenant_clientRef", ["tenantId", "clientRef"])
    .index("by_tenant_number", ["tenantId", "number"])
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

  // Loyalty cards (convex/loyalty.ts). One program per shop; a customer signs in to their card
  // at /loyalty/[shop]/[username] with the username and password staff gave them.
  loyaltyPrograms: defineTable({
    tenantId,
    name: v.string(),                // "Coffee card"
    stampsRequired: v.number(),      // stamps to fill a card
    reward: v.string(),              // "A free drink of your choice"
    terms: v.optional(v.string()),
    color: v.string(),               // one of LOYALTY_COLORS
    isActive: v.boolean(),           // off: no new cards or stamps; customers can still look
  }).index("by_tenant", ["tenantId"]),

  loyaltyCards: defineTable({
    tenantId,
    name: v.string(),                // the customer, as staff know them
    username: v.string(),            // lowercase, unique per shop
    passwordHash: v.string(),        // "pbkdf2-sha256$<iterations>$<salt>$<hash>"
    status: v.union(v.literal("active"), v.literal("archived")),
    round: v.number(),               // 1 for the first card, +1 after each reward
    stamps: v.number(),              // stamps on the current round
    stampsRequired: v.number(),      // copied from the program when the round starts
    failedLogins: v.number(),
    lockedUntil: v.optional(v.number()),
    createdBy: v.id("members"),
  })
    .index("by_tenant_username", ["tenantId", "username"])
    .index("by_tenant_status", ["tenantId", "status"]),

  // The card's ledger: every stamp and every reward, with who gave it and their signature.
  loyaltyStamps: defineTable({
    tenantId,
    cardId: v.id("loyaltyCards"),
    kind: v.union(v.literal("stamp"), v.literal("redeem")),
    round: v.number(),
    saleId: v.optional(v.id("sales")), // every stamp has one; a sale earns one stamp
    saleNumber: v.optional(v.number()),
    memberId: v.id("members"),
    memberName: v.string(),          // snapshots, so the log stays true if staff change
    memberRole: role,
    signature: v.array(v.array(v.number())), // strokes of [x, y, width, ...] (convex/lib/signature.ts)
    note: v.optional(v.string()),
  })
    .index("by_tenant_card", ["tenantId", "cardId"])
    .index("by_tenant_sale", ["tenantId", "saleId"]),

  loyaltySessions: defineTable({
    tenantId,
    cardId: v.id("loyaltyCards"),
    tokenHash: v.string(),           // SHA-256 of the token; the token itself is never stored
    expiresAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"]) // global: the token is the key, like a receipt
    .index("by_tenant_card", ["tenantId", "cardId"])
    .index("by_expires", ["expiresAt"]),
});
