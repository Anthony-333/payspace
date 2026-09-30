import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { appHomeHref } from "@/lib/app-home";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Payspace POS to open your shop's checkout, stock and profit dashboard.",
  alternates: { canonical: "/sign-in" },
};

// Better Auth sends verification links back here with ?error= when they fail, and
// /reset-password sends ?reset=1 after a new password is saved.
function noticeFor(error: unknown, reset: unknown) {
  if (reset === "1") return "Your password is changed. Sign in with the new one.";
  if (error === "TOKEN_EXPIRED") return "That confirmation link has expired. Sign in and we'll email you a new one.";
  if (typeof error === "string") return "That confirmation link didn't work. Sign in and we'll email you a new one.";
  return undefined;
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, error, reset } = await searchParams;
  // Already signed in (including straight after confirming an email): skip the form and go
  // where they were headed, or to their shop, or onboarding.
  const home = await appHomeHref();
  if (home) redirect(safeNext(next, home));
  // After signing in, "/" forwards to the shop (app/(marketing)/page.tsx).
  return (
    <AuthCard title="Sign in" description="Welcome back. Sign in to open your shop.">
      <SignInForm next={safeNext(next)} notice={noticeFor(error, reset)} />
    </AuthCard>
  );
}
