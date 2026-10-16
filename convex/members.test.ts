import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "user_alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "user_bob", name: "Bob" });
  const shopA = await alice.mutation(api.tenants.create, {
    name: "Brew Lab", slug: "brewlab", businessType: "cafe",
  });
  const shopB = await bob.mutation(api.tenants.create, {
    name: "Sari Mart", slug: "sarimart", businessType: "grocery",
  });
  await t.run((ctx) => ctx.db.insert("members", {
    tenantId: shopA.tenantId, userId: "user_carla", name: "Carla", role: "cashier", status: "active",
  }));
  const carla = t.withIdentity({ subject: "user_carla", name: "Carla" });
  return { t, alice, bob, carla, shopA, shopB };
}

describe("welcome tour", () => {
  test("starts not completed and completing it only marks the caller", async () => {
    const { alice, carla, shopA } = await setup();
    const args = { tenantId: shopA.tenantId };
    expect(await carla.query(api.members.tour, args)).toEqual({ completed: false });
    expect(await alice.query(api.members.tour, args)).toEqual({ completed: false });

    await carla.mutation(api.members.completeTour, args);
    expect(await carla.query(api.members.tour, args)).toEqual({ completed: true });
    expect(await alice.query(api.members.tour, args)).toEqual({ completed: false });
  });

  test("is tracked per shop", async () => {
    const { t, alice, shopA, shopB } = await setup();
    await t.run((ctx) => ctx.db.insert("members", {
      tenantId: shopB.tenantId, userId: "user_alice", name: "Alice", role: "manager", status: "active",
    }));
    await alice.mutation(api.members.completeTour, { tenantId: shopA.tenantId });
    expect(await alice.query(api.members.tour, { tenantId: shopB.tenantId })).toEqual({ completed: false });
  });

  test("completing again keeps the first time", async () => {
    const { t, carla, shopA } = await setup();
    await carla.mutation(api.members.completeTour, { tenantId: shopA.tenantId });
    const first = await t.run((ctx) => ctx.db.query("members").collect())
      .then((rows) => rows.find((m) => m.userId === "user_carla")!.tourCompletedAt);
    await carla.mutation(api.members.completeTour, { tenantId: shopA.tenantId });
    const second = await t.run((ctx) => ctx.db.query("members").collect())
      .then((rows) => rows.find((m) => m.userId === "user_carla")!.tourCompletedAt);
    expect(second).toBe(first);
  });

  test("non-members and disabled members are refused", async () => {
    const { t, bob, carla, shopA } = await setup();
    const args = { tenantId: shopA.tenantId };
    await expect(bob.query(api.members.tour, args)).rejects.toThrow();
    await expect(bob.mutation(api.members.completeTour, args)).rejects.toThrow();

    await t.run(async (ctx) => {
      const row = (await ctx.db.query("members").collect()).find((m) => m.userId === "user_carla")!;
      await ctx.db.patch(row._id, { status: "disabled" });
    });
    await expect(carla.mutation(api.members.completeTour, args)).rejects.toThrow();
  });
});
