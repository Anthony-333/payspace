import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const page = { numItems: 500, cursor: null };

async function setup(businessType: "cafe" | "grocery" | "bakery" | "retail" = "cafe") {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "user_owner", name: "Owner" });
  const { tenantId } = await owner.mutation(api.tenants.create, { name: "Test shop", slug: "testshop", businessType });
  const as = async (userId: string, role: "manager" | "cashier") => {
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId, name: userId, role, status: "active" }));
    return t.withIdentity({ subject: userId, name: userId });
  };
  return { t, owner, tenantId, as };
}

const soda = { name: "Soda", price: 4500, modifierGroupIds: [], kind: "stocked" as const };

describe("products", () => {
  test("a stocked product gets its own stock item with the typed cost", async () => {
    const { t, owner, tenantId } = await setup("grocery");
    const productId = await owner.mutation(api.products.create, { tenantId, ...soda, cost: 3500, barcode: " 4800 " });
    const product = await owner.query(api.products.get, { tenantId, productId });
    expect(product).toMatchObject({ name: "Soda", unitCost: 3500, barcode: "4800", isActive: true });
    const item = await t.run((ctx) => ctx.db.get(product.stockItemId!));
    expect(item).toMatchObject({ name: "Soda", baseUnit: "pc", onHand: 0, avgCost: 3500 });

    await owner.mutation(api.products.update, {
      tenantId, productId, name: "Cola 330 ml", price: 5000, modifierGroupIds: [], cost: 3600,
    });
    expect(await t.run((ctx) => ctx.db.get(product.stockItemId!))).toMatchObject({ name: "Cola 330 ml", avgCost: 3600 });
    const updated = await owner.query(api.products.get, { tenantId, productId });
    expect(updated).toMatchObject({ price: 5000, unitCost: 3600 });
    expect(updated.barcode).toBeUndefined(); // an empty optional field is cleared
  });

  test("barcodes are unique within a shop, including archived products, but not across shops", async () => {
    const { t, owner, tenantId } = await setup("grocery");
    const first = await owner.mutation(api.products.create, { tenantId, ...soda, barcode: "123" });
    await owner.mutation(api.products.setArchived, { tenantId, productId: first, archived: true });
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, name: "Other", barcode: "123" }))
      .rejects.toThrow(/already used by “Soda” \(archived\)/);
    // Saving the same product with its own barcode is fine.
    await owner.mutation(api.products.update, { tenantId, productId: first, name: "Soda", price: 1, barcode: "123", modifierGroupIds: [] });

    const other = t.withIdentity({ subject: "user_other" });
    const shop2 = await other.mutation(api.tenants.create, { name: "Other shop", slug: "othershop", businessType: "grocery" });
    await other.mutation(api.products.create, { tenantId: shop2.tenantId, ...soda, barcode: "123" });
  });

  test("lists by status and category, and searches by name or barcode", async () => {
    const { owner, tenantId } = await setup("grocery");
    const drinks = await owner.mutation(api.categories.create, { tenantId, name: "Drinks" });
    const cola = await owner.mutation(api.products.create, { tenantId, ...soda, name: "Cola", categoryId: drinks, barcode: "999" });
    await owner.mutation(api.products.create, { tenantId, ...soda, name: "Chips" });
    const old = await owner.mutation(api.products.create, { tenantId, ...soda, name: "Old cola" });
    await owner.mutation(api.products.setArchived, { tenantId, productId: old, archived: true });

    const names = (r: { page: { name: string }[] }) => r.page.map((p) => p.name).sort();
    expect(names(await owner.query(api.products.list, { tenantId, paginationOpts: page }))).toEqual(["Chips", "Cola"]);
    expect(names(await owner.query(api.products.list, { tenantId, paginationOpts: page, archived: true }))).toEqual(["Old cola"]);
    expect(names(await owner.query(api.products.list, { tenantId, paginationOpts: page, categoryId: drinks }))).toEqual(["Cola"]);

    expect((await owner.query(api.products.search, { tenantId, term: "999" }))[0]._id).toBe(cola);
    expect((await owner.query(api.products.search, { tenantId, term: "cola" })).map((p) => p.name)).toEqual(["Cola"]);
    await expect(owner.mutation(api.categories.remove, { tenantId, categoryId: drinks })).rejects.toThrow(/still has products/);
  });

  test("cashiers can read products without costs but can't change them", async () => {
    const { owner, tenantId, as } = await setup("grocery");
    const productId = await owner.mutation(api.products.create, { tenantId, ...soda, cost: 3000 });
    const cashier = await as("user_cashier", "cashier");
    expect(await cashier.query(api.products.get, { tenantId, productId })).toMatchObject({ name: "Soda", unitCost: null });
    const listed = await cashier.query(api.products.list, { tenantId, paginationOpts: page });
    expect(listed.page[0].unitCost).toBeNull();
    const [forSale] = await cashier.query(api.products.forSale, { tenantId });
    expect(forSale).toMatchObject({ name: "Soda", price: 4500 });
    expect(forSale).not.toHaveProperty("unitCost");
    await expect(cashier.mutation(api.products.create, { tenantId, ...soda })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.products.setArchived, { tenantId, productId, archived: true })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.products.generateUploadUrl, { tenantId })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.products.importBatch, { tenantId, rows: [] })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.templates.apply, { tenantId })).rejects.toThrow(/role/);

    const manager = await as("user_manager", "manager");
    await manager.mutation(api.products.create, { tenantId, ...soda, name: "Manager soda" });
  });

  test("validates price, name and photo", async () => {
    const { t, owner, tenantId } = await setup("grocery");
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, price: 12.5 })).rejects.toThrow(/Price/);
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, price: -1 })).rejects.toThrow(/Price/);
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, name: "  " })).rejects.toThrow(/name/);

    // convex-test doesn't record a file's content type, so only the refusal can be tested here;
    // an accepted upload is checked in the browser.
    const text = await t.run((ctx) => ctx.storage.store(new Blob(["hello"], { type: "text/plain" })));
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, imageId: text })).rejects.toThrow(/photo/);
    await expect(owner.mutation(api.products.claimUpload, { tenantId, storageId: text })).rejects.toThrow(/JPEG, PNG or WebP/);
  });
});

