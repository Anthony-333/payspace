"use client";

import { Coins, Minus, Receipt, ShoppingBag, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/convex/lib/money";
import { cn } from "@/lib/utils";

// A handful of headline numbers is a KPI row of stat tiles, not a chart (dataviz: "is it even
// a chart?"). Each tile is label, value, and the change against the same days a week earlier.

type Totals = {
  revenue: number;
  profit: number;
  orders: number;
  averageTicket: number;
  marginBps: number | null;
};

const TILES: { label: string; icon: LucideIcon; value: (t: Totals) => number; money: boolean }[] = [
  { label: "Sales", icon: Coins, value: (t) => t.revenue, money: true },
  { label: "Gross profit", icon: TrendingUp, value: (t) => t.profit, money: true },
  { label: "Orders", icon: ShoppingBag, value: (t) => t.orders, money: false },
  { label: "Average ticket", icon: Receipt, value: (t) => t.averageTicket, money: true },
];

/** Percent change, or null when last week had nothing to compare against. */
function change(now: number, before: number) {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export function KpiTiles({ current, previous, loading, comparison = "the same days last week" }: {
  current?: Totals;
  previous?: Totals;
  loading?: boolean;
  comparison?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map((tile) => {
        const value = current ? tile.value(current) : 0;
        const delta = current && previous ? change(value, tile.value(previous)) : null;
        const Trend = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
        return (
          <div key={tile.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              {tile.label}
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <tile.icon className="size-4" />
              </span>
            </div>
            <div className={cn("mt-2 text-2xl font-semibold tabular-nums", loading && "animate-pulse text-muted-foreground")}>
              {loading ? "—" : tile.money ? (
                <><span className="text-muted-foreground">₱</span>{formatMoney(value, "")}</>
              ) : value.toLocaleString("en-PH")}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {loading ? (
                "Loading"
              ) : delta === null ? (
                <span className="truncate">{current?.orders ? "No sales to compare with" : "No sales yet"}</span>
              ) : (
                <>
                  {/* Direction is named in the text as well as the arrow, never colour alone. */}
                  <Trend className="size-3.5 shrink-0" aria-hidden />
                  <span className="tabular-nums">{delta > 0 ? "+" : ""}{delta}%</span>
                  {/* The comparison is spelled out where there's room, and read out where
                      there isn't, rather than being truncated to "vs the same …". */}
                  <span className="hidden truncate xl:inline">vs {comparison}</span>
                  <span className="sr-only">compared with {comparison}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The margin on the range, shown beside the tiles rather than as a fifth one. */
export function MarginNote({ marginBps, targetBps }: { marginBps: number | null; targetBps: number }) {
  if (marginBps === null) return null;
  const below = marginBps < targetBps;
  return (
    <p className="text-sm text-muted-foreground">
      Gross margin <span className="font-medium text-foreground tabular-nums">{(marginBps / 100).toFixed(1)}%</span>
      {" "}against a {(targetBps / 100).toFixed(0)}% target
      {below ? " — under it for this period." : "."}
    </p>
  );
}
