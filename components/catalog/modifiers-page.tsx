"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { IngredientLines, readIngredientRows, toIngredientRows } from "@/components/inventory/ingredient-lines";
import type { StockItem } from "@/components/inventory/stock-parts";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatMoney, moneyToInput, parseMoney } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Group = Doc<"modifierGroups">;

function selectionText(group: Pick<Group, "minSelect" | "maxSelect">) {
  const { minSelect: min, maxSelect: max } = group;
  if (min === 1 && max === 1) return "Pick 1";
  if (min === 0 && max === 1) return "Optional, pick 1";
  if (min === 0) return `Optional, up to ${max}`;
  return min === max ? `Pick ${min}` : `Pick ${min} to ${max}`;
}

function priceText(delta: number) {
  if (delta === 0) return "";
  return delta > 0 ? `+${formatMoney(delta)}` : formatMoney(delta);
}

export function ModifiersPage() {
  const shop = useShop();
  const tenantId = shop.tenantId;
  const manage = canManage(shop.role);
  const groups = useQuery(api.modifiers.list, { tenantId });
  const items = useQuery(api.inventory.listItems, manage ? { tenantId } : "skip");
  const remove = useMutation(api.modifiers.remove);
  const [editing, setEditing] = useState<{ group: Group | null } | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  return (
    <>
      <PageHeader
        title="Modifiers"
        description="Choices a customer makes, like size or milk. Attach them to products."
        actions={manage && (
          <Button size="lg" className="h-10" onClick={() => setEditing({ group: null })}>
            <Plus /> Add modifier group
          </Button>
        )}
      />

      {groups === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No modifier groups yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <Card key={group._id}>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>{selectionText(group)}</CardDescription>
                {manage && (
                  <CardAction className="flex gap-1">
                    <Button variant="ghost" size="icon-lg" aria-label={`Edit ${group.name}`} onClick={() => setEditing({ group })}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-lg" aria-label={`Delete ${group.name}`} onClick={() => setDeleting(group)}>
                      <Trash2 />
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm">
                  {group.options.map((option) => (
                    <li key={option.key} className="flex items-center gap-2">
                      <span>{option.name}</span>
                      {option.recipeDelta.length > 0 && <Badge variant="outline">Changes recipe</Badge>}
                      <span className="ml-auto tabular-nums text-muted-foreground">{priceText(option.priceDelta)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {manage && (
        <GroupDialog open={editing !== null} group={editing?.group ?? null} items={items ?? []} onClose={() => setEditing(null)} />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;s removed from every product that uses it. Past sales keep the options they were sold with.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await remove({ tenantId, modifierGroupId: deleting._id });
                  toast.success(`Deleted ${deleting.name}.`);
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const schema = z.object({
  name: z.string().trim().min(1, "Enter a group name.").max(40),
  minSelect: z.number({ error: "Enter a number." }).int().min(0),
  maxSelect: z.number({ error: "Enter a number." }).int().min(1, "At least 1."),
  options: z.array(z.object({
    key: z.string().optional(),
    name: z.string().trim().min(1, "Enter a name.").max(40),
    price: z.string().refine((v) => v.trim() === "" || parseMoney(v, { allowNegative: true }) !== null, "Not an amount."),
    recipe: z.array(z.object({ stockItemId: z.string(), qty: z.string() })),
  }).superRefine((option, ctx) => {
    const { error } = readIngredientRows(option.recipe, { allowNegative: true });
    if (error) ctx.addIssue({ code: "custom", message: error, path: ["recipe"] });
  })).min(1, "Add at least one option."),
}).refine((v) => v.minSelect <= v.maxSelect && v.maxSelect <= v.options.length, {
  message: "The minimum can't be above the maximum, and the maximum can't be above the number of options.",
  path: ["maxSelect"],
});

type Values = z.infer<typeof schema>;

function defaults(group: Group | null): Values {
  return group
    ? {
      name: group.name,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      options: group.options.map((o) => ({
        key: o.key,
        name: o.name,
        price: o.priceDelta ? moneyToInput(o.priceDelta) : "",
        recipe: toIngredientRows(o.recipeDelta),
      })),
    }
    : { name: "", minSelect: 0, maxSelect: 1, options: [{ name: "", price: "", recipe: [] }, { name: "", price: "", recipe: [] }] };
}

function GroupDialog({ open, group, items, onClose }: { open: boolean; group: Group | null; items: StockItem[]; onClose: () => void }) {
  const shop = useShop();
  const create = useMutation(api.modifiers.create);
  const update = useMutation(api.modifiers.update);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(group) });
  const options = useFieldArray({ control: form.control, name: "options" });
  const watchedOptions = useWatch({ control: form.control, name: "options" });
  const { errors, isSubmitting } = form.formState;
  // Which options have their recipe changes expanded, by field id. A reset gives fields new ids.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) form.reset(defaults(group));
  }, [open, group, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      tenantId: shop.tenantId,
      name: values.name,
      minSelect: values.minSelect,
      maxSelect: values.maxSelect,
      options: values.options.map((o) => ({
        key: o.key,
        name: o.name,
        priceDelta: o.price.trim() ? parseMoney(o.price, { allowNegative: true })! : 0,
        recipeDelta: readIngredientRows(o.recipe, { allowNegative: true }).lines,
      })),
    };
    try {
      if (group) await update({ ...payload, modifierGroupId: group._id });
      else await create(payload);
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
            <DialogTitle>{group ? "Edit modifier group" : "Add modifier group"}</DialogTitle>
            <DialogDescription>
              Leave the price empty for options that cost nothing extra. Use a minus for a discount.
              Recipe changes adjust stock and cost, like +60 ml of milk for a large.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" className="h-11" placeholder="Size, Milk, Add-ons" {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="min">Customer must pick at least</Label>
              <Input id="min" type="number" inputMode="numeric" min={0} className="h-11" {...form.register("minSelect", { valueAsNumber: true })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max">and at most</Label>
              <Input id="max" type="number" inputMode="numeric" min={1} className="h-11" {...form.register("maxSelect", { valueAsNumber: true })} />
            </div>
          </div>
          <FieldError message={errors.minSelect?.message ?? errors.maxSelect?.message} />

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Options</legend>
            {options.fields.map((field, index) => {
              const open = expanded.has(field.id);
              const changes = (watchedOptions?.[index]?.recipe ?? []).filter((r) => r.stockItemId).length;
              return (
                <div key={field.id} className="grid gap-1">
                  <div className="flex gap-2">
                    <Input aria-label={`Option ${index + 1} name`} placeholder="Name" className="h-11 flex-1" {...form.register(`options.${index}.name`)} />
                    <Input aria-label={`Option ${index + 1} price change`} placeholder="+₱0.00" inputMode="decimal" className="h-11 w-28" {...form.register(`options.${index}.price`)} />
                    <Button
                      type="button" variant="ghost" size="icon-lg" className="size-11" aria-label={`Remove option ${index + 1}`}
                      disabled={options.fields.length === 1}
                      onClick={() => options.remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <FieldError message={errors.options?.[index]?.name?.message ?? errors.options?.[index]?.price?.message} />
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(field.id)) next.delete(field.id);
                      else next.add(field.id);
                      return next;
                    })}
                    className="flex min-h-11 w-fit items-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
                    Recipe changes{changes > 0 ? ` (${changes})` : ""}
                  </button>
                  {open && (
                    <div className="rounded-lg bg-muted p-2">
                      <Controller
                        control={form.control}
                        name={`options.${index}.recipe`}
                        render={({ field: recipe }) => (
                          <IngredientLines
                            items={items}
                            rows={recipe.value}
                            onChange={recipe.onChange}
                            allowNegative
                            label={`Option ${index + 1} ingredient`}
                          />
                        )}
                      />
                    </div>
                  )}
                  <FieldError message={errors.options?.[index]?.recipe?.message} />
                </div>
              );
            })}
            <FieldError message={errors.options?.message ?? errors.options?.root?.message} />
            <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => options.append({ name: "", price: "", recipe: [] })}>
              <Plus /> Add option
            </Button>
          </fieldset>

          <DialogFooter>
            <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
