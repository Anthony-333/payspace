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

type Tone = "dark" | "violet" | "green" | "blue";

const TILES: { label: string; icon: LucideIcon; value: (t: Totals) => number; money: boolean; tone: Tone }[] = [
  { label: "Sales", icon: Coins, value: (t) => t.revenue, money: true, tone: "dark" },
  { label: "Gross profit", icon: TrendingUp, value: (t) => t.profit, money: true, tone: "violet" },
  { label: "Orders", icon: ShoppingBag, value: (t) => t.orders, money: false, tone: "green" },
  { label: "Average ticket", icon: Receipt, value: (t) => t.averageTicket, money: true, tone: "blue" },
];

// Bento tiles, like the landing page: the lead number on a dark card, the rest on pastels.
// Every text colour here passes AA on its own background.
const TONES: Record<Tone, { card: string; chip: string; well: string; soft: string }> = {
  dark: { card: "bg-foreground text-background", chip: "bg-background/10", well: "bg-background text-foreground", soft: "text-background/75" },
  violet: { card: "bg-tint-violet text-tint-violet-foreground", chip: "bg-card", well: "bg-foreground text-background", soft: "" },
  green: { card: "bg-tint-green text-tint-green-foreground", chip: "bg-card", well: "bg-foreground text-background", soft: "" },
  blue: { card: "bg-tint-blue text-tint-blue-foreground", chip: "bg-card", well: "bg-foreground text-background", soft: "" },
};

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
          <div key={tile.label} className={cn("flex flex-col gap-4 rounded-xl p-4 sm:p-5", TONES[tile.tone].card)}>
            <span className={cn("inline-flex w-fit max-w-full items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-semibold", TONES[tile.tone].chip, tile.tone !== "dark" && "text-foreground")}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", TONES[tile.tone].well)}>
                <tile.icon className="size-3.5" />
              </span>
              <span className="truncate">{tile.label}</span>
            </span>
            <div>
            <div className={cn("text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl", tile.tone !== "dark" && "text-foreground", loading && "animate-pulse opacity-60")}>
              {loading ? "—" : tile.money ? (
                <><span className="font-normal opacity-60">₱</span>{formatMoney(value, "")}</>
              ) : value.toLocaleString("en-PH")}
            </div>
            <div className={cn("mt-1 flex items-center gap-1 text-xs", TONES[tile.tone].soft)}>
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
