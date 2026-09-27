import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeNext } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Payspace POS to open your shop's checkout, stock and profit dashboard.",
  alternates: { canonical: "/sign-in" },
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Sign in" description="Welcome back. Sign in to open your shop.">
      <SignInForm next={safeNext(next)} />
    </AuthCard>
  );
}
