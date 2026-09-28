import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { makePro, modules } from "./test.setup";

// Loyalty cards: the owner's program, cards with a username and password, signed stamps tied
// to one paid sale each, the customer's sign-in with lockout, and isolation between shops.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** A signature long enough to pass validateSignature: one horizontal stroke 100 units long. */
const sig = [[20, 75, 2, 70, 80, 2.5, 120, 75, 2]];
const program = { name: "Coffee card", stampsRequired: 3, reward: "A free latte", color: "teal" as const, isActive: true };

async function setup({ pro = true, slug = "brewlab", t = convexTest(schema, modules) } = {}) {
  const owner = t.withIdentity({ subject: `owner_${slug}`, name: "Owner" });
  const { tenantId } = await owner.mutation(api.tenants.create, { name: `Shop ${slug}`, slug, businessType: "cafe" });
  if (pro) await makePro(t, tenantId);
  const as = async (userId: string, role: "manager" | "cashier") => {
    await t.run((ctx) => ctx.db.insert("members", { tenantId, userId, name: `Staff ${userId}`, role, status: "active" }));
    return t.withIdentity({ subject: userId, name: userId });
  };
  const water = await t.run((ctx) => ctx.db.insert("products", {
    tenantId, name: "Water", kind: "service", price: 5000, unitCost: 0, modifierGroupIds: [], isActive: true,
  }));
  let refs = 0;
  /** Rings up a ₱50 sale and returns its receipt number. */
  const sell = async () => {
    const sale = await owner.mutation(api.sales.checkout, {
      tenantId, clientRef: `ref-${slug}-${++refs}`,
      lines: [{ productId: water, qty: 1, optionKeys: [] }],
      payments: [{ method: "cash", amount: 5000 }],
    });
    return sale.number;
  };
  return { t, owner, tenantId, as, sell };
}

async function withCard(opts?: Parameters<typeof setup>[0]) {
  const base = await setup(opts);
  await base.owner.mutation(api.loyalty.saveProgram, { tenantId: base.tenantId, ...program });
  const cardId = await base.owner.mutation(api.loyalty.createCard, {
    tenantId: base.tenantId, name: "Ana", username: "Ana.Reyes", password: "latte-lover-1",
  });
  return { ...base, cardId };
}

describe("program", () => {
  test("only the owner sets it up, and only on Pro", async () => {
    const { owner, tenantId, as } = await setup();
    const manager = await as("mgr", "manager");
    await expect(manager.mutation(api.loyalty.saveProgram, { tenantId, ...program })).rejects.toThrow(/role/);
    await owner.mutation(api.loyalty.saveProgram, { tenantId, ...program });
    expect((await manager.query(api.loyalty.program, { tenantId })).program?.reward).toBe("A free latte");

    const free = await setup({ pro: false, slug: "freeshop" });
    await expect(free.owner.mutation(api.loyalty.saveProgram, { tenantId: free.tenantId, ...program }))
      .rejects.toThrow(/Loyalty cards is part of Pro/);
  });

  test("rejects a stamp count out of range", async () => {
    const { owner, tenantId } = await setup();
    await expect(owner.mutation(api.loyalty.saveProgram, { tenantId, ...program, stampsRequired: 2 })).rejects.toThrow(/3 to 20/);
    await expect(owner.mutation(api.loyalty.saveProgram, { tenantId, ...program, stampsRequired: 4.5 })).rejects.toThrow(/3 to 20/);
  });

  test("a new stamp count applies from each card's next round", async () => {
    const { owner, tenantId, cardId, sell } = await withCard();
    await owner.mutation(api.loyalty.saveProgram, { tenantId, ...program, stampsRequired: 5 });
    expect((await owner.query(api.loyalty.card, { tenantId, cardId })).stampsRequired).toBe(3);
    for (let i = 0; i < 3; i++) await owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: await sell(), signature: sig });
    await owner.mutation(api.loyalty.redeem, { tenantId, cardId, signature: sig });
    const card = await owner.query(api.loyalty.card, { tenantId, cardId });
    expect(card).toMatchObject({ round: 2, stamps: 0, stampsRequired: 5 });
  });
});

