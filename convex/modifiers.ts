import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { assertMoney } from "./lib/money";
import { normalizeSlug } from "./lib/slugs";
import { getOwned, requireRole, tenantMutation, tenantQuery, type TenantMutationCtx } from "./lib/tenant";

// Modifier groups: Size, Milk, Add-ons. Each option changes the price and, optionally, the recipe
// (a large drink adds 60 ml of milk). Checkout receives option keys, so keys stay stable across edits.

const MAX_OPTIONS = 30;
const MAX_RECIPE_DELTAS = 20;
const KEY_PATTERN = /^[a-z0-9-]{1,40}$/;

const groupFields = {
  name: v.string(),
  minSelect: v.number(),
  maxSelect: v.number(),
  options: v.array(v.object({
    key: v.optional(v.string()),
    name: v.string(),
    priceDelta: v.number(),
    recipeDelta: v.array(v.object({ stockItemId: v.id("stockItems"), qty: v.number() })),
  })),
};

type GroupInput = {
  name: string;
  minSelect: number;
  maxSelect: number;
  options: {
    key?: string;
    name: string;
    priceDelta: number;
    recipeDelta: { stockItemId: Id<"stockItems">; qty: number }[];
  }[];
};

async function prepareGroup(ctx: TenantMutationCtx, input: GroupInput) {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 40) throw new ConvexError("Enter a group name up to 40 characters.");
  if (input.options.length < 1 || input.options.length > MAX_OPTIONS) {
    throw new ConvexError(`Add between 1 and ${MAX_OPTIONS} options.`);
  }
  const { minSelect, maxSelect } = input;
  if (!Number.isInteger(minSelect) || !Number.isInteger(maxSelect) || minSelect < 0 || maxSelect < 1
    || minSelect > maxSelect || maxSelect > input.options.length) {
    throw new ConvexError("Choose a minimum and maximum that fit the number of options.");
  }

  // Keep keys the client sent back; give new options a key made from their name.
  const used = new Set<string>();
  for (const option of input.options) {
    if (option.key !== undefined && KEY_PATTERN.test(option.key) && !used.has(option.key)) used.add(option.key);
  }
  const ownedItems = new Set<Id<"stockItems">>();
  const kept = new Set<string>();
  const options = [];
  for (const option of input.options) {
    const optionName = option.name.trim();
    if (optionName.length < 1 || optionName.length > 40) {
      throw new ConvexError("Enter an option name up to 40 characters.");
    }
    assertMoney(`The price change for “${optionName}”`, option.priceDelta, { allowNegative: true });
    if (option.recipeDelta.length > MAX_RECIPE_DELTAS) {
      throw new ConvexError(`An option can change up to ${MAX_RECIPE_DELTAS} ingredients.`);
    }
    for (const delta of option.recipeDelta) {
      if (!Number.isFinite(delta.qty) || delta.qty === 0 || Math.abs(delta.qty) > 1_000_000) {
        throw new ConvexError(`Check the ingredient amounts for “${optionName}”.`);
      }
      if (!ownedItems.has(delta.stockItemId)) {
        await getOwned(ctx, ctx.tenantId, delta.stockItemId);
        ownedItems.add(delta.stockItemId);
      }
    }

    let key = option.key;
    if (key === undefined || !used.has(key) || kept.has(key)) {
      const base = normalizeSlug(optionName).slice(0, 36) || "option";
      key = base;
      for (let n = 2; used.has(key); n++) key = `${base}-${n}`;
      used.add(key);
    }
    kept.add(key);
    options.push({ key, name: optionName, priceDelta: option.priceDelta, recipeDelta: option.recipeDelta });
  }
  return { name, minSelect, maxSelect, options };
}

export const list = tenantQuery({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("modifierGroups")
      .withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId))
      .take(200),
});

export const create = tenantMutation({
  args: groupFields,
  handler: async (ctx, input) => {
    requireRole(ctx.member, "owner", "manager");
    return ctx.db.insert("modifierGroups", { tenantId: ctx.tenantId, ...(await prepareGroup(ctx, input)) });
  },
});

export const update = tenantMutation({
  args: { modifierGroupId: v.id("modifierGroups"), ...groupFields },
  handler: async (ctx, { modifierGroupId, ...input }) => {
    requireRole(ctx.member, "owner", "manager");
    await getOwned(ctx, ctx.tenantId, modifierGroupId);
    await ctx.db.patch(modifierGroupId, await prepareGroup(ctx, input));
  },
});

/**
 * Sales keep option names as snapshots, so a group can be deleted. Products that still
 * list it skip the missing ID and drop it the next time they're saved.
 */
export const remove = tenantMutation({
  args: { modifierGroupId: v.id("modifierGroups") },
  handler: async (ctx, { modifierGroupId }) => {
    requireRole(ctx.member, "owner", "manager");
    await getOwned(ctx, ctx.tenantId, modifierGroupId);
    await ctx.db.delete(modifierGroupId);
  },
});
