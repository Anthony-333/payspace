"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Price, ProductThumb, Stepper } from "@/components/pos/parts";
import { defaultOptions, describeLine, optionRef, type Group, type SaleProduct } from "@/components/pos/pricing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAX_LINE_QTY } from "@/components/pos/cart-store";
import { formatMoney } from "@/convex/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  product: SaleProduct | null;
  groups: Map<string, Group>;
  productGroups: Group[];
  onClose: () => void;
  onAdd: (options: string[], qty: number) => void;
};

export function ModifierDialog({ product, ...props }: Props) {
  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {product && <ModifierForm key={product._id} product={product} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function rule(group: Group) {
  if (group.minSelect >= 1 && group.maxSelect === 1) return "Required, pick 1";
  if (group.minSelect === 0 && group.maxSelect === 1) return "Optional";
  if (group.minSelect === 0) return `Optional, up to ${group.maxSelect}`;
  return group.minSelect === group.maxSelect ? `Pick ${group.minSelect}` : `Pick ${group.minSelect} to ${group.maxSelect}`;
}

function ModifierForm({ product, groups, productGroups, onAdd }: Omit<Props, "product"> & { product: SaleProduct }) {
  const [selected, setSelected] = useState(() => new Set(defaultOptions(productGroups)));
  const [qty, setQty] = useState(1);

  const countIn = (group: Group) => group.options.filter((o) => selected.has(optionRef(group._id, o.key))).length;
  const missing = productGroups.filter((g) => countIn(g) < g.minSelect);

  function toggle(group: Group, key: string) {
    const ref = optionRef(group._id, key);
    const next = new Set(selected);
    if (next.has(ref)) {
      // A required single choice can be switched but not cleared.
      if (group.minSelect >= 1 && group.maxSelect === 1) return;
      next.delete(ref);
    } else if (group.maxSelect === 1) {
      for (const o of group.options) next.delete(optionRef(group._id, o.key));
      next.add(ref);
    } else if (countIn(group) < group.maxSelect) {
      next.add(ref);
    } else {
      return;
    }
    setSelected(next);
  }

  // Canonical order: product's group order, then option order. Cart lines match on it.
  const options = productGroups.flatMap((g) =>
    g.options.map((o) => optionRef(g._id, o.key)).filter((ref) => selected.has(ref)));
  const line = describeLine(product, groups, options);
  const unitPrice = line?.unitPrice ?? product.price;

  return (
    <>
      <DialogHeader className="flex-row items-center gap-4 text-left">
        <ProductThumb name={product.name} imageUrl={product.imageUrl} className="size-16" />
        <div>
          <DialogTitle className="text-lg">{product.name}</DialogTitle>
          <DialogDescription><Price amount={product.price} className="text-foreground" /></DialogDescription>
        </div>
      </DialogHeader>

      <div className="grid gap-5">
        {productGroups.map((group) => (
          <fieldset key={group._id} className="grid gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
              <span className="font-semibold">{group.name}</span>
              <span className={cn("text-xs", countIn(group) < group.minSelect ? "font-medium text-destructive" : "text-muted-foreground")}>
                {rule(group)}
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {group.options.map((option) => {
                const on = selected.has(optionRef(group._id, option.key));
                return (
                  <button
                    key={option.key}
                    type="button"
                    role={group.maxSelect === 1 ? "radio" : "checkbox"}
                    aria-checked={on}
                    onClick={() => toggle(group, option.key)}
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      on ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
                    )}
                  >
                    <span className="grid">
                      <span className="font-medium">{option.name}</span>
                      {option.priceDelta !== 0 && (
                        <span className="text-xs text-muted-foreground">
                          {option.priceDelta > 0 ? "+" : ""}{formatMoney(option.priceDelta)}
                        </span>
                      )}
                    </span>
                    {on && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
        <Stepper
          label={product.name}
          value={qty}
          onDecrement={() => setQty((q) => Math.max(1, q - 1))}
          onIncrement={() => setQty((q) => Math.min(MAX_LINE_QTY, q + 1))}
        />
        <Button
          size="lg"
          className="h-12 flex-1 text-base font-semibold"
          disabled={missing.length > 0 || !line}
          onClick={() => onAdd(options, qty)}
        >
          {missing.length > 0 ? `Choose ${missing[0].name.toLowerCase()}` : <>Add · {formatMoney(unitPrice * qty)}</>}
        </Button>
      </DialogFooter>
    </>
  );
}
