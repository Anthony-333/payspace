import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { checkBarcode, checkProductName, checkSku, optionalText } from "./catalog";
import { isBelowTarget } from "./costing";
import { assertMoney } from "./money";
import { getOwned, type TenantMutationCtx, type TenantQueryCtx } from "./tenant";

export const MAX_IMAGE_BYTES = 1024 * 1024;
// Raster formats only: an SVG could carry script if its storage URL were opened directly.
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_MODIFIER_GROUPS = 10;

export type ProductInput = {
  name: string;
  categoryId?: Id<"categories">;
  price: number;
  barcode?: string;
  sku?: string;
  imageId?: Id<"_storage">;
  modifierGroupIds: Id<"modifierGroups">[];
};

function fail(message: string | null) {
  if (message) throw new ConvexError(message);
}

/** Throws unless the barcode is free in this shop. Archived products keep their barcodes. */
export async function assertBarcodeFree(ctx: TenantQueryCtx, barcode: string, exceptId?: Id<"products">) {
  const matches = await ctx.db
    .query("products")
    .withIndex("by_tenant_barcode", (q) => q.eq("tenantId", ctx.tenantId).eq("barcode", barcode))
    .take(2);
  const clash = matches.find((p) => p._id !== exceptId);
  if (clash) {
    throw new ConvexError(
      `Barcode ${barcode} is already used by “${clash.name}”${clash.isActive ? "" : " (archived)"}.`,
    );
  }
}

/**
 * Validates and cleans product fields, re-checking every client ID against the tenant.
 * Only reads, so a caller can catch its error and carry on (the CSV import does).
 */
export async function prepareProduct(ctx: TenantMutationCtx, input: ProductInput, existing?: Doc<"products">) {
  const name = input.name.trim();
  fail(checkProductName(name));
  assertMoney("Price", input.price);

  const barcode = optionalText(input.barcode);
  if (barcode !== undefined) {
    fail(checkBarcode(barcode));
    await assertBarcodeFree(ctx, barcode, existing?._id);
  }
  const sku = optionalText(input.sku);
  if (sku !== undefined) fail(checkSku(sku));

  if (input.categoryId !== undefined) await getOwned(ctx, ctx.tenantId, input.categoryId);

  const modifierGroupIds: Id<"modifierGroups">[] = [];
  for (const id of new Set(input.modifierGroupIds)) {
    // A deleted group is dropped quietly; a group from another shop is refused.
    const group = await ctx.db.get(id);
    if (!group) continue;
    if (group.tenantId !== ctx.tenantId) throw new ConvexError("Not found.");
    modifierGroupIds.push(id);
  }
  if (modifierGroupIds.length > MAX_MODIFIER_GROUPS) {
    throw new ConvexError(`A product can have up to ${MAX_MODIFIER_GROUPS} modifier groups.`);
  }

  if (input.imageId !== undefined && input.imageId !== existing?.imageId) {
    const file = await ctx.db.system.get("_storage", input.imageId);
    if (!file) throw new ConvexError("The photo didn't upload. Try again.");
    if (!file.contentType || !IMAGE_TYPES.has(file.contentType) || file.size > MAX_IMAGE_BYTES) {
      throw new ConvexError("Use a JPEG, PNG or WebP photo under 1 MB.");
    }
  }

  return { name, price: input.price, barcode, sku, categoryId: input.categoryId, imageId: input.imageId, modifierGroupIds };
}

/**
 * Inserts a product. A stocked product gets its own stock item (in pieces), so a grocer
 * never has to manage the two separately. `cost` is per piece for stocked items and the
 * fixed cost for services; recipe products are costed from their recipe lines.
 */
export async function insertProduct(
  ctx: TenantMutationCtx,
  kind: Doc<"products">["kind"],
  fields: Awaited<ReturnType<typeof prepareProduct>>,
  cost: number | undefined,
) {
  if (cost !== undefined) assertMoney("Cost", cost);
  const unitCost = kind === "recipe" ? 0 : (cost ?? 0);
  let stockItemId: Id<"stockItems"> | undefined;
  if (kind === "stocked") {
    stockItemId = await ctx.db.insert("stockItems", {
      tenantId: ctx.tenantId,
      name: fields.name,
      baseUnit: "pc",
      onHand: 0,
      avgCost: cost ?? 0,
      reorderPoint: 0,
    });
  }
  return ctx.db.insert("products", {
    tenantId: ctx.tenantId,
    ...fields,
    kind,
    stockItemId,
    unitCost,
    belowTargetMargin: isBelowTarget(fields.price, unitCost, ctx.tenant),
    isActive: true,
  });
}

export function canSeeCost(member: Doc<"members">) {
  return member.role === "owner" || member.role === "manager";
}

/** What the client sees: cost is hidden from cashiers, and the photo becomes a URL. */
export async function toClientProduct(ctx: TenantQueryCtx, product: Doc<"products">) {
  return {
    ...product,
    unitCost: canSeeCost(ctx.member) ? product.unitCost : null,
    belowTargetMargin: canSeeCost(ctx.member) ? product.belowTargetMargin === true : null,
    imageUrl: product.imageId ? await ctx.storage.getUrl(product.imageId) : null,
  };
}
