import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import {
  LOYALTY_COLORS,
  STAMP_SALE_MAX_AGE_MS,
  STAMPS_MAX,
  STAMPS_MIN,
  validatePassword,
  validateUsername,
} from "./lib/loyalty";
import { hashPassword } from "./lib/password";
import { isPro, requirePro } from "./lib/plan";
import { validateSignature } from "./lib/signature";
import {
  getOwned,
  requireRole,
  tenantMutation,
  tenantQuery,
  type TenantMutationCtx,
  type TenantQueryCtx,
} from "./lib/tenant";

// Loyalty cards, staff side. The owner sets up the program; any role can open a card and give
// a stamp, but every stamp needs a paid sale (one stamp per sale) and a drawn signature, and the
// ledger records who gave it and their role. Customers see their card through
// convex/loyaltyCustomer.ts. Everything that changes a card is Pro.

const FEATURE = "Loyalty cards";
const HISTORY = 30;
const LIST = 50;
const MAX_SESSIONS_DELETE = 100;

const signature = v.array(v.array(v.number()));
const color = v.union(...LOYALTY_COLORS.map((c) => v.literal(c)));

function text(value: string, label: string, min: number, max: number) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ConvexError(min > 0 ? `${label} must be ${min} to ${max} characters.` : `Keep ${label.toLowerCase()} under ${max} characters.`);
  }
  return trimmed;
}

async function getProgram(ctx: TenantQueryCtx) {
  return ctx.db.query("loyaltyPrograms").withIndex("by_tenant", (q) => q.eq("tenantId", ctx.tenantId)).unique();
}

async function requireActiveProgram(ctx: TenantQueryCtx) {
  const program = await getProgram(ctx);
  if (!program || !program.isActive) throw new ConvexError("Loyalty cards are switched off. The owner can turn them on under Loyalty.");
  return program;
}

async function requireActiveCard(ctx: TenantQueryCtx, cardId: Id<"loyaltyCards">) {
  const card = await getOwned(ctx, ctx.tenantId, cardId);
  if (card.status !== "active") throw new ConvexError("This card is archived.");
  return card;
}

/** Signs a customer out everywhere: after a password reset or when the card is archived. */
async function endSessions(ctx: TenantMutationCtx, cardId: Id<"loyaltyCards">) {
  const sessions = await ctx.db
    .query("loyaltySessions")
    .withIndex("by_tenant_card", (q) => q.eq("tenantId", ctx.tenantId).eq("cardId", cardId))
    .take(MAX_SESSIONS_DELETE);
  for (const session of sessions) await ctx.db.delete(session._id);
}

function toListItem(card: Doc<"loyaltyCards">) {
  return {
    _id: card._id,
    name: card.name,
    username: card.username,
    status: card.status,
    round: card.round,
    stamps: card.stamps,
    stampsRequired: card.stampsRequired,
  };
}

/** The shop's program (null before the owner sets one up) and whether the shop is on Pro. */
export const program = tenantQuery({
  args: {},
  handler: async (ctx) => {
    const program = await getProgram(ctx);
    return {
      pro: isPro(ctx.tenant),
      program: program && {
        name: program.name,
        stampsRequired: program.stampsRequired,
        reward: program.reward,
        terms: program.terms,
        color: program.color,
        isActive: program.isActive,
      },
    };
  },
});

/**
 * Sets up or changes the program. A new stamp count applies from each card's next round, so a
 * customer halfway through a card is never moved further from their reward.
 */
export const saveProgram = tenantMutation({
  args: {
    name: v.string(),
    stampsRequired: v.number(),
    reward: v.string(),
    terms: v.optional(v.string()),
    color,
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    requireRole(ctx.member, "owner");
    requirePro(ctx.tenant, FEATURE);
    if (!Number.isInteger(args.stampsRequired) || args.stampsRequired < STAMPS_MIN || args.stampsRequired > STAMPS_MAX) {
      throw new ConvexError(`A card needs ${STAMPS_MIN} to ${STAMPS_MAX} stamps.`);
    }
    const terms = args.terms === undefined ? "" : text(args.terms, "The terms", 0, 300);
    const fields = {
      name: text(args.name, "The card name", 2, 40),
      stampsRequired: args.stampsRequired,
      reward: text(args.reward, "The reward", 2, 80),
      terms: terms || undefined,
      color: args.color,
      isActive: args.isActive,
    };
    const existing = await getProgram(ctx);
    if (existing) await ctx.db.replace(existing._id, { tenantId: ctx.tenantId, ...fields });
    else await ctx.db.insert("loyaltyPrograms", { tenantId: ctx.tenantId, ...fields });
    return null;
  },
});

