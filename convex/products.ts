import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { productKind } from "./schema";
import { checkImportRow, LIMITS, optionalText } from "./lib/catalog";
import { assertMoney, roundMinor } from "./lib/money";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, insertProduct, prepareProduct, toClientProduct } from "./lib/products";
import { prepareRecipe, refreshProductCost, scheduleCostRefresh, writeRecipe } from "./lib/stock";
import { getOwned, requireRole, tenantMutation, tenantQuery } from "./lib/tenant";

const productFields = {
  name: v.string(),
  categoryId: v.optional(v.id("categories")),
  price: v.number(),
  barcode: v.optional(v.string()),
  sku: v.optional(v.string()),
  imageId: v.optional(v.id("_storage")),
  modifierGroupIds: v.array(v.id("modifierGroups")),
  /** Stocked: cost per piece, until the first delivery. Service: fixed cost. Ignored for recipes. */
  cost: v.optional(v.number()),
  /** Recipe products only: replaces the ingredient lines, in base units per product sold. */
  recipe: v.optional(v.array(v.object({ stockItemId: v.id("stockItems"), qty: v.number() }))),
};

/** A page of products, newest first, optionally for one category. Archived products are a separate list. */
export const list = tenantQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    archived: v.optional(v.boolean()),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, { paginationOpts, archived, categoryId }) => {
    const isActive = !archived;
    const result = categoryId === undefined
      ? await ctx.db
        .query("products")
        .withIndex("by_tenant_active", (q) => q.eq("tenantId", ctx.tenantId).eq("isActive", isActive))
        .order("desc")
        .paginate(paginationOpts)
      : await ctx.db
        .query("products")
        .withIndex("by_tenant_active_category", (q) =>
          q.eq("tenantId", ctx.tenantId).eq("isActive", isActive).eq("categoryId", categoryId))
        .order("desc")
        .paginate(paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((p) => toClientProduct(ctx, p))) };
  },
});

/** Name search, with an exact barcode match (a scan) listed first. */
export const search = tenantQuery({
  args: { term: v.string(), archived: v.optional(v.boolean()) },
  handler: async (ctx, { term, archived }) => {
    const text = term.trim().slice(0, 100);
    if (!text) return [];
    const isActive = !archived;
    const [byName, byBarcode] = await Promise.all([
      ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) =>
          q.search("name", text).eq("tenantId", ctx.tenantId).eq("isActive", isActive))
        .take(50),
      ctx.db
        .query("products")
        .withIndex("by_tenant_barcode", (q) => q.eq("tenantId", ctx.tenantId).eq("barcode", text))
        .first(),
    ]);
    const results = byBarcode?.isActive === isActive
      ? [byBarcode, ...byName.filter((p) => p._id !== byBarcode._id)]
      : byName;
    return Promise.all(results.map((p) => toClientProduct(ctx, p)));
  },
});

/** Everything the POS screen sells: active products with photos, never costs. Any member may call it. */
export const forSale = tenantQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_tenant_active", (q) => q.eq("tenantId", ctx.tenantId).eq("isActive", true))
      .take(2000);
    return Promise.all(products.map(async (p) => ({
      _id: p._id,
      name: p.name,
      kind: p.kind,
      price: p.price,
      categoryId: p.categoryId,
      barcode: p.barcode,
      modifierGroupIds: p.modifierGroupIds,
      imageUrl: p.imageId ? await ctx.storage.getUrl(p.imageId) : null,
    })));
  },
});

export const get = tenantQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => toClientProduct(ctx, await getOwned(ctx, ctx.tenantId, productId)),
});

/** A short-lived URL the browser POSTs a (resized) product photo to. */
export const generateUploadUrl = tenantMutation({
  args: {},
  handler: async (ctx) => {
    requireRole(ctx.member, "owner", "manager");
    return ctx.storage.generateUploadUrl();
  },
});

/**
 * Claims an uploaded photo for this shop, after checking it's a small JPEG, PNG or WebP.
 * Products only accept claimed photos, and a file can belong to one shop only.
 */
export const claimUpload = tenantMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    requireRole(ctx.member, "owner", "manager");
    const claim = await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first();
    if (claim) {
      if (claim.tenantId !== ctx.tenantId) throw new ConvexError("Not found.");
      return;
    }
    const file = await ctx.db.system.get("_storage", storageId);
    if (!file) throw new ConvexError("The photo didn't upload. Try again.");
    if (!file.contentType || !IMAGE_TYPES.has(file.contentType) || file.size > MAX_IMAGE_BYTES) {
      throw new ConvexError("Use a JPEG, PNG or WebP photo under 1 MB.");
    }
    await ctx.db.insert("uploads", { tenantId: ctx.tenantId, storageId });
  },
});

