import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

// Better Auth is identity only: shops, staff and roles live in `tenants` and `members`.
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Verification needs Resend; turn it on before pilots (see docs/progress.md).
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    plugins: [convex({ authConfig })],
  });
