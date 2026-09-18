"use client";

import { Banknote, CreditCard, ShoppingBag, Smartphone, type LucideIcon } from "lucide-react";
import { EMPTY_CART, useCartStore, type PayMethod } from "@/components/pos/cart-store";
import { Price, ProductThumb, Stepper } from "@/components/pos/parts";
import { describeLine, type Group, type SaleProduct } from "@/components/pos/pricing";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatBps, taxBreakdown } from "@/convex/lib/money";
import { cn } from "@/lib/utils";

const METHODS: { value: PayMethod; label: string; icon: LucideIcon }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "ewallet", label: "E-wallet", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
];

export type InvoiceLine = {
  id: string;
  qty: number;
  /** The chosen option refs, exactly as checkout will send them. */
  options: string[];
  product: SaleProduct | undefined;
  details: { unitPrice: number; optionNames: string[] } | null;
};

/** Joins cart lines to the live catalog. Lines whose product or option is gone can't be sold. */
export function useInvoice(products: SaleProduct[] | undefined, groups: Map<string, Group>) {
  const shop = useShop();
  const cart = useCartStore((s) => s.carts[shop.tenantId] ?? EMPTY_CART);
  const byId = new Map((products ?? []).map((p) => [p._id as string, p]));
  const lines: InvoiceLine[] = cart.lines.map((line) => {
    const product = byId.get(line.productId);
    return {
      id: line.id,
      qty: line.qty,
      options: line.options,
      product,
      details: product ? describeLine(product, groups, line.options) : null,
    };
  });
  const sellable = lines.filter((l) => l.details);
  const subtotal = sellable.reduce((sum, l) => sum + l.details!.unitPrice * l.qty, 0);
  const itemCount = sellable.reduce((sum, l) => sum + l.qty, 0);
  return { cart, lines, subtotal, itemCount, hasUnavailable: sellable.length < lines.length };
}

export function InvoicePanel({ invoice, tenant, onPlaceOrder, className }: {
  invoice: ReturnType<typeof useInvoice>;
  tenant: Pick<Doc<"tenants">, "taxRateBps" | "pricesIncludeTax"> | undefined;
  /** The payment sheet lives once, on the POS screen, so it is never nested inside the order sheet. */
  onPlaceOrder: () => void;
  className?: string;
}) {
  const shop = useShop();
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);
  const setMethod = useCartStore((s) => s.setMethod);
  const { cart, lines, subtotal, itemCount } = invoice;
  const tax = tenant ? taxBreakdown(subtotal, tenant.taxRateBps, tenant.pricesIncludeTax) : null;

  return (
    <section aria-label="Invoice" className={cn("flex min-h-0 flex-col rounded-xl border bg-card", className)}>
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-2xl font-semibold">Invoice</h2>
        {lines.length > 0 && (
          <Button variant="ghost" className="h-10 text-muted-foreground" onClick={() => clear(shop.tenantId)}>
            Clear
          </Button>
        )}
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground">
          <ShoppingBag className="size-8" />
          Tap a product to start an order.
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
          {lines.map((line) => (
            <li key={line.id} className="flex gap-3">
              <ProductThumb name={line.product?.name ?? "?"} imageUrl={line.product?.imageUrl ?? null} className="size-16" />
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-semibold">{line.product?.name ?? "Removed product"}</span>
                  {line.details && <Price amount={line.details.unitPrice * line.qty} className="text-base" />}
                </div>
                {line.details ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {line.qty}× {line.details.optionNames.join(" · ")}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-destructive">No longer available. Remove it to continue.</span>
                )}
                <Stepper
                  size="sm"
                  label={line.product?.name ?? "item"}
                  value={line.qty}
                  incrementDisabled={!line.details}
                  onDecrement={() => setQty(shop.tenantId, line.id, line.qty - 1)}
                  onIncrement={() => setQty(shop.tenantId, line.id, line.qty + 1)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 border-t p-5">
        <div className="grid gap-2 rounded-xl bg-muted p-4 text-sm">
          <h3 className="mb-1 text-base font-semibold">Payment summary</h3>
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal · {itemCount} {itemCount === 1 ? "item" : "items"}</span>
            <Price amount={subtotal} className="text-foreground" />
          </div>
          {tenant && tax && tenant.taxRateBps > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>VAT {formatBps(tenant.taxRateBps).replace(".0%", "%")}{tenant.pricesIncludeTax ? " (included)" : ""}</span>
              <Price amount={tax.tax} className="text-foreground" />
            </div>
          )}
          <div className="my-1 border-t border-dashed" />
          <div className="flex items-baseline justify-between">
            <span className="font-medium">Total</span>
            <Price amount={tax?.total ?? subtotal} className="text-xl" />
          </div>
        </div>

        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-xl border bg-muted p-1">
          {METHODS.map((method) => {
            const on = cart.method === method.value;
            return (
              <button
                key={method.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMethod(shop.tenantId, method.value)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <method.icon className="size-5" />
                {method.label}
              </button>
            );
          })}
        </div>

        <Button
          size="lg"
          className="h-13 w-full text-base font-semibold"
          disabled={itemCount === 0 || invoice.hasUnavailable || !tenant}
          onClick={onPlaceOrder}
        >
          Place order
        </Button>
        {invoice.hasUnavailable && (
          <p className="-mt-2 text-center text-xs text-destructive">
            Remove the item that is no longer available to carry on.
          </p>
        )}
      </div>
    </section>
  );
}
