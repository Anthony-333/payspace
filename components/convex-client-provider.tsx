"use client";

import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import "@/lib/zod-config";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// @convex-dev/better-auth 0.12.5 types its prop against better-auth 1.6.15; 1.6.31's inferred
// session type no longer matches. Runtime is unaffected. Remove when the component catches up.
const client = authClient as unknown as AuthClient;

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={client} initialToken={initialToken}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