describe("photos", () => {
  // convex-test doesn't record content types, so a claim that passes the type check is written directly.
  const storePhoto = (t: Awaited<ReturnType<typeof setup>>["t"]) =>
    t.run((ctx) => ctx.storage.store(new Blob(["png"], { type: "image/png" })));

  test("a product only takes a photo its own shop claimed", async () => {
    const { t, owner, tenantId } = await setup("grocery");
    const photo = await storePhoto(t);
    await expect(owner.mutation(api.products.create, { tenantId, ...soda, imageId: photo })).rejects.toThrow(/didn't upload/);
    await t.run((ctx) => ctx.db.insert("uploads", { tenantId, storageId: photo }));
    await owner.mutation(api.products.claimUpload, { tenantId, storageId: photo }); // already ours: fine
    const productId = await owner.mutation(api.products.create, { tenantId, ...soda, imageId: photo });
    expect((await owner.query(api.products.get, { tenantId, productId })).imageUrl).toBeTruthy();

    const other = t.withIdentity({ subject: "user_other" });
    const shop2 = await other.mutation(api.tenants.create, { name: "Other shop", slug: "othershop", businessType: "grocery" });
    await expect(other.mutation(api.products.claimUpload, { tenantId: shop2.tenantId, storageId: photo })).rejects.toThrow(/Not found/);
    await expect(other.mutation(api.products.create, { tenantId: shop2.tenantId, ...soda, imageId: photo })).rejects.toThrow(/didn't upload/);
  });

  test("the daily cleanup deletes photos no product uses once they're a day old", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-01T00:00:00Z"));
      const { t, owner, tenantId } = await setup("grocery");
      const used = await storePhoto(t);
      const replaced = await storePhoto(t);
      const loose = await storePhoto(t); // uploaded, never claimed or saved
      const other = await t.run((ctx) => ctx.storage.store(new Blob(["id,name"]))); // not a photo: e.g. an export
      await t.run(async (ctx) => {
        await ctx.db.insert("uploads", { tenantId, storageId: used });
        await ctx.db.insert("uploads", { tenantId, storageId: replaced });
      });
      const productId = await owner.mutation(api.products.create, { tenantId, ...soda, imageId: replaced });
      await owner.mutation(api.products.update, { tenantId, productId, name: "Soda", price: 4500, modifierGroupIds: [], imageId: used });
      await owner.mutation(api.products.setArchived, { tenantId, productId, archived: true }); // archived still counts

      vi.setSystemTime(new Date("2026-09-02T01:00:00Z"));
      const fresh = await storePhoto(t);
      await t.run((ctx) => ctx.db.insert("uploads", { tenantId, storageId: fresh }));

      await t.mutation(internal.photos.cleanup, { cursor: null });
      const exists = (id: Id<"_storage">) => t.run(async (ctx) => (await ctx.db.system.get("_storage", id)) !== null);
      expect(await exists(used)).toBe(true);
      expect(await exists(replaced)).toBe(false);
      expect(await exists(fresh)).toBe(true);
      expect(await exists(other)).toBe(true);
      // convex-test has no content type for `loose`, so it's kept like any unknown file.
      expect(await exists(loose)).toBe(true);
      const claims = await t.run((ctx) => ctx.db.query("uploads").collect());
      expect(claims.map((c) => c.storageId).sort()).toEqual([used, fresh].sort());
    } finally {
      vi.useRealTimers();
    }
  });

  test("existing product photos can be claimed after the fact", async () => {
    const { t, tenantId } = await setup("grocery");
    const photo = await storePhoto(t);
    await t.run((ctx) => ctx.db.insert("products", {
      tenantId, name: "Old", kind: "service", price: 100, unitCost: 0, imageId: photo, modifierGroupIds: [], isActive: true,
    }));
    await t.mutation(internal.photos.claimExisting, { cursor: null });
    await t.mutation(internal.photos.claimExisting, { cursor: null }); // running twice is harmless
    expect(await t.run((ctx) => ctx.db.query("uploads").collect())).toMatchObject([{ tenantId, storageId: photo }]);
  });
});

