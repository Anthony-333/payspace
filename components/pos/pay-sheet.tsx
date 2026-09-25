"use client";

import { useMutation } from "convex/react";
import { Banknote, Check, CreditCard, Delete, Printer, Receipt, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useCartStore, type PayMethod } from "@/components/pos/cart-store";
import type { InvoiceLine } from "@/components/pos/invoice-panel";
import { Price } from "@/components/pos/parts";
import { PaymentPhotoButton, type PaymentPhoto } from "@/components/pos/payment-photo";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { formatMoney, parseMoney } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";
import { resizeImage, uploadFile } from "@/lib/image";
import { cn } from "@/lib/utils";

// Taking payment, following docs/prototypes/pos-checkout.html: cash with quick tender and
// change, e-wallet and card with a reference, and any of them split across the order. Any
// payment can carry a photo for the shop's records; it shows on the staff receipt, never the printout.

const TABS: { value: PayMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "ewallet", label: "E-wallet", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
];

const PROVIDERS = ["GCash", "Maya", "Other"];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
/** Kept in step with MAX_PAYMENT_REF in convex/lib/sale.ts, which is what actually enforces it. */
const MAX_PAYMENT_REF = 30;

/** `key` ties a payment to its photo in `photos`, which also holds the two live lines below. */
type Taken = { key: string; method: PayMethod; amount: number; ref?: string };
const DRAFT = "draft"; // the card or e-wallet amount being typed
const CASH = "cash";
/** Big enough to read a reference number off a phone screen, small enough for shop Wi-Fi. */
const PHOTO_SIZE = 1280;
type Done = { number: number; total: number; changeGiven: number; receiptToken: string };

const amountOf = (typed: string) => (typed ? (parseMoney(typed) ?? 0) : 0);

/** Exact, then the notes a customer is most likely to hand over for that amount. */
function quickAmounts(due: number): [string, number][] {
  const out: [string, number][] = [["Exact", due]];
  const seen = new Set([due]);
  const push = (value: number) => {
    if (out.length < 4 && value > due && !seen.has(value)) {
      seen.add(value);
      out.push([formatMoney(value).replace(/\.00$/, ""), value]);
    }
  };
  for (const note of [50, 100, 200, 500, 1000]) push(Math.ceil(due / (note * 100)) * note * 100);
  for (const note of [100_000, 200_000, 500_000]) push(note);
  return out;
}

