/// <reference types="vite/client" />
// Must include convex/_generated (only .js and .d.ts files) so convex-test can find the module root.
export const modules = import.meta.glob("./**/*.*s");

/**
 * Puts a shop on Pro, as a Polar webhook would (convex/billing.ts). Most suites exercise Pro
 * features (recipes, alerts, long history), so their shops start here; convex/plan.test.ts
 * covers the Free limits.
 */
export async function makePro(
  t: { run: <T>(fn: (ctx: import("./_generated/server").MutationCtx) => Promise<T>) => Promise<T> },
  tenantId: import("./_generated/dataModel").Id<"tenants">,
) {
  await t.run((ctx) => ctx.db.patch(tenantId, {
    billing: {
      polarCustomerId: "cus_test",
      trialUsed: true,
      subscription: { id: "sub_test", status: "active", eventAt: 1 },
    },
  }));
}
