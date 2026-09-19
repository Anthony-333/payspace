"use client";

import type { FunctionReturnType } from "convex/server";
import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { api } from "@/convex/_generated/api";
import { formatBusinessDate } from "@/convex/lib/businessDate";
import { formatBps, formatMoney, taxFromTotals } from "@/convex/lib/money";

// The customer's receipt, on screen and on paper. The print rules in app/globals.css size it
// for 58 mm and 80 mm thermal paper; on screen it sits on a card the same width.

export type PublicReceipt = NonNullable<FunctionReturnType<typeof api.sales.byToken>>;

const METHOD_NAMES: Record<string, string> = { cash: "Cash", ewallet: "E-wallet", card: "Card" };

/** The shop's local clock time, from the same instant the business date came from. */
function timeOf(at: number) {
  return new Date(at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export function ReceiptView({ receipt, autoPrint = false }: { receipt: PublicReceipt; autoPrint?: boolean }) {
  useEffect(() => {
    // Opened from the POS with ?print=1: go straight to the print dialog.
    if (autoPrint) window.print();
  }, [autoPrint]);

  const { shop } = receipt;
  // Taken from the sale's own numbers, not the shop's settings today: a receipt issued while
  // VAT was on must keep showing it after the owner switches VAT off.
  const vat = taxFromTotals(receipt);
  return (
    <div className="mx-auto grid w-full max-w-[80mm] gap-4 print:max-w-none">
      <article className="receipt rounded-xl border bg-card p-5 font-mono text-[13px] leading-snug print:rounded-none print:border-0 print:bg-transparent print:p-0">
        <header className="grid gap-1 text-center">
          <h1 className="font-sans text-lg font-semibold">{shop.name}</h1>
          {receipt.status !== "completed" && (
            <p className="font-sans text-sm font-semibold uppercase">
              {receipt.status === "voided" ? "Voided" : "Refunded"}
            </p>
          )}
          <p className="text-muted-foreground">
            Receipt #{String(receipt.number).padStart(4, "0")}
          </p>
          <p className="text-muted-foreground">
            {formatBusinessDate(receipt.businessDate)} · {timeOf(receipt.at)}
          </p>
        </header>

        <div className="my-3 border-t border-dashed" />

        <ul className="grid gap-2">
          {receipt.lines.map((line, index) => (
            <li key={index} className="grid grid-cols-[1fr_auto] gap-x-3">
              <span className="min-w-0">
                {line.qty} × {line.name}
                {line.optionNames.length > 0 && (
                  <span className="block pl-4 text-muted-foreground">{line.optionNames.join(", ")}</span>
                )}
              </span>
              <span className="tabular-nums">{formatMoney(line.unitPrice * line.qty)}</span>
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-dashed" />

        <dl className="grid gap-1">
          <Row label="Subtotal" value={receipt.subtotal} />
          {receipt.discount > 0 && <Row label="Discount" value={-receipt.discount} />}
          {vat && (
            <Row
              label={`VAT ${formatBps(vat.rateBps).replace(".0%", "%")}${vat.includedInPrices ? " (incl.)" : ""}`}
              value={receipt.tax}
            />
          )}
          <div className="mt-1 border-t border-dashed pt-1">
            <Row label="Total" value={receipt.total} strong />
          </div>
          {receipt.payments.map((payment, index) => (
            <Row
              key={index}
              label={`${METHOD_NAMES[payment.method] ?? payment.method}${payment.ref ? ` · ${payment.ref}` : ""}`}
              value={payment.amount}
              muted
            />
          ))}
          {receipt.changeGiven > 0 && <Row label="Change" value={receipt.changeGiven} muted />}
        </dl>

        {shop.receiptFooter && (
          <p className="mt-4 text-center whitespace-pre-line text-muted-foreground">{shop.receiptFooter}</p>
        )}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          This is not an official BIR receipt.
        </p>
      </article>

      <Button variant="outline" size="lg" className="h-12 print:hidden" onClick={() => window.print()}>
        <Printer className="size-4" /> Print receipt
      </Button>
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-base font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <dt className="min-w-0 truncate">{label}</dt>
      <dd className="tabular-nums">{formatMoney(value)}</dd>
    </div>
  );
}
