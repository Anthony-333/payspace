import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { internalMutation, type ActionCtx, type MutationCtx } from "./_generated/server";
import type { AuthEmail } from "./lib/authEmails";

// Queued, retried and rate limited by the component. testMode is off so real addresses get mail;
// it reads RESEND_API_KEY from the deployment.
export const resend: Resend = new Resend(components.resend, { testMode: false });

export async function sendEmail(ctx: MutationCtx | ActionCtx, to: string, email: AuthEmail) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set on this Convex deployment.");
  await resend.sendEmail(ctx, { from, to, subject: email.subject, html: email.html, text: email.text });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The component keeps every email, and sign-in emails hold one-time links, so clear them out.
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, { olderThan: WEEK_MS });
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupAbandonedEmails, { olderThan: 4 * WEEK_MS });
    return null;
  },
});