/** Active cards: the newest, or those whose username starts with `search`. */
export const cards = tenantQuery({
  args: { search: v.optional(v.string()), archived: v.optional(v.boolean()) },
  handler: async (ctx, { search, archived }) => {
    const prefix = search?.trim().toLowerCase() ?? "";
    const status = archived ? "archived" : "active";
    if (prefix) {
      const matches = await ctx.db
        .query("loyaltyCards")
        .withIndex("by_tenant_username", (q) =>
          q.eq("tenantId", ctx.tenantId).gte("username", prefix).lt("username", `${prefix}￿`))
        .take(LIST);
      return matches.filter((c) => c.status === status).map(toListItem);
    }
    const recent = await ctx.db
      .query("loyaltyCards")
      .withIndex("by_tenant_status", (q) => q.eq("tenantId", ctx.tenantId).eq("status", status))
      .order("desc")
      .take(LIST);
    return recent.map(toListItem);
  },
});

/** One card with its ledger, newest first: every stamp and reward, who gave it, and the signature. */
export const card = tenantQuery({
  args: { cardId: v.id("loyaltyCards") },
  handler: async (ctx, { cardId }) => {
    const card = await getOwned(ctx, ctx.tenantId, cardId);
    const history = await ctx.db
      .query("loyaltyStamps")
      .withIndex("by_tenant_card", (q) => q.eq("tenantId", ctx.tenantId).eq("cardId", cardId))
      .order("desc")
      .take(HISTORY);
    return {
      ...toListItem(card),
      locked: card.lockedUntil !== undefined && card.lockedUntil > Date.now(),
      createdAt: card._creationTime,
      history: history.map((entry) => ({
        _id: entry._id,
        at: entry._creationTime,
        kind: entry.kind,
        round: entry.round,
        saleNumber: entry.saleNumber,
        memberName: entry.memberName,
        memberRole: entry.memberRole,
        signature: entry.signature,
        note: entry.note,
      })),
    };
  },
});

/** Anyone at the counter can open a card for a customer. The password is never stored or shown. */
export const createCard = tenantMutation({
  args: { name: v.string(), username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    requirePro(ctx.tenant, FEATURE);
    const program = await requireActiveProgram(ctx);
    const name = text(args.name, "The customer's name", 1, 60);
    const username = validateUsername(args.username);
    validatePassword(args.password);
    const taken = await ctx.db
      .query("loyaltyCards")
      .withIndex("by_tenant_username", (q) => q.eq("tenantId", ctx.tenantId).eq("username", username))
      .first();
    // Archived cards keep their username, so an old card's history never shows up under someone new.
    if (taken) throw new ConvexError("That username is taken. Try another one.");
    return ctx.db.insert("loyaltyCards", {
      tenantId: ctx.tenantId,
      name,
      username,
      passwordHash: await hashPassword(args.password),
      status: "active",
      round: 1,
      stamps: 0,
      stampsRequired: program.stampsRequired,
      failedLogins: 0,
      createdBy: ctx.member._id,
    });
  },
});

/** Customers can't change their own password; they ask the owner or a manager. Signs them out everywhere. */
export const resetPassword = tenantMutation({
  args: { cardId: v.id("loyaltyCards"), password: v.string() },
  handler: async (ctx, { cardId, password }) => {
    requireRole(ctx.member, "owner", "manager");
    requirePro(ctx.tenant, FEATURE);
    await requireActiveCard(ctx, cardId);
    validatePassword(password);
    await ctx.db.patch(cardId, { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: undefined });
    await endSessions(ctx, cardId);
    return null;
  },
});

/** Archive, don't delete (CLAUDE.md rule 9): stamps point at sales. An archived card can't sign in. */
export const setArchived = tenantMutation({
  args: { cardId: v.id("loyaltyCards"), archived: v.boolean() },
  handler: async (ctx, { cardId, archived }) => {
    requireRole(ctx.member, "owner", "manager");
    requirePro(ctx.tenant, FEATURE);
    await getOwned(ctx, ctx.tenantId, cardId);
    await ctx.db.patch(cardId, { status: archived ? "archived" : "active" });
    if (archived) await endSessions(ctx, cardId);
    return null;
  },
});

