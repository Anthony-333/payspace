"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { IngredientLines, readIngredientRows, toIngredientRows, type IngredientRow } from "@/components/inventory/ingredient-lines";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { checkBarcode, LIMITS } from "@/convex/lib/catalog";
import { recipeCost, suggestedPrice } from "@/convex/lib/costing";
import { formatBps, formatMoney, grossMarginBps, moneyToInput, parseMoney, roundMinor } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";
import { resizeImage, uploadFile } from "@/lib/image";
import { cn } from "@/lib/utils";

export type Product = FunctionReturnType<typeof api.products.get>;

const KINDS = [
  { value: "stocked", label: "Stocked item", hint: "Sold as is and counted on the shelf, like a canned drink." },
  { value: "recipe", label: "Made from ingredients", hint: "Uses ingredients from stock, like a latte or bread." },
  { value: "service", label: "Service", hint: "No stock, like gift wrapping or printing." },
] as const;

const NO_CATEGORY = "none";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(LIMITS.productName),
  kind: z.enum(["stocked", "recipe", "service"]),
  categoryId: z.string(),
  price: z.string().refine((v) => parseMoney(v) !== null, "Enter a price, like 140 or 140.50."),
  cost: z.string().refine((v) => v.trim() === "" || parseMoney(v) !== null, "Enter a cost, like 35.50."),
  barcode: z.string().trim().refine((v) => v === "" || checkBarcode(v) === null, "Use letters and digits with no spaces."),
  sku: z.string().trim().max(LIMITS.sku, `Up to ${LIMITS.sku} characters.`),
  modifierGroupIds: z.array(z.string()),
});

type Values = z.infer<typeof schema>;

function defaults(product: Product | null): Values {
  return {
    name: product?.name ?? "",
    kind: product?.kind ?? "stocked",
    categoryId: product?.categoryId ?? NO_CATEGORY,
    price: product ? moneyToInput(product.price) : "",
    cost: product && product.kind !== "recipe" && product.unitCost ? moneyToInput(product.unitCost) : "",
    barcode: product?.barcode ?? "",
    sku: product?.sku ?? "",
    modifierGroupIds: product?.modifierGroupIds ?? [],
  };
}

type Photo = { imageId?: Id<"_storage">; file?: File; previewUrl: string } | null;

type FormProps = {
  product: Product | null;
  categories: Doc<"categories">[];
  groups: Doc<"modifierGroups">[];
  tenant: Pick<Doc<"tenants">, "taxRateBps" | "pricesIncludeTax" | "targetMarginBps"> | undefined;
  onDone: () => void;
};

