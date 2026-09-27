import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { appHomeHref } from "@/lib/app-home";

export const metadata: Metadata = {
  title: "Create a free POS account",
  description:
    "Start using Payspace POS for free: checkout, receipts, stock tracking and GCash or Maya payments for your coffee shop, bakery or store. No card needed.",
  alternates: { canonical: "/sign-up" },
};

// The landing page footer sends ?email= so the visitor doesn't type it twice.
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { email } = await searchParams;
  const home = await appHomeHref();
  if (home) redirect(home);
  return (
    <AuthCard title="Create your account" description="Then set up your shop in a couple of minutes.">
      <SignUpForm defaultEmail={typeof email === "string" ? email.slice(0, 254) : ""} />
    </AuthCard>
  );
}
