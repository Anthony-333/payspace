"use client";

import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import posthog from "posthog-js";
import { useEffect, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import "@/lib/zod-config";

// expectAuth holds every query until the auth provider has set (or cleared) the token, so a
// signed-in page never fires a userQuery/tenantQuery without its identity on first load.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, { expectAuth: true });

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
      <PostHogIdentity />
      {children}
    </ConvexBetterAuthProvider>
  );
}

/**
 * Keeps browser analytics attached to the signed-in Better Auth user, by id only (no email or name).
 * Compares against PostHog's persisted identity rather than this page load's, so a session that
 * expired while the tab was closed, or another staff member on a shared tablet, starts clean.
 */
function PostHogIdentity() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (isPending || !posthog.__loaded) return;

    const identified = posthog._isIdentified();
    if (!userId) {
      if (identified) posthog.reset();
      return;
    }
    if (identified && posthog.get_distinct_id() === userId) return;
    if (identified) posthog.reset();
    posthog.identify(userId);
  }, [isPending, userId]);

  return null;
}
