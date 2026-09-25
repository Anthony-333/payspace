"use client";

import { useQuery } from "convex/react";
import { Banknote, Camera, ChevronRight, CreditCard, Receipt, Smartphone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatBusinessDate } from "@/convex/lib/businessDate";
import { formatMoney } from "@/convex/lib/money";

// Every sale keeps its receipt, so one can be reopened or reprinted at the counter at any time.
// Week 5 adds search, date ranges, voids and refunds on top of this list.

const METHOD_ICONS: Record<string, LucideIcon> = { cash: Banknote, ewallet: Smartphone, card: CreditCard };

export function ReceiptsPage() {
  const shop = useShop();
  const sales = useQuery(api.sales.recent, { tenantId: shop.tenantId });

  if (sales === undefined) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center text-muted-foreground">
        <Receipt className="size-8" />
        <p>No sales yet. Receipts appear here as soon as you ring one up.</p>
        <Button asChild size="lg" className="h-11"><Link href={`/${shop.slug}/pos`}>Go to the till</Link></Button>
      </div>
    );
  }

  // Newest first, grouped under the shop's own business day.
  const days = new Map<string, typeof sales>();
  for (const sale of sales) days.set(sale.businessDate, [...(days.get(sale.businessDate) ?? []), sale]);

  return (
    <div className="grid gap-6">
      {[...days].map(([date, forDay]) => (
        <section key={date} className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {formatBusinessDate(date)} · {formatMoney(forDay.reduce((sum, sale) => sum + sale.total, 0))}
          </h2>
          <ul className="grid gap-2">
            {forDay.map((sale) => (
              <li key={sale._id}>
                <Link
                  href={`/${shop.slug}/receipts/${sale._id}`}
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Receipt className="size-5" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-semibold">
                      #{String(sale.number).padStart(4, "0")}
                      {sale.status !== "completed" && (
                        <span className="ml-2 text-sm font-medium text-destructive capitalize">{sale.status}</span>
                      )}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {new Date(sale.at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{sale.itemCount} {sale.itemCount === 1 ? "item" : "items"}
                      {" · "}{sale.staffName}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {sale.methods.map((method) => {
                      const Icon = METHOD_ICONS[method] ?? Banknote;
                      return <Icon key={method} className="size-4 text-muted-foreground" aria-label={method} />;
                    })}
                    {sale.photoCount > 0 && (
                      <Camera
                        className="size-4 text-muted-foreground"
                        aria-label={`${sale.photoCount} payment ${sale.photoCount === 1 ? "photo" : "photos"}`}
                      />
                    )}
                    <span className="font-semibold tabular-nums">{formatMoney(sale.total)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
