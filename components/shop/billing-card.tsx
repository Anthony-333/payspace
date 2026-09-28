"use client";

import { useAction } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "@/components/auth/auth-card";
import { PRO_PRICE } from "@/components/marketing/content";
import { ProBadge, usePlan } from "@/components/shop/plan";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { businessDate, formatBusinessDate } from "@/convex/lib/businessDate";
import { errorMessage } from "@/lib/errors";

const PRO_FEATURES = [
  "Unlimited products",
  "Recipe costing and profit per item",
  "Margin and low-stock alerts",
  "Full dashboard history",
];

/**
 * The shop's plan, with Polar Checkout to upgrade and Polar's portal to manage it. Owners
 * only (settings is owner-only, and the server checks again). Polar confirms a payment by
 * webhook, so right after checkout the plan can take a few seconds to turn Pro.
 */
export function BillingCard({ timezone }: { timezone: string }) {
  const shop = useShop();
  const plan = usePlan();
  const startCheckout = useAction(api.billing.startCheckout);
  const openPortal = useAction(api.billing.openPortal);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Coming back from Polar: say what happened once, then tidy the URL.
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const returned = params.get("billing");
  useEffect(() => {
    if (!returned) return;
    if (returned === "success") toast.success("Thanks! Your Pro plan is being confirmed. This takes a few seconds.");
    router.replace(`${pathname}#billing`, { scroll: false });
  }, [returned, router, pathname]);

  async function go(kind: "checkout" | "portal") {
    setError(null);
    setBusy(kind);
    try {
      const url = await (kind === "checkout" ? startCheckout : openPortal)({ tenantId: shop.tenantId });
      window.location.assign(url);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  if (plan === undefined) return <Skeleton className="h-56 rounded-xl" />;
  const details = plan.details;
  const date = (ms: number | null | undefined) => (ms ? formatBusinessDate(businessDate(ms, timezone)) : null);
  const pro = plan.plan === "pro";

  let summary: string;
  if (!pro) summary = `Up to ${plan.limits.products} products and ${plan.limits.historyDays} days of dashboard history.`;
  else if (details?.status === "past_due") summary = "Your last payment didn't go through. Update your card to keep Pro.";
  else if (details?.cancelAt) summary = `Pro ends on ${date(details.cancelAt)}. You can resume it before then.`;
  else if (details?.trialEnd) summary = `Free trial until ${date(details.trialEnd)}, then US$${PRO_PRICE.usd} a month.`;
  else summary = details?.currentPeriodEnd ? `Renews on ${date(details.currentPeriodEnd)}.` : "Thanks for supporting Payspace.";

  return (
    <section id="billing" className="grid max-w-2xl scroll-mt-6 gap-5 rounded-xl border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            Plan {pro ? <ProBadge /> : <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Free</span>}
          </h2>
          <p className={details?.status === "past_due" ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {summary}
          </p>
        </div>
        <CreditCard className="size-5 text-muted-foreground" />
      </header>

      {!pro && (
        <div className="rounded-xl bg-muted p-4">
          <p className="font-medium">
            Pro: US${PRO_PRICE.usd} a month per shop{" "}
            <span className="font-normal text-muted-foreground">(about ₱{PRO_PRICE.phpApprox})</span>
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-4 text-primary" strokeWidth={2.6} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FieldError message={error ?? undefined} />
      <div className="flex flex-wrap gap-2">
        {!pro && (
          <Button size="lg" className="h-11 px-5" disabled={busy !== null} onClick={() => go("checkout")}>
            {busy === "checkout"
              ? "Opening checkout…"
              : details?.canTrial ? `Start ${plan.trialDays}-day free trial` : "Upgrade to Pro"}
          </Button>
        )}
        {details?.hasBillingAccount && (
          <Button
            size="lg"
            variant={pro ? "default" : "outline"}
            className="h-11 px-5"
            disabled={busy !== null}
            onClick={() => go("portal")}
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {!pro && details?.canTrial && `You won't be charged until the ${plan.trialDays}-day trial ends, and you can cancel before then. `}
        Payments are handled by Polar and charged in US dollars. Downgrading never deletes your data.
      </p>
    </section>
  );
}
