"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { CheckInbox, VERIFY_CALLBACK_URL } from "@/components/auth/check-inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { error } = await authClient.signIn.email({ ...values, callbackURL: VERIFY_CALLBACK_URL });
    if (error) {
      // Right password, unconfirmed email: Better Auth has just sent a fresh link.
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(values.email);
        return;
      }
      setError(error.status === 429
        ? "Too many attempts. Wait a few minutes and try again."
        : "That email and password don't match. Try again.");
      return;
    }
    router.replace(next);
    router.refresh();
  });

  if (unverified) {
    return (
      <div className="grid gap-4">
        <p className="font-medium">Confirm your email first.</p>
        <CheckInbox email={unverified} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {notice && <p className="rounded-xl border bg-muted/40 p-4 text-sm" role="status">{notice}</p>}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        <FieldError message={errors.password?.message} />
      </div>
      <FieldError message={error ?? undefined} />
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