export function ProductFormSheet({
  open,
  onOpenChange,
  ...props
}: Omit<FormProps, "onDone"> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full! overflow-y-auto sm:max-w-lg!">
        {/* Mounted fresh each time the sheet opens, so the form starts from the product. */}
        <ProductForm {...props} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function ProductForm({ product, categories, groups, tenant, onDone }: FormProps) {
  const shop = useShop();
  const showCost = canManage(shop.role);
  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const claimUpload = useMutation(api.products.claimUpload);
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Photo>(
    product?.imageId && product.imageUrl ? { imageId: product.imageId, previewUrl: product.imageUrl } : null,
  );

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(product) });
  const { errors, isSubmitting } = form.formState;
  const [kind, price, cost] = useWatch({ control: form.control, name: ["kind", "price", "cost"] });

  useEffect(() => () => {
    if (photo?.file) URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  // Recipe: ingredients come from inventory; the saved lines load once, then edits are kept locally.
  const items = useQuery(api.inventory.listItems, showCost ? { tenantId: shop.tenantId } : "skip");
  const savedRecipe = useQuery(
    api.recipes.forProduct,
    showCost && product?.kind === "recipe" ? { tenantId: shop.tenantId, productId: product._id } : "skip",
  );
  const [editedRecipe, setEditedRecipe] = useState<IngredientRow[] | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const recipeRows = editedRecipe ?? (savedRecipe ? toIngredientRows(savedRecipe) : []);
  const recipeReady = items !== undefined && (product?.kind !== "recipe" || savedRecipe !== undefined);

  // Stocked: once a delivery is received, the cost comes from receiving (decisions log, 2026-09-14).
  const stockItem = useQuery(
    api.inventory.getItem,
    showCost && product?.kind === "stocked" && product.stockItemId
      ? { tenantId: shop.tenantId, stockItemId: product.stockItemId }
      : "skip",
  );
  const costLocked = stockItem !== undefined && stockItem.lastReceivedAt !== undefined;

  const priceMinor = parseMoney(price);
  let costMinor: number | null;
  if (kind === "recipe") {
    costMinor = items
      ? recipeCost(readIngredientRows(recipeRows).lines, new Map(items.map((i) => [i._id, { avgCost: i.avgCost ?? 0 }])))
      : (product?.unitCost ?? 0);
  } else {
    costMinor = costLocked ? roundMinor(stockItem.avgCost ?? 0) : parseMoney(cost);
  }
  const margin = tenant && priceMinor !== null && costMinor !== null && costMinor > 0
    ? grossMarginBps(priceMinor, costMinor, tenant.taxRateBps, tenant.pricesIncludeTax)
    : null;
  const suggested = tenant && costMinor ? suggestedPrice(costMinor, tenant) : null;

  const onSubmit = form.handleSubmit(async (values) => {
    const recipe = readIngredientRows(recipeRows);
    if (values.kind === "recipe" && recipe.error) {
      setRecipeError(recipe.error);
      return;
    }
    let imageId = photo?.imageId;
    if (photo?.file) {
      try {
        imageId = await uploadFile(await generateUploadUrl({ tenantId: shop.tenantId }), await resizeImage(photo.file));
        await claimUpload({ tenantId: shop.tenantId, storageId: imageId });
      } catch (err) {
        toast.error(errorMessage(err, "Couldn't upload that photo. Try another one."));
        return;
      }
    }
    try {
      const fields = {
        tenantId: shop.tenantId,
        name: values.name,
        price: parseMoney(values.price)!,
        categoryId: values.categoryId === NO_CATEGORY ? undefined : (values.categoryId as Id<"categories">),
        barcode: values.barcode || undefined,
        sku: values.sku || undefined,
        imageId,
        modifierGroupIds: values.modifierGroupIds as Id<"modifierGroups">[],
        cost: values.kind !== "recipe" && !costLocked && values.cost.trim() ? parseMoney(values.cost)! : undefined,
        // Only send the recipe for a new product, or when the saved one was loaded and changed.
        recipe: values.kind === "recipe" && (!product || editedRecipe !== null) ? recipe.lines : undefined,
      };
      if (product) {
        await update({ ...fields, productId: product._id });
        toast.success(`Saved ${values.name}.`);
      } else {
        await create({ ...fields, kind: values.kind });
        toast.success(`Added ${values.name}.`);
      }
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-full flex-col">
      <SheetHeader>
        <SheetTitle>{product ? "Edit product" : "Add product"}</SheetTitle>
        <SheetDescription>
          {product ? "Changes apply to new sales. Past sales keep their original price and cost." : "It appears on your checkout screen right away."}
        </SheetDescription>
      </SheetHeader>

      <div className="grid grid-cols-1 gap-5 px-4 pb-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground"
            aria-label={photo ? "Change photo" : "Add photo"}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, already resized
              <img src={photo.previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6" />
            )}
          </button>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <span>A square photo works best. It&apos;s resized before upload.</span>
            {photo && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setPhoto(null)}>
                <X /> Remove photo
              </Button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhoto({ file, previewUrl: URL.createObjectURL(file) });
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" className="h-11" {...form.register("name")} />
          <FieldError message={errors.name?.message} />
        </div>

        {!product && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Type</legend>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <div className="grid gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      aria-pressed={field.value === k.value}
                      onClick={() => field.onChange(k.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        field.value === k.value ? "border-primary ring-1 ring-primary" : "hover:bg-muted",
                      )}
                    >
                      <span className="block text-sm font-medium">{k.label}</span>
                      <span className="block text-xs text-muted-foreground">{k.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </fieldset>
        )}

        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="category" size="lg" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="price">Price (₱)</Label>
            <Input id="price" inputMode="decimal" className="h-11" placeholder="0.00" {...form.register("price")} />
            <FieldError message={errors.price?.message} />
          </div>
          {showCost && kind !== "recipe" && !costLocked && (
            <div className="grid gap-2">
              <Label htmlFor="cost">{kind === "stocked" ? "Cost per piece (₱)" : "Cost (₱)"}</Label>
              <Input id="cost" inputMode="decimal" className="h-11" placeholder="Optional" {...form.register("cost")} />
              <FieldError message={errors.cost?.message} />
            </div>
          )}
          {showCost && (kind === "recipe" || costLocked) && (
            <div className="grid content-start gap-2">
              <span className="text-sm font-medium">{kind === "recipe" ? "Cost" : "Cost per piece"}</span>
              <span className="flex h-11 flex-col justify-center text-sm">
                {costMinor ? (
                  <span className="font-medium tabular-nums">{formatMoney(costMinor)}</span>
                ) : (
                  <span className="text-muted-foreground">Add ingredients below</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {kind === "recipe" ? "From the recipe" : "Average of the stock you received"}
                </span>
              </span>
            </div>
          )}
        </div>
        {showCost && tenant && (margin !== null || suggested !== null) && (
          <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {margin !== null && (
              <span className={cn(margin < tenant.targetMarginBps ? "text-destructive" : "text-muted-foreground")}>
                Gross margin {formatBps(margin)}
                {tenant.pricesIncludeTax && tenant.taxRateBps > 0 ? " after VAT" : ""}
                {margin < tenant.targetMarginBps ? `, below your ${formatBps(tenant.targetMarginBps)} target` : ""}.
              </span>
            )}
            {suggested !== null && suggested !== priceMinor && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-left whitespace-normal"
                onClick={() => form.setValue("price", moneyToInput(suggested), { shouldValidate: true, shouldDirty: true })}
              >
                Use {formatMoney(suggested)} for a {formatBps(tenant.targetMarginBps)} margin
              </Button>
            )}
          </div>
        )}

        {showCost && kind === "recipe" && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Recipe <span className="font-normal text-muted-foreground">(for one sold, before modifiers)</span>
            </legend>
            {recipeReady ? (
              <IngredientLines
                items={items}
                rows={recipeRows}
                onChange={(rows) => { setEditedRecipe(rows); setRecipeError(null); }}
                showCost
                label="Ingredient"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading ingredients…</p>
            )}
            <FieldError message={recipeError ?? undefined} />
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" className="h-11" placeholder="Scan or type" autoComplete="off" {...form.register("barcode")} />
            <FieldError message={errors.barcode?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" className="h-11" placeholder="Optional" {...form.register("sku")} />
            <FieldError message={errors.sku?.message} />
          </div>
        </div>

        {groups.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Modifiers</legend>
            <Controller
              control={form.control}
              name="modifierGroupIds"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-1">
                  {groups.map((g) => {
                    const checked = field.value.includes(g._id);
                    return (
                      <label key={g._id} className="flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(on) =>
                            field.onChange(on ? [...field.value, g._id] : field.value.filter((id) => id !== g._id))}
                        />
                        <span className="text-sm">{g.name}</span>
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {g.options.map((o) => o.name).join(", ")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </fieldset>
        )}
      </div>

      <SheetFooter className="mt-auto border-t">
        <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : product ? "Save changes" : "Add product"}
        </Button>
      </SheetFooter>
    </form>
  );
}
