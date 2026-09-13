"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import type { StockItem } from "@/components/inventory/stock-parts";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { moneyToInput, parseMoney } from "@/convex/lib/money";
import { parseQty, qtyToInput, UNIT_NAME, type BaseUnit } from "@/convex/lib/quantity";
import { errorMessage } from "@/lib/errors";

const qtyText = (message: string) =>
  z.string().refine((v) => v.trim() === "" || parseQty(v) !== null, message);

const schema = z.object({
  name: z.string().trim().min(1, "Enter an item name.").max(60),
  baseUnit: z.enum(["g", "ml", "pc"]),
  purchaseName: z.string().trim().max(30, "Up to 30 characters."),
  purchaseFactor: qtyText("Enter how many base units are in one."),
  reorderPoint: qtyText("Enter an amount, like 1000."),
  cost: z.string().refine((v) => v.trim() === "" || parseMoney(v) !== null, "Enter a cost, like 1199 or 0.50."),
}).refine((v) => (v.purchaseName === "") === (v.purchaseFactor.trim() === ""), {
  message: "Give the purchase unit both a name and a size, or leave both empty.",
  path: ["purchaseFactor"],
}).refine((v) => v.purchaseFactor.trim() === "" || (parseQty(v.purchaseFactor) ?? 0) > 0, {
  message: "The size must be more than 0.",
  path: ["purchaseFactor"],
});

type Values = z.infer<typeof schema>;

function defaults(item: StockItem | null): Values {
  const factor = item?.purchaseUnit?.factor;
  return {
    name: item?.name ?? "",
    baseUnit: item?.baseUnit ?? "g",
    purchaseName: item?.purchaseUnit?.name ?? "",
    purchaseFactor: factor ? qtyToInput(factor) : "",
    reorderPoint: item ? qtyToInput(item.reorderPoint) : "",
    // Typed per purchase unit when there is one, since that's how suppliers price it.
    cost: item?.avgCost ? moneyToInput(Math.round(item.avgCost * (factor ?? 1))) : "",
  };
}

type Props = { open: boolean; item: StockItem | null; onClose: () => void };

export function ItemFormDialog({ open, item, onClose }: Props) {
  const shop = useShop();
  const create = useMutation(api.inventory.createItem);
  const update = useMutation(api.inventory.updateItem);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(item) });
  const { errors, isSubmitting } = form.formState;
  const [baseUnit, purchaseName, purchaseFactor] = useWatch({ control: form.control, name: ["baseUnit", "purchaseName", "purchaseFactor"] });
  const costLocked = item?.lastReceivedAt !== undefined;
  const factor = parseQty(purchaseFactor);
  const perPurchase = purchaseName.trim() !== "" && factor !== null && factor > 0;

  useEffect(() => {
    if (open) form.reset(defaults(item));
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const purchaseUnit = values.purchaseName
      ? { name: values.purchaseName, factor: parseQty(values.purchaseFactor)! }
      : undefined;
    const costMinor = values.cost.trim() ? parseMoney(values.cost)! : undefined;
    // The field shows a rounded cost, so only send it when the cost or its unit was changed.
    const initial = defaults(item);
    const costTouched = values.cost !== initial.cost
      || values.purchaseName !== initial.purchaseName
      || values.purchaseFactor !== initial.purchaseFactor;
    const fields = {
      tenantId: shop.tenantId,
      name: values.name,
      purchaseUnit,
      reorderPoint: values.reorderPoint.trim() ? parseQty(values.reorderPoint)! : 0,
      avgCost: costLocked || !costTouched || costMinor === undefined ? undefined : costMinor / (purchaseUnit?.factor ?? 1),
    };
    try {
      if (item) await update({ ...fields, stockItemId: item._id });
      else await create({ ...fields, baseUnit: values.baseUnit });
      toast.success(`Saved ${values.name}.`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{item ? "Edit stock item" : "Add stock item"}</DialogTitle>
            <DialogDescription>
              Stock is tracked in grams, millilitres or pieces. Recipes use the same unit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" className="h-11" placeholder="Fresh milk" {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="base-unit">Measured in</Label>
            <Controller
              control={form.control}
              name="baseUnit"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={item !== null}>
                  <SelectTrigger id="base-unit" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(UNIT_NAME) as BaseUnit[]).map((unit) => (
                      <SelectItem key={unit} value={unit}>{UNIT_NAME[unit]} ({unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {item && <p className="text-xs text-muted-foreground">The unit can&apos;t change once an item exists.</p>}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">How you buy it <span className="font-normal text-muted-foreground">(optional)</span></legend>
            <div className="grid grid-cols-[1fr_9rem] gap-3">
              <Input aria-label="Purchase unit name" className="h-11" placeholder="1 L carton" {...form.register("purchaseName")} />
              <div className="relative">
                <Input
                  aria-label={`${baseUnit} in one purchase unit`}
                  inputMode="decimal"
                  className="h-11 pr-10 text-right tabular-nums"
                  placeholder="1000"
                  {...form.register("purchaseFactor")}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{baseUnit}</span>
              </div>
            </div>
            <FieldError message={errors.purchaseName?.message ?? errors.purchaseFactor?.message} />
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid content-start gap-2">
              <Label htmlFor="reorder">Reorder at ({baseUnit})</Label>
              <Input id="reorder" inputMode="decimal" className="h-11 tabular-nums" placeholder="0" {...form.register("reorderPoint")} />
              <FieldError message={errors.reorderPoint?.message} />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="item-cost">
                {perPurchase ? `Cost per ${purchaseName.trim()} (₱)` : `Cost per ${baseUnit} (₱)`}
              </Label>
              <Input
                id="item-cost"
                inputMode="decimal"
                className="h-11 tabular-nums"
                placeholder="Optional"
                disabled={costLocked}
                {...form.register("cost")}
              />
              {costLocked && <p className="text-xs text-muted-foreground">Set by the stock you receive.</p>}
              <FieldError message={errors.cost?.message} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : item ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
