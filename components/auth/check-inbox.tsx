"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { FieldError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const COOLDOWN_SECONDS = 60;

// The link signs the user in and lands on /sign-in, which forwards to onboarding or their shop,
// or shows why the link didn't work (app/sign-in/page.tsx).
export const VERIFY_CALLBACK_URL = "/sign-in";

/** Shown after sign-up, or after signing in unverified: both have just sent a link. */
export function CheckInbox({ email }: { email: string }) {
  const [wait, setWait] = useState(COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function resend() {
    setSending(true);
    setStatus(null);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: VERIFY_CALLBACK_URL });
    setSending(false);
    setWait(COOLDOWN_SECONDS);
    setStatus(error
      ? { ok: false, message: error.status === 429 ? "Too many emails. Try again in an hour." : "We couldn't send it. Try again." }
      : { ok: true, message: "Sent. Check your inbox again." });
  }

  return (
    <div className="grid gap-4" role="status">
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <p className="text-sm">
          We sent a link to <span className="font-medium break-all">{email}</span>. Open it to confirm your email and
          continue. It can take a minute; check your spam folder too.
        </p>
      </div>
      {status && (status.ok
        ? <p className="text-sm text-muted-foreground">{status.message}</p>
        : <FieldError message={status.message} />)}
      <Button type="button" variant="outline" size="lg" onClick={resend} disabled={sending || wait > 0}>
        {sending ? "Sending…" : wait > 0 ? `Send again in ${wait}s` : "Send the link again"}
      </Button>
    </div>
  );
}
