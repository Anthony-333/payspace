"use client";

import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, CircleAlert, PenLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SignaturePad } from "@/components/loyalty/signature-pad";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/convex/lib/money";
import type { Signature } from "@/convex/lib/signature";
import { errorMessage } from "@/lib/errors";

const ROLE_NAMES = { owner: "Owner", manager: "Manager", cashier: "Cashier" } as const;

type Props = {
  open: boolean;
  mode: "stamp" | "redeem";
  card: { _id: Id<"loyaltyCards">; name: string; username: string; reward?: string };
  /** A receipt number to start with, when stamping from a receipt. */
  saleNumber?: number;
  onClose: () => void;
  /** After a stamp or reward is saved. */
  onDone?: () => void;
};

/**
 * Gives a stamp (for one paid receipt) or the reward, signed on the pad by whoever is at the
 * counter. The server checks the receipt again and records the signer's name and role.
 */
export function SignDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {/* Mounted only while open, so each opening starts blank. */}
        <SignForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function SignForm({ mode, card, saleNumber, onClose, onDone }: Props) {
  const shop = useShop();
  const addStamp = useMutation(api.loyalty.addStamp);
  const redeem = useMutation(api.loyalty.redeem);
  const [receipt, setReceipt] = useState(saleNumber ? String(saleNumber) : "");
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState<Signature>([]);
  const [busy, setBusy] = useState(false);

  const number = /^\d{1,9}$/.test(receipt.trim().replace(/^#/, "")) ? Number(receipt.trim().replace(/^#/, "")) : null;
  const sale = useQuery(
    api.loyalty.saleForStamp,
    mode === "stamp" && number !== null ? { tenantId: shop.tenantId, saleNumber: number } : "skip",
  );

  // Mirrors the server's checks, so the button explains itself; the server decides.
  let saleProblem: string | null = null;
  if (mode === "stamp" && number !== null && sale !== undefined) {
    if (sale === null) saleProblem = `There's no receipt #${number}.`;
    else if (sale.status !== "completed") saleProblem = `Receipt #${sale.number} was ${sale.status}.`;
    else if (sale.stampedOn) saleProblem = `Receipt #${sale.number} already earned a stamp (@${sale.stampedOn}).`;
    else if (sale.tooOld) saleProblem = `Receipt #${sale.number} is more than 14 days old.`;
  }
  const ready = signature.length > 0 && (mode === "redeem" || (sale && !saleProblem));

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (mode === "stamp") {
        const res = await addStamp({ tenantId: shop.tenantId, cardId: card._id, saleNumber: number!, signature, note: note || undefined });
        toast.success(res.full ? `Stamp ${res.stamps} of ${res.stampsRequired}. The card is full: the reward is ready.` : `Stamp ${res.stamps} of ${res.stampsRequired} given.`);
      } else {
        await redeem({ tenantId: shop.tenantId, cardId: card._id, signature, note: note || undefined });
        toast.success(`Reward given to ${card.name}. A new card has started.`);
      }
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "stamp" ? `Stamp ${card.name}'s card` : `Give ${card.name} the reward`}</DialogTitle>
        <DialogDescription>
          {mode === "stamp"
            ? "One stamp per paid receipt from the last 14 days. Sign below to confirm."
            : `${card.reward ? `${card.reward}. ` : ""}Sign below to confirm you gave it; the card then starts over.`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        {mode === "stamp" && (
          <div className="grid gap-2">
            <Label htmlFor="stamp-receipt">Receipt number</Label>
            <Input
              id="stamp-receipt"
              inputMode="numeric"
              className="h-11 w-40 tabular-nums"
              placeholder="#128"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              autoFocus={!saleNumber}
            />
            {sale && !saleProblem && (
              <p className="flex items-center gap-1.5 text-sm text-tint-green-foreground">
                <BadgeCheck className="size-4" />
                Receipt #{sale.number}: {formatMoney(sale.total)}, {new Date(sale.at).toLocaleString("en-PH", { timeZone: shop.timezone, dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
            {saleProblem && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <CircleAlert className="size-4" />
                {saleProblem}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label className="flex items-center gap-1.5"><PenLine className="size-4" /> Signature</Label>
          <SignaturePad value={signature} onChange={setSignature} disabled={busy} />
          <p className="text-xs text-muted-foreground">
            Signed by {shop.memberName} ({ROLE_NAMES[shop.role]}). This is saved with the {mode === "stamp" ? "stamp" : "reward"}.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="stamp-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="stamp-note" className="h-11" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="button" className="h-11" onClick={submit} disabled={!ready || busy}>
          {mode === "stamp" ? "Give stamp" : "Give reward"}
        </Button>
      </DialogFooter>
    </>
  );
}
