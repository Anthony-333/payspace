/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

// The local Better Auth component, tested as its own app.
const modules = import.meta.glob("./**/*.*s");

test("marks accounts made before the cutoff verified, and leaves newer ones alone", async () => {
  const t = convexTest(schema, modules);
  const user = (email: string, createdAt: number, emailVerified = false) =>
    ({ name: email, email, emailVerified, createdAt, updatedAt: createdAt });
  await t.run(async (ctx) => {
    await ctx.db.insert("user", user("old@example.com", 500));
    await ctx.db.insert("user", user("done@example.com", 600, true));
    await ctx.db.insert("user", user("new@example.com", 2_000));
  });

  await t.mutation(internal.migrations.markExistingUsersVerified, { before: 1_000 });

  const rows = await t.run((ctx) => ctx.db.query("user").collect());
  const verified = Object.fromEntries(rows.map((r) => [r.email, r.emailVerified]));
  expect(verified).toEqual({ "old@example.com": true, "done@example.com": true, "new@example.com": false });
});
