"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Camera, ExternalLink, ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/convex/lib/money";

// The shop's own copy of a receipt: the receipt the customer got, with the photos taken of each
// payment beside it. Only the receipt prints; the photos are for the shop's records and never
// appear on the customer's link (they can show the customer's name and number).

const METHOD_NAMES: Record<string, string> = { cash: "Cash", ewallet: "E-wallet", card: "Card" };

export function StaffReceipt({ saleId }: { saleId: string }) {
  const shop = useShop();
  const data = useQuery(api.sales.receipt, { tenantId: shop.tenantId, saleId });
  const [open, setOpen] = useState<number | null>(null);

  const back = (
    <Button asChild variant="ghost" className="h-11 w-fit print:hidden">
      <Link href={`/${shop.slug}/receipts`}><ArrowLeft className="size-4" /> All receipts</Link>
    </Button>
  );

  if (data === undefined) {
    return (
      <div className="grid gap-4">
        {back}
        <div className="h-96 w-full max-w-[80mm] animate-pulse rounded-xl bg-card" />
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="grid gap-4">
        {back}
        <div className="grid max-w-sm gap-3 rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <ReceiptIcon className="mx-auto size-8" />
          <p className="font-medium text-foreground">This receipt isn&apos;t here.</p>
          <p className="text-sm">It may belong to another shop, or to a sale someone else rang up.</p>
        </div>
      </div>
    );
  }

  const { receipt, photos } = data;
  const viewing = open === null ? null : photos[open];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        {back}
        <Button asChild variant="outline" className="h-11">
          <Link href={`/r/${data.receiptToken}`} target="_blank">
            <ExternalLink className="size-4" /> Customer link
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[80mm_minmax(0,1fr)] print:block">
        <ReceiptView receipt={receipt} />

        <section aria-labelledby="payment-photos" className="grid gap-3 rounded-xl border bg-card p-4 print:hidden">
          <div>
            <h2 id="payment-photos" className="font-semibold">Payment photos</h2>
            <p className="text-sm text-muted-foreground">
              Rung up by {data.staffName}. Kept for your records; they don&apos;t print and the customer&apos;s link doesn&apos;t show them.
            </p>
          </div>
          {photos.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <Camera className="size-4 shrink-0" /> No photos were taken for this sale.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => setOpen(index)}
                    disabled={!photo.url}
                    className="grid w-full gap-2 rounded-lg border p-2 text-left transition-colors outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, resized on upload
                      <img src={photo.url} alt={`Photo of the ${METHOD_NAMES[photo.method]} payment`} className="aspect-[4/3] w-full rounded-md bg-muted object-cover" />
                    ) : (
                      <span className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                        Photo missing
                      </span>
                    )}
                    <span className="grid text-sm">
                      <span className="flex justify-between gap-2 font-medium">
                        {METHOD_NAMES[photo.method] ?? photo.method}
                        <span className="tabular-nums">{formatMoney(photo.amount)}</span>
                      </span>
                      {photo.ref && <span className="truncate text-muted-foreground">{photo.ref}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={viewing !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="w-full! gap-3 p-3 sm:max-w-3xl!">
          {viewing && (
            <>
              <DialogTitle className="px-2 pt-1">
                {METHOD_NAMES[viewing.method] ?? viewing.method} · {formatMoney(viewing.amount)}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Photo taken of this payment at the till.
              </DialogDescription>
              {viewing.url && (
                // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, resized on upload
                <img src={viewing.url} alt="" className="max-h-[80dvh] w-full rounded-lg bg-muted object-contain" />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
