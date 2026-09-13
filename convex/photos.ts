import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { IMAGE_TYPES } from "./lib/products";

// Product photos that were replaced, removed, or uploaded but never saved stay in file storage.
// A daily job (convex/crons.ts) deletes them once they're a day old.

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE = 100;

/**
 * Walks file storage one page at a time. A claimed photo (see products.claimUpload) is deleted
 * when no product in its shop uses it, archived products included. An unclaimed file is deleted
 * only if it's an image, so files other features store (exports, later) are never touched.
 */
export const cleanup = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const cutoff = Date.now() - DAY_MS;
    const page = await ctx.db.system.query("_storage").paginate({ numItems: PAGE, cursor });
    let deleted = 0;
    for (const file of page.page) {
      if (file._creationTime > cutoff) continue;
      const claim = await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", file._id)).first();
      if (claim) {
        const used = await ctx.db
          .query("products")
          .withIndex("by_tenant_image", (q) => q.eq("tenantId", claim.tenantId).eq("imageId", file._id))
          .first();
        if (used) continue;
        await ctx.db.delete(claim._id);
      } else if (!file.contentType || !IMAGE_TYPES.has(file.contentType)) {
        continue;
      }
      await ctx.storage.delete(file._id);
      deleted++;
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.photos.cleanup, { cursor: page.continueCursor });
    }
    return { deleted };
  },
});

/**
 * One-off: claims the photos products already use, for data saved before the uploads table
 * existed. Safe to run again. `npx convex run photos:claimExisting '{"cursor": null}'`
 */
export const claimExisting = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("products").paginate({ numItems: PAGE, cursor });
    let claimed = 0;
    for (const product of page.page) {
      const storageId = product.imageId;
      if (!storageId) continue;
      const claim = await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first();
      if (claim) continue;
      await ctx.db.insert("uploads", { tenantId: product.tenantId, storageId });
      claimed++;
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.photos.claimExisting, { cursor: page.continueCursor });
    }
    return { claimed };
  },
});