describe("cards", () => {
  test("any role can open one; usernames are lowercased and unique per shop", async () => {
    const { tenantId, as, cardId, owner } = await withCard();
    const cashier = await as("cash1", "cashier");
    await expect(cashier.mutation(api.loyalty.createCard, { tenantId, name: "Ben", username: "ana.reyes", password: "password-2" }))
      .rejects.toThrow(/taken/);
    await cashier.mutation(api.loyalty.createCard, { tenantId, name: "Ben", username: "ben", password: "password-2" });
    await expect(cashier.mutation(api.loyalty.createCard, { tenantId, name: "Cy", username: "c", password: "password-2" }))
      .rejects.toThrow(/3 to 30/);
    await expect(cashier.mutation(api.loyalty.createCard, { tenantId, name: "Cy", username: "cyrus", password: "short" }))
      .rejects.toThrow(/at least 8/);

    const card = await owner.query(api.loyalty.card, { tenantId, cardId });
    expect(card.username).toBe("ana.reyes");
    expect(card).not.toHaveProperty("passwordHash");
    expect((await owner.query(api.loyalty.cards, { tenantId, search: "BE" })).map((c) => c.username)).toEqual(["ben"]);
  });

  test("the same username can be used in another shop", async () => {
    const a = await withCard();
    const other = await withCard({ slug: "othershop", t: a.t });
    expect(other.cardId).toBeDefined();
  });

  test("cashiers can't reset passwords or archive cards", async () => {
    const { tenantId, as, cardId } = await withCard();
    const cashier = await as("cash1", "cashier");
    await expect(cashier.mutation(api.loyalty.resetPassword, { tenantId, cardId, password: "new-password" })).rejects.toThrow(/role/);
    await expect(cashier.mutation(api.loyalty.setArchived, { tenantId, cardId, archived: true })).rejects.toThrow(/role/);
    const manager = await as("mgr", "manager");
    await manager.mutation(api.loyalty.resetPassword, { tenantId, cardId, password: "new-password" });
  });
});

describe("stamps", () => {
  test("each stamp needs a signature and a sale, and records who gave it and their role", async () => {
    const { tenantId, as, cardId, sell } = await withCard();
    const cashier = await as("cash1", "cashier");
    const saleNumber = await sell();
    await expect(cashier.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: [] })).rejects.toThrow(/Sign/);
    await expect(cashier.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: [[10, 10, 2, 12, 10, 2]] }))
      .rejects.toThrow(/too short/);
    await expect(cashier.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: [[10, 10, 2, 900, 10, 2]] }))
      .rejects.toThrow(/couldn't be read/);
    await expect(cashier.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: 999, signature: sig }))
      .rejects.toThrow(/no receipt #999/);

    const result = await cashier.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: sig, note: "  Iced latte " });
    expect(result).toEqual({ stamps: 1, stampsRequired: 3, full: false });
    const card = await cashier.query(api.loyalty.card, { tenantId, cardId });
    expect(card.history[0]).toMatchObject({
      kind: "stamp", saleNumber, memberName: "Staff cash1", memberRole: "cashier", signature: sig, note: "Iced latte",
    });
  });

  test("a sale earns one stamp, on one card", async () => {
    const { owner, tenantId, cardId, sell } = await withCard();
    const other = await owner.mutation(api.loyalty.createCard, { tenantId, name: "Ben", username: "ben", password: "password-2" });
    const saleNumber = await sell();
    await owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: sig });
    await expect(owner.mutation(api.loyalty.addStamp, { tenantId, cardId: other, saleNumber, signature: sig }))
      .rejects.toThrow(/already earned a stamp/);
    expect(await owner.query(api.loyalty.saleForStamp, { tenantId, saleNumber })).toMatchObject({ stampedOn: "ana.reyes" });
  });

  test("recent receipts list only stampable sales, newest first", async () => {
    const { owner, tenantId, cardId, sell } = await withCard();
    const old = await sell();
    vi.advanceTimersByTime(15 * 24 * 60 * 60 * 1000);
    const stamped = await sell();
    const fresh = await sell();
    await owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: stamped, signature: sig });
    const recent = await owner.query(api.loyalty.recentSalesForStamp, { tenantId });
    expect(recent.map((r) => r.number)).toEqual([fresh]);
    expect(recent.map((r) => r.number)).not.toContain(old);
  });

  test("a sale older than 14 days can't earn a stamp", async () => {
    const { owner, tenantId, cardId, sell } = await withCard();
    const saleNumber = await sell();
    vi.advanceTimersByTime(15 * 24 * 60 * 60 * 1000);
    await expect(owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: sig })).rejects.toThrow(/14 days/);
  });

  test("a full card takes no more stamps until the reward is given", async () => {
    const { owner, tenantId, cardId, sell, as } = await withCard();
    await expect(owner.mutation(api.loyalty.redeem, { tenantId, cardId, signature: sig })).rejects.toThrow(/3 more stamps/);
    for (let i = 0; i < 3; i++) await owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: await sell(), signature: sig });
    await expect(owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: await sell(), signature: sig }))
      .rejects.toThrow(/full/);
    const cashier = await as("cash1", "cashier");
    await cashier.mutation(api.loyalty.redeem, { tenantId, cardId, signature: sig });
    const card = await owner.query(api.loyalty.card, { tenantId, cardId });
    expect(card).toMatchObject({ round: 2, stamps: 0 });
    expect(card.history[0]).toMatchObject({ kind: "redeem", round: 1, memberRole: "cashier" });
  });

  test("an archived card or a switched-off program takes no stamps", async () => {
    const { owner, tenantId, cardId, sell } = await withCard();
    await owner.mutation(api.loyalty.setArchived, { tenantId, cardId, archived: true });
    await expect(owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: await sell(), signature: sig })).rejects.toThrow(/archived/);
    await owner.mutation(api.loyalty.setArchived, { tenantId, cardId, archived: false });
    await owner.mutation(api.loyalty.saveProgram, { tenantId, ...program, isActive: false });
    await expect(owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: await sell(), signature: sig })).rejects.toThrow(/switched off/);
  });

  test("a shop that left Pro can't give stamps", async () => {
    const { t, owner, tenantId, cardId, sell } = await withCard();
    await t.run((ctx) => ctx.db.patch(tenantId, { billing: undefined }));
    await expect(owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber: await sell(), signature: sig }))
      .rejects.toThrow(/part of Pro/);
  });
});