describe("modifier groups", () => {
  test("generates stable option keys and validates selection limits", async () => {
    const { owner, tenantId } = await setup("retail");
    const groupId = await owner.mutation(api.modifiers.create, {
      tenantId, name: "Size", minSelect: 1, maxSelect: 1,
      options: [
        { name: "Small", priceDelta: -1000, recipeDelta: [] },
        { name: "Large", priceDelta: 2000, recipeDelta: [] },
        { name: "Large", priceDelta: 3000, recipeDelta: [] },
      ],
    });
    const [group] = await owner.query(api.modifiers.list, { tenantId });
    expect(group.options.map((o) => o.key)).toEqual(["small", "large", "large-2"]);

    // Renaming keeps the key; a new option gets a fresh one.
    await owner.mutation(api.modifiers.update, {
      tenantId, modifierGroupId: groupId, name: "Size", minSelect: 1, maxSelect: 1,
      options: [
        { key: "small", name: "Petite", priceDelta: 0, recipeDelta: [] },
        { key: "large", name: "Large", priceDelta: 2000, recipeDelta: [] },
        { name: "Small", priceDelta: 0, recipeDelta: [] },
      ],
    });
    const [updated] = await owner.query(api.modifiers.list, { tenantId });
    expect(updated.options.map((o) => [o.key, o.name])).toEqual([["small", "Petite"], ["large", "Large"], ["small-2", "Small"]]);

    await expect(owner.mutation(api.modifiers.create, {
      tenantId, name: "Bad", minSelect: 2, maxSelect: 1, options: [{ name: "A", priceDelta: 0, recipeDelta: [] }],
    })).rejects.toThrow(/minimum and maximum/);
  });

  test("a deleted group is dropped from products when they're next saved", async () => {
    const { owner, tenantId } = await setup("retail");
    const groupId = await owner.mutation(api.modifiers.create, {
      tenantId, name: "Wrap", minSelect: 0, maxSelect: 1, options: [{ name: "Gift wrap", priceDelta: 5000, recipeDelta: [] }],
    });
    const productId = await owner.mutation(api.products.create, {
      tenantId, name: "Mug", price: 25000, kind: "service", modifierGroupIds: [groupId],
    });
    await owner.mutation(api.modifiers.remove, { tenantId, modifierGroupId: groupId });
    await owner.mutation(api.products.update, { tenantId, productId, name: "Mug", price: 25000, modifierGroupIds: [groupId] });
    expect((await owner.query(api.products.get, { tenantId, productId })).modifierGroupIds).toEqual([]);
  });
});

