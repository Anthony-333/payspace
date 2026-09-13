"use client";

import type { FunctionReturnType } from "convex/server";
import { Badge } from "@/components/ui/badge";
import type { api } from "@/convex/_generated/api";
import { formatMoney } from "@/convex/lib/money";
import type { BaseUnit, StockStatus } from "@/convex/lib/quantity";

export type StockItem = FunctionReturnType<typeof api.inventory.listItems>[number];

/** Average costs can be fractions of a centavo (₱1.199 a gram), so show up to 4 decimals of a peso. */
export function formatUnitCost(avgCost: number, unit: BaseUnit) {
  const text = Number.isInteger(avgCost)
    ? formatMoney(avgCost)
    : `₱${(avgCost / 100).toFixed(4).replace(/0{1,2}$/, "")}`;
  return `${text} / ${unit}`;
}

/** What a purchase unit costs at the current average, like "₱1,199.00 per 1 kg bag". */
export function formatPurchaseCost(item: Pick<StockItem, "avgCost" | "purchaseUnit">) {
  if (item.avgCost === null || !item.purchaseUnit) return null;
  return `${formatMoney(Math.round(item.avgCost * item.purchaseUnit.factor))} per ${item.purchaseUnit.name}`;
}

const STATUS = {
  negative: { label: "Below zero", variant: "destructive" },
  out: { label: "Out", variant: "secondary" },
  low: { label: "Low", variant: "outline" },
  ok: null,
} as const;

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const shown = STATUS[status];
  return shown ? <Badge variant={shown.variant}>{shown.label}</Badge> : null;
}

export function formatDateTime(ms: number) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(ms);
}