describe("tenant isolation", () => {
  test("another shop's staff can't read or change a card, or stamp with its sales", async () => {
    const a = await withCard();
    const b = await withCard({ slug: "othershop", t: a.t });
    const bSale = await b.sell();
    // Staff of shop B, using shop B's tenantId with shop A's card.
    await expect(b.owner.query(api.loyalty.card, { tenantId: b.tenantId, cardId: a.cardId })).rejects.toThrow(/Not found/);
    await expect(b.owner.mutation(api.loyalty.addStamp, { tenantId: b.tenantId, cardId: a.cardId, saleNumber: bSale, signature: sig }))
      .rejects.toThrow(/Not found/);
    await expect(b.owner.mutation(api.loyalty.resetPassword, { tenantId: b.tenantId, cardId: a.cardId, password: "hijacked-1" }))
      .rejects.toThrow(/Not found/);
    // Staff of shop B, using shop A's tenantId.
    await expect(b.owner.query(api.loyalty.cards, { tenantId: a.tenantId })).rejects.toThrow(/access/);
    await expect(b.owner.mutation(api.loyalty.addStamp, { tenantId: a.tenantId, cardId: a.cardId, saleNumber: bSale, signature: sig }))
      .rejects.toThrow(/access/);
  });

  test("receipt numbers are looked up in the stamping shop's own books", async () => {
    const a = await withCard();
    const b = await withCard({ slug: "othershop", t: a.t });
    await b.sell(); // B has receipt #1; A has none yet.
    await expect(a.owner.mutation(api.loyalty.addStamp, { tenantId: a.tenantId, cardId: a.cardId, saleNumber: 1, signature: sig }))
      .rejects.toThrow(/no receipt #1/);
    expect(await a.owner.query(api.loyalty.saleForStamp, { tenantId: a.tenantId, saleNumber: 1 })).toBeNull();
  });
});

describe("customer sign-in", () => {
  const signIn = (t: ReturnType<typeof convexTest>, username = "ana.reyes", password = "latte-lover-1", shop = "brewlab") =>
    t.mutation(api.loyaltyCustomer.signIn, { shop, username, password });

  test("signs in with username and password and sees the card with signed stamps, no internals", async () => {
    const { t, owner, tenantId, cardId, sell } = await withCard();
    const saleNumber = await sell();
    await owner.mutation(api.loyalty.addStamp, { tenantId, cardId, saleNumber, signature: sig });

    const res = await signIn(t, "  ANA.Reyes ");
    if (!res.ok) throw new Error(res.error);
    const card = await t.query(api.loyaltyCustomer.card, { shop: "brewlab", token: res.token });
    expect(card).toMatchObject({ name: "Ana", stamps: 1, stampsRequired: 3, rewardsEarned: 0, program: { reward: "A free latte" } });
    expect(card!.current).toEqual([{ at: expect.any(Number), kind: "stamp", round: 1, saleNumber, signature: sig }]);
    const json = JSON.stringify(card);
    expect(json).not.toMatch(/Staff|owner_|passwordHash|tenantId|_id/);

    // The token only opens this shop's card, not a card in another shop.
    await withCard({ slug: "othershop", t });
    expect(await t.query(api.loyaltyCustomer.card, { shop: "othershop", token: res.token })).toBeNull();
    await t.mutation(api.loyaltyCustomer.signOut, { token: res.token });
    expect(await t.query(api.loyaltyCustomer.card, { shop: "brewlab", token: res.token })).toBeNull();
  });

  test("wrong password, unknown user and unknown shop all get the same answer", async () => {
    const { t } = await withCard();
    await withCard({ slug: "othershop", t });
    const wrong = await signIn(t, "ana.reyes", "nope-nope-nope");
    const unknown = await signIn(t, "nobody");
    const noShop = await signIn(t, "ana.reyes", "latte-lover-1", "no-such-shop");
    expect(wrong).toEqual({ ok: false, error: "That username and password don't match." });
    expect(unknown).toEqual(wrong);
    expect(noShop).toEqual(wrong);
  });

  test("five wrong passwords lock the card for 15 minutes", async () => {
    const { t } = await withCard();
    for (let i = 0; i < 4; i++) expect((await signIn(t, "ana.reyes", "wrong-password")).ok).toBe(false);
    expect(await signIn(t, "ana.reyes", "wrong-password")).toMatchObject({ ok: false, error: expect.stringMatching(/Too many tries/) });
    // Even the right password is refused while locked.
    expect(await signIn(t)).toMatchObject({ ok: false, error: expect.stringMatching(/Too many tries/) });
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect((await signIn(t)).ok).toBe(true);
  });

  test("a password reset or archiving signs the customer out; only the new password works", async () => {
    const { t, owner, tenantId, cardId } = await withCard();
    const first = await signIn(t);
    if (!first.ok) throw new Error(first.error);
    await owner.mutation(api.loyalty.resetPassword, { tenantId, cardId, password: "fresh-password" });
    expect(await t.query(api.loyaltyCustomer.card, { shop: "brewlab", token: first.token })).toBeNull();
    expect((await signIn(t)).ok).toBe(false);
    const second = await signIn(t, "ana.reyes", "fresh-password");
    if (!second.ok) throw new Error(second.error);

    await owner.mutation(api.loyalty.setArchived, { tenantId, cardId, archived: true });
    expect(await t.query(api.loyaltyCustomer.card, { shop: "brewlab", token: second.token })).toBeNull();
    expect((await signIn(t, "ana.reyes", "fresh-password")).ok).toBe(false);
  });

  test("sessions expire after 30 days and the daily job deletes them", async () => {
    const { t } = await withCard();
    const res = await signIn(t);
    if (!res.ok) throw new Error(res.error);
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
    expect(await t.query(api.loyaltyCustomer.card, { shop: "brewlab", token: res.token })).toBeNull();
    await t.mutation(internal.loyalty.cleanupSessions, {});
    expect(await t.run((ctx) => ctx.db.query("loyaltySessions").collect())).toHaveLength(0);
  });

  test("the card stays viewable after the shop leaves Pro", async () => {
    const { t, tenantId } = await withCard();
    const res = await signIn(t);
    if (!res.ok) throw new Error(res.error);
    await t.run((ctx) => ctx.db.patch(tenantId, { billing: undefined }));
    expect(await t.query(api.loyaltyCustomer.card, { shop: "brewlab", token: res.token })).not.toBeNull();
  });
});