/** Looks up a receipt number before stamping, so staff can see it's the right sale. */
export const saleForStamp = tenantQuery({
  args: { saleNumber: v.number() },
  handler: async (ctx, { saleNumber }) => {
    if (!Number.isInteger(saleNumber) || saleNumber < 1) return null;
    const sale = await ctx.db
      .query("sales")
      .withIndex("by_tenant_number", (q) => q.eq("tenantId", ctx.tenantId).eq("number", saleNumber))
      .unique();
    if (!sale) return null;
    const stamp = await ctx.db
      .query("loyaltyStamps")
      .withIndex("by_tenant_sale", (q) => q.eq("tenantId", ctx.tenantId).eq("saleId", sale._id))
      .first();
    const stampedCard = stamp && (await ctx.db.get(stamp.cardId));
    return {
      number: sale.number,
      total: sale.total,
      at: sale._creationTime,
      status: sale.status,
      tooOld: Date.now() - sale._creationTime > STAMP_SALE_MAX_AGE_MS,
      stampedOn: stampedCard ? stampedCard.username : null,
    };
  },
});

function signer(ctx: TenantMutationCtx, sig: number[][], note: string | undefined) {
  validateSignature(sig);
  const trimmed = note === undefined ? "" : text(note, "The note", 0, 120);
  return {
    memberId: ctx.member._id,
    memberName: ctx.member.name,
    memberRole: ctx.member.role,
    signature: sig,
    note: trimmed || undefined,
  };
}

/**
 * One stamp for one paid sale, signed by whoever gives it. The sale must be this shop's, completed,
 * less than 14 days old and not already stamped, so a stamp always stands for a real purchase.
 */
export const addStamp = tenantMutation({
  args: { cardId: v.id("loyaltyCards"), saleNumber: v.number(), signature, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requirePro(ctx.tenant, FEATURE);
    await requireActiveProgram(ctx);
    const card = await requireActiveCard(ctx, args.cardId);
    if (card.stamps >= card.stampsRequired) throw new ConvexError("This card is full. Give the reward to start a new card.");
    const sign = signer(ctx, args.signature, args.note);

    const sale = Number.isInteger(args.saleNumber)
      ? await ctx.db
        .query("sales")
        .withIndex("by_tenant_number", (q) => q.eq("tenantId", ctx.tenantId).eq("number", args.saleNumber))
        .unique()
      : null;
    if (!sale) throw new ConvexError(`There's no receipt #${args.saleNumber}.`);
    if (sale.status !== "completed") throw new ConvexError(`Receipt #${sale.number} was ${sale.status}, so it can't earn a stamp.`);
    if (Date.now() - sale._creationTime > STAMP_SALE_MAX_AGE_MS) {
      throw new ConvexError(`Receipt #${sale.number} is more than 14 days old, so it can't earn a stamp.`);
    }
    const used = await ctx.db
      .query("loyaltyStamps")
      .withIndex("by_tenant_sale", (q) => q.eq("tenantId", ctx.tenantId).eq("saleId", sale._id))
      .first();
    if (used) throw new ConvexError(`Receipt #${sale.number} already earned a stamp.`);

    await ctx.db.insert("loyaltyStamps", {
      tenantId: ctx.tenantId,
      cardId: card._id,
      kind: "stamp",
      round: card.round,
      saleId: sale._id,
      saleNumber: sale.number,
      ...sign,
    });
    const stamps = card.stamps + 1;
    await ctx.db.patch(card._id, { stamps });
    return { stamps, stampsRequired: card.stampsRequired, full: stamps >= card.stampsRequired };
  },
});

/** Gives the reward on a full card, signed like a stamp, and starts the next round. */
export const redeem = tenantMutation({
  args: { cardId: v.id("loyaltyCards"), signature, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requirePro(ctx.tenant, FEATURE);
    const program = await requireActiveProgram(ctx);
    const card = await requireActiveCard(ctx, args.cardId);
    if (card.stamps < card.stampsRequired) {
      throw new ConvexError(`This card needs ${card.stampsRequired - card.stamps} more stamp${card.stampsRequired - card.stamps === 1 ? "" : "s"} first.`);
    }
    await ctx.db.insert("loyaltyStamps", {
      tenantId: ctx.tenantId,
      cardId: card._id,
      kind: "redeem",
      round: card.round,
      ...signer(ctx, args.signature, args.note),
    });
    await ctx.db.patch(card._id, { round: card.round + 1, stamps: 0, stampsRequired: program.stampsRequired });
    return null;
  },
});

/** Daily (convex/crons.ts): deletes expired customer sessions, a page at a time. */
export const cleanupSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("loyaltySessions")
      .withIndex("by_expires", (q) => q.lt("expiresAt", Date.now()))
      .take(500);
    for (const session of expired) await ctx.db.delete(session._id);
    if (expired.length === 500) await ctx.scheduler.runAfter(0, internal.loyalty.cleanupSessions, {});
    return null;
  },
});
