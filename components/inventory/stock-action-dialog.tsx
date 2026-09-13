"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { StockItem } from "@/components/inventory/stock-parts";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { formatQty, parseQty, roundQty } from "@/convex/lib/quantity";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export type StockAction = { mode: "waste" | "adjust"; item: StockItem };

/** Log waste (any role) or correct one item's count (owners and managers). */
export function StockActionDialog({ action, onClose }: { action: StockAction | null; onClose: () => void }) {
  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so each opening starts with empty fields. */}
        {action && <ActionForm key={`${action.mode}-${action.item._id}`} action={action} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({ action, onClose }: { action: StockAction; onClose: () => void }) {
  const shop = useShop();
  const logWaste = useMutation(api.inventory.logWaste);
  const adjust = useMutation(api.inventory.adjust);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { item, mode } = action;
  const waste = mode === "waste";

  const qty = parseQty(amount);
  const diff = !waste && qty !== null ? roundQty(qty - item.onHand) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (qty === null || (waste && qty === 0)) {
      setError(waste ? "Enter how much was wasted." : "Enter what's on the shelf now, like 0 or 1250.");
      return;
    }
    setSaving(true);
    try {
      const args = { tenantId: shop.tenantId, stockItemId: item._id, note: note.trim() || undefined };
      if (waste) {
        await logWaste({ ...args, qty });
        toast.success(`Logged ${formatQty(qty, item.baseUnit)} of ${item.name} as waste.`);
      } else {
        const result = await adjust({ ...args, counted: qty });
        toast.success(result.diff === 0 ? `${item.name} was already right.` : `Updated ${item.name} to ${formatQty(qty, item.baseUnit)}.`);
      }
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{waste ? `Log waste: ${item.name}` : `Adjust ${item.name}`}</DialogTitle>
        <DialogDescription>
          {formatQty(item.onHand, item.baseUnit)} on hand now.{" "}
          {waste ? "Spilled, expired or damaged stock comes off the shelf." : "Enter what's really on the shelf; the difference is recorded."}
          {waste && !canManage(shop.role) && " You can log up to what's on hand; a manager can write off more."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="stock-amount">{waste ? "Amount wasted" : "Counted on hand"}</Label>
        <div className="relative">
          <Input
            id="stock-amount"
            autoFocus
            inputMode="decimal"
            className="h-12 pr-12 text-lg tabular-nums"
            placeholder="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            aria-invalid={error !== null}
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">{item.baseUnit}</span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {diff !== null && diff !== 0 && (
          <p className={cn("text-sm tabular-nums", diff < 0 ? "text-destructive" : "text-muted-foreground")}>
            {diff > 0 ? "+" : ""}{formatQty(diff, item.baseUnit)} from what the system shows.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="stock-note">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input
          id="stock-note"
          className="h-11"
          maxLength={200}
          placeholder={waste ? "Spilled, expired, damaged" : "Recount, found a box"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="submit" size="lg" className="h-11" disabled={saving} variant={waste ? "destructive" : "default"}>
          {saving ? "Saving…" : waste ? "Log waste" : "Save count"}
        </Button>
      </DialogFooter>
    </form>
  );
}
