import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { sendEmail } from "./emails";
import { resetPassword, verifyEmail } from "./lib/authEmails";
import { TRUSTED_IP_HEADER } from "./lib/clientIp";

const siteUrl = process.env.SITE_URL!;

// The component is installed locally (convex/betterAuth/) so we control its schema and indexes.
export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

// Better Auth is identity only: shops, staff and roles live in `tenants` and `members`.
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Unverified users get no session: sign-up and sign-in both answer with a fresh link instead.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendEmail(requireActionCtx(ctx), user.email, resetPassword(user.name, url)),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) =>
        sendEmail(requireActionCtx(ctx), user.email, verifyEmail(user.name, url)),
    },
    // Better Auth only limits when NODE_ENV is production, which Convex doesn't set, so turn it on.
    // Rows live in the component's rateLimit table, so limits hold across Convex instances.
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 300, max: 10 },
        "/sign-up/email": { window: 3600, max: 10 },
        "/request-password-reset": { window: 3600, max: 5 },
        "/send-verification-email": { window: 3600, max: 5 },
        "/reset-password": { window: 3600, max: 10 },
        // Called on every page load, and by the Next.js server on users' behalf; nothing to guess.
        "/get-session": false,
        "/convex/token": false,
      },
    },
    // With verification on, Better Auth answers a duplicate sign-up with a fake success and sends
    // nothing, which left people waiting for an email. Say so instead (user's call, 2026-09-30):
    // it reveals that an address has an account, which the sign-up rate limit keeps slow.
    hooks: {
      before: createAuthMiddleware(async (hookCtx) => {
        if (hookCtx.path !== "/sign-up/email") return;
        const email = (hookCtx.body as { email?: unknown } | undefined)?.email;
        if (typeof email !== "string") return;
        const existing = await hookCtx.context.internalAdapter.findUserByEmail(email.toLowerCase());
        if (existing?.user) throw APIError.from("UNPROCESSABLE_ENTITY", {
          code: "USER_ALREADY_EXISTS",
          message: "That email is already registered.",
        });
      }),
    },
    // Set by convex/http.ts from the proxy's signed header or the caller's address; never by the client.
    advanced: { ipAddress: { ipAddressHeaders: [TRUSTED_IP_HEADER] } },
    plugins: [convex({ authConfig })],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
