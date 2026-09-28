"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { useShop } from "@/components/shop/shop-provider";
import { api } from "@/convex/_generated/api";

/** The shop's plan: undefined while loading. The server enforces every limit; this only explains them. */
export function usePlan() {
  const shop = useShop();
  return useQuery(api.billing.status, { tenantId: shop.tenantId });
}

/** True once we know the shop is on Free. Loading counts as not locked, so nothing flickers shut. */
export function useFreePlan() {
  return usePlan()?.plan === "free";
}

export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground", className)}>
      <Sparkles className="size-3" />
      Pro
    </span>
  );
}

/** Explains a Pro feature and where to get it: owners go to billing, others ask the owner. */
export function UpgradeNote({ children, className }: { children: ReactNode; className?: string }) {
  const shop = useShop();
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/20 bg-accent/50 p-4 text-sm", className)}>
      <ProBadge />
      <span className="flex-1 text-foreground/85">{children}</span>
      {shop.role === "owner" ? (
        <Link href={`/${shop.slug}/settings#billing`} className="font-semibold text-primary underline-offset-4 hover:underline">
          Upgrade
        </Link>
      ) : (
        <span className="text-muted-foreground">Ask the owner to upgrade.</span>
      )}
    </div>
  );
}
