import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { LOCKOUT_MS, MAX_LOGIN_FAILURES, normalizeUsername, SESSION_MS } from "./lib/loyalty";
import { burnPasswordCheck, newSessionToken, sha256Hex, verifyPassword } from "./lib/password";
import { publicMutation, publicQuery } from "./lib/tenant";

// The customer's side of a loyalty card, at /loyalty/[shop]/[username]. No Payspace account: the customer signs
// in with the username and password staff set on their card and gets a session token. Only a
// hash of the token is stored. Nothing here returns an internal ID, a staff name or a cost.
// Cards stay viewable if the shop leaves Pro; only giving stamps needs it (convex/loyalty.ts).

const MAX_SESSIONS_PER_CARD = 5;
const HISTORY = 12;
const WRONG = "That username and password don't match.";

async function shopBySlug(ctx: QueryCtx, slug: string) {
  return ctx.db.query("tenants").withIndex("by_slug", (q) => q.eq("slug", slug.trim().toLowerCase())).unique();
}

/**
 * Returns a result instead of throwing on a wrong password, because a thrown error would roll
 * back the failed-attempt count. Five misses lock the card for 15 minutes.
 */
export const signIn = publicMutation({
  args: { shop: v.string(), username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const fail = (error: string) => ({ ok: false as const, error });
    if (args.password.length > 128 || args.username.length > 60) return fail(WRONG);
    const tenant = await shopBySlug(ctx, args.shop);
    const card = tenant && await ctx.db
      .query("loyaltyCards")
      .withIndex("by_tenant_username", (q) => q.eq("tenantId", tenant._id).eq("username", normalizeUsername(args.username)))
      .unique();
    if (!tenant || !card || card.status !== "active") {
      await burnPasswordCheck(args.password);
      return fail(WRONG);
    }

    const now = Date.now();
    if (card.lockedUntil !== undefined && card.lockedUntil > now) {
      const minutes = Math.ceil((card.lockedUntil - now) / 60_000);
      return fail(`Too many tries. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask the shop to reset your password.`);
    }
    if (!(await verifyPassword(args.password, card.passwordHash))) {
      const failures = card.failedLogins + 1;
      if (failures >= MAX_LOGIN_FAILURES) {
        await ctx.db.patch(card._id, { failedLogins: 0, lockedUntil: now + LOCKOUT_MS });
        return fail("Too many tries. Try again in 15 minutes, or ask the shop to reset your password.");
      }
      await ctx.db.patch(card._id, { failedLogins: failures });
      return fail(WRONG);
    }

    await ctx.db.patch(card._id, { failedLogins: 0, lockedUntil: undefined });
    // Keep the newest few sessions; signing in on a new phone quietly drops the oldest.
    const sessions = await ctx.db
      .query("loyaltySessions")
      .withIndex("by_tenant_card", (q) => q.eq("tenantId", tenant._id).eq("cardId", card._id))
      .take(50);
    for (const old of sessions.slice(0, Math.max(0, sessions.length - (MAX_SESSIONS_PER_CARD - 1)))) {
      await ctx.db.delete(old._id);
    }
    const token = newSessionToken();
    const expiresAt = now + SESSION_MS;
    await ctx.db.insert("loyaltySessions", { tenantId: tenant._id, cardId: card._id, tokenHash: await sha256Hex(token), expiresAt });
    return { ok: true as const, token, expiresAt };
  },
});

export const signOut = publicMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("loyaltySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});

/** The shop's name and card design, for the sign-in screen. Null for an unknown shop or no program. */
export const shop = publicQuery({
  args: { shop: v.string() },
  handler: async (ctx, args) => {
    const tenant = await shopBySlug(ctx, args.shop);
    if (!tenant) return null;
    const program = await ctx.db.query("loyaltyPrograms").withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id)).unique();
    if (!program) return null;
    return { shopName: tenant.name, cardName: program.name, color: program.color, reward: program.reward, stampsRequired: program.stampsRequired };
  },
});

function publicEntry(entry: Doc<"loyaltyStamps">) {
  return { at: entry._creationTime, kind: entry.kind, round: entry.round, saleNumber: entry.saleNumber, signature: entry.signature };
}

/**
 * The signed-in customer's card. Null when the token is unknown, expired, for another shop, or
 * its card was archived, and the page then asks them to sign in again.
 */
export const card = publicQuery({
  args: { shop: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    if (args.token.length !== 64) return null;
    const tokenHash = await sha256Hex(args.token);
    const session = await ctx.db
      .query("loyaltySessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    // Date.now() in a query is fixed when it runs; an expired session is also deleted daily.
    if (!session || session.expiresAt < Date.now()) return null;
    const tenant = await shopBySlug(ctx, args.shop);
    if (!tenant || tenant._id !== session.tenantId) return null;
    const card = await ctx.db.get(session.cardId);
    if (!card || card.tenantId !== tenant._id || card.status !== "active") return null;
    const program = await ctx.db.query("loyaltyPrograms").withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id)).unique();
    if (!program) return null;

    const history = await ctx.db
      .query("loyaltyStamps")
      .withIndex("by_tenant_card", (q) => q.eq("tenantId", tenant._id).eq("cardId", card._id))
      .order("desc")
      .take(Math.max(HISTORY, card.stamps));
    return {
      shopName: tenant.name,
      program: { name: program.name, reward: program.reward, terms: program.terms, color: program.color },
      name: card.name,
      username: card.username,
      round: card.round,
      stamps: card.stamps,
      stampsRequired: card.stampsRequired,
      rewardsEarned: card.round - 1,
      // Oldest first, so stamp 1 fills the first box.
      current: history.filter((e) => e.kind === "stamp" && e.round === card.round).reverse().map(publicEntry),
      history: history.slice(0, HISTORY).map(publicEntry),
    };
  },
});