export const create = tenantMutation({
  args: { ...productFields, kind: productKind },
  handler: async (ctx, { kind, cost, recipe, ...input }) => {
    requireRole(ctx.member, "owner", "manager");
    const fields = await prepareProduct(ctx, input);
    if (kind !== "recipe") return insertProduct(ctx, kind, fields, cost);

    const lines = await prepareRecipe(ctx, recipe ?? []);
    const productId = await insertProduct(ctx, kind, fields, undefined);
    await writeRecipe(ctx, productId, lines);
    await refreshProductCost(ctx, ctx.tenant, (await ctx.db.get(productId))!);
    return productId;
  },
});

export const update = tenantMutation({
  args: { productId: v.id("products"), ...productFields },
  handler: async (ctx, { productId, cost, recipe, ...input }) => {
    requireRole(ctx.member, "owner", "manager");
    const product = await getOwned(ctx, ctx.tenantId, productId);
    const fields = await prepareProduct(ctx, input, product);
    if (cost !== undefined) assertMoney("Cost", cost);
    if (recipe !== undefined && product.kind !== "recipe") {
      throw new ConvexError("Only products made from ingredients have a recipe.");
    }

    let unitCost = product.unitCost;
    if (product.kind === "stocked" && product.stockItemId) {
      const item = await getOwned(ctx, ctx.tenantId, product.stockItemId);
      // Before the first delivery, the cost typed on the product is the stock item's cost.
      // After that, receiving sets it (docs/progress.md decisions, 2026-09-14).
      const costChanged = cost !== undefined && cost !== roundMinor(item.avgCost);
      if (costChanged && item.lastReceivedAt !== undefined) {
        throw new ConvexError("This product's cost comes from the stock you receive. Receive a delivery to update it.");
      }
      // Keep the linked stock item's name in step unless someone renamed it on purpose.
      await ctx.db.patch(item._id, {
        ...(item.name === product.name && { name: fields.name }),
        ...(costChanged && { avgCost: cost }),
      });
      if (costChanged) await scheduleCostRefresh(ctx, ctx.tenantId, [item._id]);
    } else if (product.kind === "service" && cost !== undefined) {
      unitCost = cost;
    }
    if (recipe !== undefined) await writeRecipe(ctx, productId, await prepareRecipe(ctx, recipe));

    // Optional fields that come back empty are cleared.
    await ctx.db.patch(productId, { ...fields, unitCost });
    await refreshProductCost(ctx, ctx.tenant, (await ctx.db.get(productId))!);
  },
});

/** Archive instead of delete: past sales reference products (CLAUDE.md rule 9). */
export const setArchived = tenantMutation({
  args: { productId: v.id("products"), archived: v.boolean() },
  handler: async (ctx, { productId, archived }) => {
    requireRole(ctx.member, "owner", "manager");
    await getOwned(ctx, ctx.tenantId, productId);
    await ctx.db.patch(productId, { isActive: !archived });
  },
});

/**
 * One batch of a CSV import. Every row is checked again here; a bad row is reported and
 * skipped, so it never blocks the good ones. Categories are matched by name or created.
 */
export const importBatch = tenantMutation({
  args: {
    rows: v.array(v.object({
      row: v.number(),
      name: v.string(),
      category: v.optional(v.string()),
      price: v.number(),
      cost: v.optional(v.number()),
      barcode: v.optional(v.string()),
      sku: v.optional(v.string()),
      kind: v.union(v.literal("stocked"), v.literal("service")),
    })),
  },
  handler: async (ctx, { rows }) => {
    requireRole(ctx.member, "owner", "manager");
    if (rows.length > LIMITS.importBatch) {
      throw new ConvexError(`Import at most ${LIMITS.importBatch} rows at a time.`);
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId))
      .take(1000);
    const categoryIds = new Map(categories.map((c) => [c.name.toLowerCase(), c._id]));
    let sortOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder), 0);

    const errors: { row: number; message: string }[] = [];
    let created = 0;
    for (const { row, cost, category, ...raw } of rows) {
      const problems = checkImportRow({ ...raw, cost, category });
      if (problems.length) {
        errors.push({ row, message: problems.join(" ") });
        continue;
      }
      let fields;
      try {
        fields = await prepareProduct(ctx, { ...raw, modifierGroupIds: [] });
      } catch (err) {
        if (!(err instanceof ConvexError)) throw err;
        errors.push({ row, message: String(err.data) });
        continue;
      }

      const categoryName = optionalText(category);
      if (categoryName !== undefined) {
        let categoryId = categoryIds.get(categoryName.toLowerCase());
        if (!categoryId) {
          categoryId = await ctx.db.insert("categories", {
            tenantId: ctx.tenantId, name: categoryName, sortOrder: ++sortOrder,
          });
          categoryIds.set(categoryName.toLowerCase(), categoryId);
        }
        fields.categoryId = categoryId;
      }
      await insertProduct(ctx, raw.kind, fields, cost);
      created++;
    }
    return { created, errors };
  },
});

