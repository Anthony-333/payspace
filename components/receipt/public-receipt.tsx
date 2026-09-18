"use client";

import { useQuery } from "convex/react";
import { ReceiptIcon } from "lucide-react";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { api } from "@/convex/_generated/api";

/**
 * The receipt anyone with the link can open, at /r/[token]. No sign-in: the token is the key,
 * so a wrong one simply finds nothing rather than saying whether it might have existed.
 */
export function PublicReceipt({ token, autoPrint }: { token: string; autoPrint: boolean }) {
  const receipt = useQuery(api.sales.byToken, { token });

  if (receipt === undefined) {
    return <div className="mx-auto h-96 w-full max-w-[80mm] animate-pulse rounded-xl bg-card" />;
  }
  if (receipt === null) {
    return (
      <div className="mx-auto grid max-w-sm gap-3 rounded-xl border bg-card p-10 text-center text-muted-foreground">
        <ReceiptIcon className="mx-auto size-8" />
        <p className="font-medium text-foreground">This receipt link is not valid.</p>
        <p className="text-sm">Check the link, or ask the shop for a new one.</p>
      </div>
    );
  }
  return <ReceiptView receipt={receipt} autoPrint={autoPrint} />;
}
