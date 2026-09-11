import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthCard title="Create your account" description="Then set up your shop in a couple of minutes.">
      <SignUpForm />
    </AuthCard>
  );
}
