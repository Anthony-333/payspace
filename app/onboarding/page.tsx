import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { isAuthenticated } from "@/lib/auth-server";

export default async function OnboardingPage() {
  if (!(await isAuthenticated())) redirect("/sign-in?next=/onboarding");
  return (
    <AuthCard title="Set up your shop" description="You can change any of this later in Settings.">
      <OnboardingForm />
    </AuthCard>
  );
}