describe("templates", () => {
  test("the café template creates 20 drinks with sizes, recipes and costs", async () => {
    const { t, owner, tenantId } = await setup("cafe");
    expect(await owner.query(api.templates.available, { tenantId })).toMatchObject({ products: 20 });
    await owner.mutation(api.templates.apply, { tenantId });

    const { page: products } = await owner.query(api.products.list, { tenantId, paginationOpts: page });
    expect(products).toHaveLength(20);
    const groups = await owner.query(api.modifiers.list, { tenantId });
    const sizeIds = new Set(groups.filter((g) => g.name.startsWith("Size")).map((g) => g._id));
    const withSize = products.filter((p) => p.modifierGroupIds.some((id) => sizeIds.has(id)));
    expect(withSize.length).toBeGreaterThanOrEqual(19); // every drink but the espresso

    // Iced latte: 18 g beans × ₱1.20 + 180 ml milk × ₱0.11 + 150 g ice × ₱0.01 + cup ₱7.50 = ₱50.40
    const icedLatte = products.find((p) => p.name === "Iced latte")!;
    expect(icedLatte.unitCost).toBe(5040);
    const lines = await t.run((ctx) =>
      ctx.db.query("recipeLines")
        .withIndex("by_tenant_product", (q) => q.eq("tenantId", tenantId).eq("productId", icedLatte._id))
        .collect());
    expect(lines).toHaveLength(4);

    const large = groups.find((g) => g.name === "Size (milk drinks)")!.options.find((o) => o.key === "large")!;
    expect(large).toMatchObject({ priceDelta: 2000, recipeDelta: [{ qty: 60 }] });

    expect(await owner.query(api.templates.available, { tenantId })).toBeNull();
    await expect(owner.mutation(api.templates.apply, { tenantId })).rejects.toThrow(/empty catalog/);
  });

  test("bakery and grocery templates load; retail has none", async () => {
    for (const type of ["bakery", "grocery"] as const) {
      const { owner, tenantId } = await setup(type);
      const { products } = await owner.mutation(api.templates.apply, { tenantId });
      const listed = await owner.query(api.products.list, { tenantId, paginationOpts: page });
      expect(listed.page).toHaveLength(products);
      expect(listed.page.every((p) => (p.unitCost ?? 0) > 0)).toBe(true);
    }
    const { owner, tenantId } = await setup("retail");
    expect(await owner.query(api.templates.available, { tenantId })).toBeNull();
    await expect(owner.mutation(api.templates.apply, { tenantId })).rejects.toThrow(/no starter menu/);
  });
});

describe("CSV import", () => {
  test("300 rows import in batches, bad rows are reported and skipped", async () => {
    const { owner, tenantId } = await setup("grocery");
    const rows = Array.from({ length: 300 }, (_, i) => ({
      row: i + 2,
      name: `Item ${i + 1}`,
      price: 1000 + i,
      cost: 700,
      barcode: `48000${i}`,
      category: i % 2 ? "Snacks" : "Drinks",
      kind: "stocked" as const,
    }));
    rows[10].barcode = rows[9].barcode;        // duplicate barcode within the file
    rows[20].price = 12.34;                    // not whole centavos
    rows[30].name = "";                        // missing name

    const errors: { row: number; message: string }[] = [];
    let created = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const result = await owner.mutation(api.products.importBatch, { tenantId, rows: rows.slice(i, i + 100) });
      created += result.created;
      errors.push(...result.errors);
    }
    expect(created).toBe(297);
    expect(errors.map((e) => e.row)).toEqual([12, 22, 32]);
    expect(errors[0].message).toMatch(/already used by “Item 10”/);

    const categories = await owner.query(api.categories.list, { tenantId });
    expect(categories.map((c) => c.name).sort()).toEqual(["Drinks", "Snacks"]);
    const listed = await owner.query(api.products.list, { tenantId, paginationOpts: page });
    expect(listed.page).toHaveLength(297);

    await expect(owner.mutation(api.products.importBatch, { tenantId, rows: rows.concat(rows).slice(0, 101) }))
      .rejects.toThrow(/at most 100/);
  });
});

describe("categories", () => {
  test("reorder and delete when empty", async () => {
    const { owner, tenantId } = await setup("retail");
    const ids: Id<"categories">[] = [];
    for (const name of ["A", "B", "C"]) ids.push(await owner.mutation(api.categories.create, { tenantId, name }));
    await owner.mutation(api.categories.move, { tenantId, categoryId: ids[2], direction: "up" });
    await owner.mutation(api.categories.move, { tenantId, categoryId: ids[0], direction: "up" }); // already first
    expect((await owner.query(api.categories.list, { tenantId })).map((c) => c.name)).toEqual(["A", "C", "B"]);
    await owner.mutation(api.categories.remove, { tenantId, categoryId: ids[1] });
    expect((await owner.query(api.categories.list, { tenantId })).map((c) => c.name)).toEqual(["A", "C"]);
  });
});
