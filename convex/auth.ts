import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
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
    // Verification needs Resend; turn it on before pilots (see docs/progress.md).
    emailAndPassword: { enabled: true, requireEmailVerification: false },
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
        // Called on every page load, and by the Next.js server on users' behalf; nothing to guess.
        "/get-session": false,
        "/convex/token": false,
      },
    },
    // Set by convex/http.ts from the proxy's signed header or the caller's address; never by the client.
    advanced: { ipAddress: { ipAddressHeaders: [TRUSTED_IP_HEADER] } },
    plugins: [convex({ authConfig })],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
