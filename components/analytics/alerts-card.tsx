"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, PackageX, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useShop } from "@/components/shop/shop-provider";
import { api } from "@/convex/_generated/api";
import { formatBps, formatMoney } from "@/convex/lib/money";
import { formatQty } from "@/convex/lib/quantity";
import { cn } from "@/lib/utils";

// What needs attention, on the screen someone lands on. Status is never colour alone: each
// row carries an icon and words as well.

const STATUS: Record<string, { label: string; className: string }> = {
  negative: { label: "Below zero", className: "text-destructive" },
  out: { label: "Out of stock", className: "text-destructive" },
  low: { label: "Running low", className: "text-foreground" },
};

export function AlertsCard() {
  const shop = useShop();
  const alerts = useQuery(api.analytics.alerts, { tenantId: shop.tenantId });

  if (alerts === undefined) return <div className="h-48 animate-pulse rounded-xl border bg-card" />;

  const nothingWrong = alerts.stock.length === 0 && alerts.margin.length === 0;

  return (
    <section className="rounded-xl border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Needs attention</h2>
        {!nothingWrong && (
          <Link href={`/${shop.slug}/inventory`} className="text-sm font-medium text-primary hover:underline">
            Inventory
          </Link>
        )}
      </header>

      {nothingWrong ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 shrink-0" />
          Stock levels and margins are all healthy.
        </p>
      ) : (
        <div className="grid gap-4">
          {alerts.stock.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PackageX className="size-4 shrink-0 text-muted-foreground" />
                Stock ({alerts.stockCount})
              </h3>
              <ul className="grid gap-1 text-sm">
                {alerts.stock.slice(0, 5).map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className={cn("shrink-0 tabular-nums", STATUS[item.status]?.className)}>
                      {formatQty(item.onHand, item.baseUnit)}
                      <span className="ml-2 text-xs text-muted-foreground">{STATUS[item.status]?.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {alerts.stockCount > 5 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  and {alerts.stockCount - 5} more
                </p>
              )}
            </div>
          )}

          {alerts.margin.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <TrendingDown className="size-4 shrink-0 text-muted-foreground" />
                Under the {formatBps(alerts.targetMarginBps).replace(".0%", "%")} target margin
              </h3>
              <ul className="grid gap-1 text-sm">
                {alerts.margin.slice(0, 5).map((product) => (
                  <li key={product._id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{product.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatMoney(product.price)}
                      {product.marginBps !== null && (
                        <span className="ml-2 text-foreground">{formatBps(product.marginBps)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Stock is allowed to go below zero so the queue keeps moving; count the item when you can.
          </p>
        </div>
      )}
    </section>
  );
}
