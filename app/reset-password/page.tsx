import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

// The emailed link goes through Better Auth, which sends the visitor here with ?token=
// when it's valid, or ?error=INVALID_TOKEN when it has expired.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <AuthCard title="This link has expired" description="Reset links work for 1 hour and only once.">
        <Link
          href="/forgot-password"
          className="text-sm font-medium underline underline-offset-4"
        >
          Send me a new link
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" description="You'll use it to sign in from now on.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