export function PaySheet({ open, onOpenChange, lines, total, itemCount }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: InvoiceLine[];
  total: number;
  itemCount: number;
}) {
  const shop = useShop();
  const checkout = useMutation(api.sales.checkout);
  const generatePhotoUploadUrl = useMutation(api.sales.generatePhotoUploadUrl);
  const clear = useCartStore((s) => s.clear);
  const ensureRef = useCartStore((s) => s.ensureRef);

  const [tab, setTab] = useState<PayMethod>("cash");
  const [cash, setCash] = useState("");
  const [typed, setTyped] = useState("");
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [reference, setReference] = useState("");
  const [taken, setTaken] = useState<Taken[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [photos, setPhotos] = useState<Record<string, PaymentPhoto>>({});

  function reset() {
    setTab("cash");
    setCash("");
    setTyped("");
    setReference("");
    setProvider(PROVIDERS[0]);
    setTaken([]);
    setDone(null);
    for (const photo of Object.values(photos)) URL.revokeObjectURL(photo.preview);
    setPhotos({});
  }

  /**
   * Shrinks and uploads a payment photo straight away. The upload finds its photo again by the
   * preview URL, since the line it was taken on may have moved (a typed card added to the split).
   */
  async function pickPhoto(key: string, file: File) {
    let preview: string | null = null;
    try {
      const blob = await resizeImage(file, PHOTO_SIZE);
      const url = URL.createObjectURL(blob);
      preview = url;
      setPhotos((current) => {
        if (current[key]) URL.revokeObjectURL(current[key].preview);
        return { ...current, [key]: { preview: url, storageId: null } };
      });
      const storageId = await uploadFile(await generatePhotoUploadUrl({ tenantId: shop.tenantId }), blob);
      setPhotos((current) => Object.fromEntries(Object.entries(current).map(([k, photo]) =>
        [k, photo.preview === url ? { ...photo, storageId } : photo])));
    } catch (error) {
      console.error("payment photo failed", error);
      toast.error("That photo didn't upload. Take it again.");
      if (preview) {
        const failed = preview;
        setPhotos((current) => Object.fromEntries(Object.entries(current).filter(([, photo]) => photo.preview !== failed)));
        URL.revokeObjectURL(failed);
      }
    }
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const photo = current[key];
      if (!photo) return current;
      URL.revokeObjectURL(photo.preview);
      return Object.fromEntries(Object.entries(current).filter(([k]) => k !== key));
    });
  }

  const uploading = Object.values(photos).some((photo) => !photo.storageId);
  const photoId = (key: string) => {
    const storageId = photos[key]?.storageId;
    return storageId ? { photoId: storageId } : {};
  };

  const takenSum = taken.reduce((sum, payment) => sum + payment.amount, 0);
  const beforeCash = Math.max(0, total - takenSum);
  const cashAmount = amountOf(cash);
  const typedAmount = tab === "cash" ? 0 : amountOf(typed);
  // A card or e-wallet amount is only counted once it fits inside what is still owed.
  const pending = typedAmount > 0 && typedAmount <= beforeCash ? typedAmount : 0;
  const paid = takenSum + pending + cashAmount;
  const remaining = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  const covered = paid >= total;

  function press(key: string) {
    const current = tab === "cash" ? cash : typed;
    const set = tab === "cash" ? setCash : setTyped;
    if (key === "back") return set(current.slice(0, -1));
    if (key === "." && (current.includes(".") || !current)) return;
    // Two decimals is as fine as money gets, and a leading zero never helps.
    if (/\.\d\d$/.test(current)) return;
    set(current === "0" && key !== "." ? key : current + key);
  }

  /** Adds the typed card or e-wallet payment, leaving the rest to be split another way. */
  function addTaken() {
    if (!pending) return;
    const label = tab === "ewallet" ? provider : "Card";
    const trimmed = reference.trim();
    const ref = trimmed ? `${label} ${trimmed}`.slice(0, MAX_PAYMENT_REF) : undefined;
    const key = crypto.randomUUID();
    setTaken([...taken, { key, method: tab, amount: pending, ...(ref ? { ref } : {}) }]);
    // The draft's photo moves with it, so the next card or e-wallet starts without one.
    setPhotos((current) => {
      const draft = current[DRAFT];
      if (!draft) return current;
      const rest = Object.fromEntries(Object.entries(current).filter(([k]) => k !== DRAFT));
      return { ...rest, [key]: draft };
    });
    setTyped("");
    setReference("");
    setTab("cash");
  }

  async function complete() {
    if (busy) return;
    if (!covered) {
      toast.error(`${formatMoney(remaining)} still to collect.`);
      return;
    }
    if (lines.length === 0) {
      toast.error("There is nothing on this order.");
      return;
    }
    if (uploading) {
      toast.error("A payment photo is still uploading.");
      return;
    }
    // Made here if the order hasn't got one, so the same reference is reused on a retry.
    const clientRef = ensureRef(shop.tenantId);
    const payments = taken.map(({ key, ...payment }) => ({ ...payment, ...photoId(key) }));
    if (pending) {
      const label = tab === "ewallet" ? provider : "Card";
      const trimmed = reference.trim();
      const ref = trimmed ? `${label} ${trimmed}`.slice(0, MAX_PAYMENT_REF) : undefined;
      payments.push({ method: tab, amount: pending, ...(ref ? { ref } : {}), ...photoId(DRAFT) });
    }
    // Cash is last, so the change comes out of the drawer and not off a card.
    if (cashAmount > 0) payments.push({ method: "cash", amount: cashAmount, ...photoId(CASH) });

    setBusy(true);
    try {
      const sale = await checkout({
        tenantId: shop.tenantId,
        clientRef,
        lines: lines.map((line) => ({
          productId: line.product!._id,
          qty: line.qty,
          optionKeys: line.options,
        })),
        payments,
      });
      setDone({
        number: sale.number,
        total: sale.total,
        changeGiven: sale.changeGiven,
        receiptToken: sale.receiptToken,
      });
      clear(shop.tenantId);
    } catch (error) {
      // The reference is kept, so pressing Complete sale again retries the same order
      // rather than risking a second one.
      console.error("checkout failed", error);
      toast.error(errorMessage(error, "That order didn't go through. Try again."));
    } finally {
      setBusy(false);
    }
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95dvh] w-full! gap-0 overflow-y-auto p-0 sm:max-w-3xl!"
      >
        {done ? (
          <Completed done={done} slug={shop.slug} onNewOrder={() => close(false)} />
        ) : (
          <>
            <header className="flex items-start justify-between gap-3 border-b p-5">
              <div>
                <DialogTitle className="text-2xl font-semibold">Take payment</DialogTitle>
                <DialogDescription>
                  {itemCount} {itemCount === 1 ? "item" : "items"} · {formatMoney(total)} due
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" className="size-10" onClick={() => close(false)} aria-label="Back to order">
                <X className="size-5" />
              </Button>
            </header>

            <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              {/* What has been collected so far */}
              <section aria-label="Payment summary" className="flex flex-col gap-3 rounded-xl bg-muted p-4">
                <div>
                  <div className="text-sm text-muted-foreground">Amount due</div>
                  <Price amount={total} className="text-3xl" />
                </div>
                <ul className="grid gap-2 text-sm">
                  {taken.map((payment) => (
                    <li key={payment.key} className="flex items-center gap-2 rounded-lg bg-card p-2 pl-3">
                      <span className="grid min-w-0 flex-1">
                        <strong className="font-medium capitalize">{methodLabel(payment.method)}</strong>
                        {payment.ref && <small className="truncate text-muted-foreground">Ref {payment.ref}</small>}
                      </span>
                      <Price amount={payment.amount} />
                      <PaymentPhotoButton
                        photo={photos[payment.key]}
                        label={`the ${methodLabel(payment.method)} payment`}
                        onPick={(file) => pickPhoto(payment.key, file)}
                        onRemove={() => removePhoto(payment.key)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`Remove ${methodLabel(payment.method)} payment`}
                        onClick={() => {
                          setTaken(taken.filter((other) => other.key !== payment.key));
                          removePhoto(payment.key);
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                  {pending > 0 && (
                    <li className="flex items-center gap-2 rounded-lg border border-dashed bg-card/50 p-2 pl-3">
                      <span className="grid min-w-0 flex-1">
                        <strong className="font-medium">{tab === "ewallet" ? provider : "Card"}</strong>
                        <small className="text-muted-foreground">Added when you complete the sale</small>
                      </span>
                      <Price amount={pending} />
                      <PaymentPhotoButton
                        photo={photos[DRAFT]}
                        label={`the ${tab === "ewallet" ? provider : "card"} payment`}
                        onPick={(file) => pickPhoto(DRAFT, file)}
                        onRemove={() => removePhoto(DRAFT)}
                      />
                    </li>
                  )}
                  {cashAmount > 0 && (
                    <li className="flex items-center gap-2 rounded-lg bg-card p-2 pl-3">
                      <span className="grid min-w-0 flex-1">
                        <strong className="font-medium">Cash</strong>
                        <small className="text-muted-foreground">Received from customer</small>
                      </span>
                      <Price amount={cashAmount} />
                      <PaymentPhotoButton
                        photo={photos[CASH]}
                        label="the cash"
                        onPick={(file) => pickPhoto(CASH, file)}
                        onRemove={() => removePhoto(CASH)}
                      />
                    </li>
                  )}
                  {taken.length === 0 && !pending && cashAmount === 0 && (
                    <li className="rounded-lg border border-dashed p-3 text-muted-foreground">No payment yet</li>
                  )}
                </ul>
                <div
                  aria-live="polite"
                  className={cn(
                    "mt-auto flex items-baseline justify-between rounded-lg p-3 text-sm font-medium",
                    covered ? "bg-primary/10 text-primary" : "bg-card",
                  )}
                >
                  <span>{!covered ? "Still to collect" : change > 0 ? "Change due" : "Paid in full"}</span>
                  <Price amount={covered ? change : remaining} className="text-lg" />
                </div>
              </section>

              {/* How the next payment is being taken */}
              <section aria-label="Payment method" className="grid content-start gap-3">
                <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted p-1">
                  {TABS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={tab === option.value}
                      onClick={() => {
                        if (option.value === tab) return;
                        setTab(option.value);
                        setTyped("");
                        removePhoto(DRAFT); // a photo of one card doesn't prove the next method
                      }}
                      className={cn(
                        "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        tab === option.value ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <option.icon className="size-5" />
                      {option.label}
                    </button>
                  ))}
                </div>

                {tab !== "cash" && beforeCash === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    This order is already covered. Complete the sale, or remove a payment to change it.
                  </p>
                ) : (
                  <>
                    {tab === "ewallet" && (
                      <div role="group" aria-label="E-wallet" className="flex flex-wrap gap-2">
                        {PROVIDERS.map((name) => (
                          <button
                            key={name}
                            type="button"
                            aria-pressed={provider === name}
                            onClick={() => setProvider(name)}
                            className={cn(
                              "min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                              provider === name ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                            )}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
                      <div className="min-w-0">
                        <div className="text-sm text-muted-foreground">
                          {tab === "cash" ? "Cash received" : tab === "ewallet" ? `${provider} amount` : "Card amount"}
                        </div>
                        <div className="truncate text-3xl font-semibold tabular-nums">
                          <span className="font-normal text-muted-foreground">₱</span>
                          {(tab === "cash" ? cash : typed) || "0"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="h-10 shrink-0 text-muted-foreground"
                        onClick={() => (tab === "cash" ? setCash("") : setTyped(""))}
                      >
                        Clear
                      </Button>
                    </div>

                    {tab === "cash" ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {quickAmounts(beforeCash).map(([label, value]) => (
                          <Button
                            key={label}
                            variant="outline"
                            className="h-12 text-base font-semibold tabular-nums"
                            onClick={() => setCash(String(value / 100))}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Input
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                        maxLength={MAX_PAYMENT_REF}
                        autoComplete="off"
                        aria-label={tab === "ewallet" ? "Reference number" : "Approval code"}
                        placeholder={tab === "ewallet" ? "Reference number from the customer's app" : "Approval code (optional)"}
                      />
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      {KEYS.map((key) => (
                        <Button
                          key={key}
                          variant="outline"
                          className="h-14 text-lg font-semibold"
                          onClick={() => press(key)}
                          aria-label={key === "back" ? "Delete" : key}
                        >
                          {key === "back" ? <Delete className="size-5" /> : key}
                        </Button>
                      ))}
                    </div>

                    {tab !== "cash" && (
                      <Button variant="secondary" className="h-12" disabled={!pending} onClick={addTaken}>
                        {typedAmount > beforeCash
                          ? `That is more than the ${formatMoney(beforeCash)} still due`
                          : `Add ${formatMoney(pending)} and split the rest`}
                      </Button>
                    )}
                  </>
                )}
              </section>
            </div>

            <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card p-5">
              <span className="text-sm text-muted-foreground">
                {!covered
                  ? paid > 0 ? `${formatMoney(remaining)} more to collect` : "Enter the cash received, or choose another method"
                  : change > 0 ? `Give ${formatMoney(change)} change` : "Exact amount received"}
              </span>
              <Button size="lg" className="h-13 px-6 text-base font-semibold" disabled={!covered || busy || uploading} onClick={complete}>
                {busy ? "Completing…" : uploading ? "Uploading photo…" : "Complete sale"}
              </Button>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function methodLabel(method: PayMethod) {
  return method === "ewallet" ? "E-wallet" : method === "card" ? "Card" : "Cash";
}

/** After the sale: the change to hand over, and the receipt, which stays available for good. */
function Completed({ done, slug, onNewOrder }: { done: Done; slug: string; onNewOrder: () => void }) {
  return (
    <div className="grid gap-5 p-6 text-center">
      <DialogTitle className="sr-only">Sale complete</DialogTitle>
      <DialogDescription className="sr-only">
        Receipt {done.number} for {formatMoney(done.total)}.
      </DialogDescription>
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-7" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">
          {done.changeGiven > 0 ? "Change due" : "Paid in full"}
        </p>
        <p className="text-5xl font-bold tabular-nums">{formatMoney(done.changeGiven)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Receipt #{String(done.number).padStart(4, "0")} · {formatMoney(done.total)}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" size="lg" className="h-12">
          <Link href={`/r/${done.receiptToken}?print=1`} target="_blank">
            <Printer className="size-4" /> Print receipt
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12">
          <Link href={`/${slug}/receipts`}>
            <Receipt className="size-4" /> All receipts
          </Link>
        </Button>
      </div>
      <Button size="lg" className="h-13 text-base font-semibold" onClick={onNewOrder} autoFocus>
        New order
      </Button>
    </div>
  );
}
