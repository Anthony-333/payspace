"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import type { StockItem } from "@/components/inventory/stock-parts";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, roundMinor } from "@/convex/lib/money";
import { parseQty, qtyToInput } from "@/convex/lib/quantity";

/** One editable ingredient line, kept as the text people type until the form is saved. */
export type IngredientRow = { stockItemId: string; qty: string };

export function toIngredientRows(lines: { stockItemId: string; qty: number }[]): IngredientRow[] {
  return lines.map((line) => ({ stockItemId: line.stockItemId, qty: qtyToInput(line.qty) }));
}

/** Turns rows into lines for Convex, skipping blank rows. Returns the first problem as `error`. */
export function readIngredientRows(rows: IngredientRow[], { allowNegative = false } = {}) {
  const lines: { stockItemId: Id<"stockItems">; qty: number }[] = [];
  for (const row of rows) {
    if (!row.stockItemId && !row.qty.trim()) continue;
    if (!row.stockItemId) return { lines, error: "Choose an ingredient for every amount." };
    const qty = parseQty(row.qty, { allowNegative });
    if (qty === null || qty === 0) {
      return { lines, error: allowNegative ? "Enter an amount, like 60 or -60." : "Enter an amount above 0 for every ingredient." };
    }
    lines.push({ stockItemId: row.stockItemId as Id<"stockItems">, qty });
  }
  return { lines, error: null };
}

type Props = {
  items: StockItem[];
  rows: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
  /** Modifier options can take ingredients away ("no milk"). */
  allowNegative?: boolean;
  showCost?: boolean;
  label: string;
};

export function IngredientLines({ items, rows, onChange, allowNegative = false, showCost = false, label }: Props) {
  const shop = useShop();
  const byId = new Map(items.map((item) => [item._id as string, item]));
  const update = (index: number, patch: Partial<IngredientRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        No stock items yet.{" "}
        <Link href={`/${shop.slug}/inventory`} className="font-medium text-primary underline-offset-4 hover:underline">
          Add ingredients in Inventory
        </Link>{" "}
        first.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => {
        const item = byId.get(row.stockItemId);
        const qty = parseQty(row.qty, { allowNegative });
        const cost = showCost && item?.avgCost != null && qty !== null ? roundMinor(qty * item.avgCost) : null;
        const taken = new Set(rows.filter((_, i) => i !== index).map((r) => r.stockItemId));
        return (
          <div key={index} className="grid gap-1">
            <div className="flex gap-2">
              <Select value={row.stockItemId} onValueChange={(stockItemId) => update(index, { stockItemId })}>
                <SelectTrigger size="lg" className="min-w-0 flex-1 [contain:inline-size]" aria-label={`${label} ${index + 1}: ingredient`}>
                  <SelectValue placeholder="Choose ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((option) => (
                    <SelectItem key={option._id} value={option._id} disabled={taken.has(option._id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-24 shrink-0 sm:w-28">
                <Input
                  inputMode="decimal"
                  className="h-11 pr-10 text-right tabular-nums"
                  placeholder="0"
                  aria-label={`${label} ${index + 1}: amount${item ? ` in ${item.baseUnit}` : ""}`}
                  value={row.qty}
                  onChange={(e) => update(index, { qty: e.target.value })}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  {item?.baseUnit ?? ""}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="size-11"
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>
            {cost !== null && (
              <p className="pr-13 text-right text-xs text-muted-foreground tabular-nums">{formatMoney(cost)}</p>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="h-11 w-fit"
        onClick={() => onChange([...rows, { stockItemId: "", qty: "" }])}
      >
        <Plus /> Add ingredient
      </Button>
    </div>
  );
}
