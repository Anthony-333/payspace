import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const BATCH = 200;

/**
 * One-off, 2026-09-30: accounts created before email verification was required are marked
 * verified, so turning it on doesn't lock them out. `before` is the cutoff (ms), so anyone who
 * signs up after the deploy still has to verify. Run once per deployment, right after deploying:
 *   npx convex run --component betterAuth migrations:markExistingUsersVerified '{"before": <ms>}'
 * Components can't paginate(), so it walks users by _creationTime.
 */
export const markExistingUsersVerified = internalMutation({
  args: { before: v.number(), after: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { before, after }) => {
    const users = await ctx.db
      .query("user")
      .withIndex("by_creation_time", (q) => q.gt("_creationTime", after ?? 0))
      .take(BATCH);
    for (const user of users) {
      if (!user.emailVerified && user.createdAt < before) {
        await ctx.db.patch(user._id, { emailVerified: true, updatedAt: Date.now() });
      }
    }
    if (users.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.migrations.markExistingUsersVerified, {
        before,
        after: users[users.length - 1]._creationTime,
      });
    }
    return null;
  },
});
