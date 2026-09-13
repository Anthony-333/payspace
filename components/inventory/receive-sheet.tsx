"use client";

import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { formatUnitCost, type StockItem } from "@/components/inventory/stock-parts";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { blendAvgCost, roundAvgCost } from "@/convex/lib/costing";
import { formatMoney, parseMoney } from "@/convex/lib/money";
import { formatQty, parseQty } from "@/convex/lib/quantity";
import { errorMessage } from "@/lib/errors";

type Line = { key: number; stockItemId: string; qty: string; unit: "base" | "purchase"; total: string };

let nextKey = 1;
const blankLine = (item?: StockItem): Line => ({
  key: nextKey++,
  stockItemId: item?._id ?? "",
  qty: "",
  unit: item?.purchaseUnit ? "purchase" : "base",
  total: "",
});

type Props = { open: boolean; items: StockItem[]; initialItem: StockItem | null; onOpenChange: (open: boolean) => void };

export function ReceiveSheet({ open, onOpenChange, ...props }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {open && <ReceiveForm {...props} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function ReceiveForm({ items, initialItem, onDone }: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const shop = useShop();
  const receive = useMutation(api.inventory.receive);
  const [lines, setLines] = useState<Line[]>(() => [blankLine(initialItem ?? undefined)]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const byId = new Map(items.map((item) => [item._id as string, item]));

  const update = (key: number, patch: Partial<Line>) => {
    setError(null);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const parsed = lines.map((line) => {
    const item = byId.get(line.stockItemId);
    const qty = parseQty(line.qty);
    const total = parseMoney(line.total);
    const factor = line.unit === "purchase" ? (item?.purchaseUnit?.factor ?? null) : 1;
    const baseQty = qty !== null && factor !== null ? qty * factor : null;
    const unitCost = baseQty && total !== null ? roundAvgCost(total / baseQty) : null;
    return { line, item, qty, total, baseQty, unitCost };
  });
  const grandTotal = parsed.reduce((sum, p) => sum + (p.total ?? 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const filled = parsed.filter((p) => p.line.stockItemId || p.line.qty.trim() || p.line.total.trim());
    if (filled.length === 0) return setError("Add at least one item.");
    const bad = filled.find((p) => !p.item || !p.qty || p.total === null);
    if (bad) return setError(bad.item ? `Enter the quantity and total cost for ${bad.item.name}.` : "Choose an item for every line.");

    setSaving(true);
    try {
      await receive({
        tenantId: shop.tenantId,
        note: note.trim() || undefined,
        lines: filled.map((p) => ({
          stockItemId: p.line.stockItemId as Id<"stockItems">,
          qty: p.qty!,
          unit: p.line.unit,
          totalCost: p.total!,
        })),
      });
      toast.success(`Received ${filled.length} ${filled.length === 1 ? "item" : "items"}. Product costs update in a moment.`);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-full flex-col">
      <SheetHeader>
        <SheetTitle>Receive stock</SheetTitle>
        <SheetDescription>
          Enter each item&apos;s quantity and the total from the supplier&apos;s receipt. The cost per unit is worked out for you.
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-3 px-4 pb-4">
        {parsed.map(({ line, item, baseQty, unitCost }, index) => {
          const newAvg = item && item.avgCost !== null && baseQty && unitCost !== null
            ? blendAvgCost(item.onHand, item.avgCost, baseQty, unitCost)
            : null;
          return (
            <fieldset key={line.key} className="grid gap-3 rounded-xl border bg-card p-3">
              <legend className="sr-only">Line {index + 1}</legend>
              <div className="flex gap-2">
                <Select
                  value={line.stockItemId}
                  onValueChange={(stockItemId) => update(line.key, { stockItemId, unit: byId.get(stockItemId)?.purchaseUnit ? "purchase" : "base" })}
                >
                  <SelectTrigger className="h-11 min-w-0 flex-1" aria-label={`Line ${index + 1}: item`}>
                    <SelectValue placeholder="Choose item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((option) => (
                      <SelectItem key={option._id} value={option._id}>{option.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-11"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                <div className="grid gap-1">
                  <Label htmlFor={`qty-${line.key}`} className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    id={`qty-${line.key}`}
                    inputMode="decimal"
                    className="h-11 tabular-nums"
                    placeholder="0"
                    value={line.qty}
                    onChange={(e) => update(line.key, { qty: e.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`unit-${line.key}`} className="text-xs text-muted-foreground">Unit</Label>
                  <Select
                    value={line.unit}
                    onValueChange={(unit) => update(line.key, { unit: unit as Line["unit"] })}
                    disabled={!item?.purchaseUnit}
                  >
                    <SelectTrigger id={`unit-${line.key}`} className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {item?.purchaseUnit && <SelectItem value="purchase">{item.purchaseUnit.name}</SelectItem>}
                      <SelectItem value="base">{item?.baseUnit ?? "base unit"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 grid gap-1 sm:col-span-1">
                  <Label htmlFor={`total-${line.key}`} className="text-xs text-muted-foreground">Total cost (₱)</Label>
                  <Input
                    id={`total-${line.key}`}
                    inputMode="decimal"
                    className="h-11 tabular-nums"
                    placeholder="0.00"
                    value={line.total}
                    onChange={(e) => update(line.key, { total: e.target.value })}
                  />
                </div>
              </div>

              {item && baseQty !== null && baseQty > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatQty(baseQty, item.baseUnit)}
                  {unitCost !== null && ` at ${formatUnitCost(unitCost, item.baseUnit)}`}
                  {newAvg !== null && item.avgCost !== null && newAvg !== item.avgCost &&
                    ` · average ${formatUnitCost(item.avgCost, item.baseUnit)} → ${formatUnitCost(newAvg, item.baseUnit)}`}
                </p>
              )}
            </fieldset>
          );
        })}

        <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => setLines((current) => [...current, blankLine()])}>
          <Plus /> Add another item
        </Button>

        <div className="grid gap-2">
          <Label htmlFor="receive-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            id="receive-note"
            className="h-11"
            maxLength={200}
            placeholder="Supplier, invoice number"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <SheetFooter className="mt-auto border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Receipt total</span>
          <span className="text-lg font-semibold tabular-nums">{formatMoney(grandTotal)}</span>
        </div>
        <Button type="submit" size="lg" className="h-12" disabled={saving}>
          {saving ? "Saving…" : "Receive stock"}
        </Button>
      </SheetFooter>
    </form>
  );
}
