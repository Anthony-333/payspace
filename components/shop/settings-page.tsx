"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { PageHeader } from "@/components/shop/page-header";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { formatMoney, taxBreakdown } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";

/** What a shop that switches VAT back on most likely wants (the Philippine rate). */
const DEFAULT_RATE = 12;
/** The preview is worked out on one ₱100.00 item, so the numbers are easy to check by eye. */
const SAMPLE = 10_000;

// VAT off is stored as a 0% rate, not as a separate flag, so there is only ever one
// answer to "what tax does this shop charge" (CLAUDE.md rule 6: the server prices everything).
const schema = z
  .object({
    vatEnabled: z.boolean(),
    taxRate: z.number({ error: "Enter a VAT rate." }).min(0, "Enter a VAT rate.").max(100),
    pricesIncludeTax: z.boolean(),
  })
  .refine((values) => !values.vatEnabled || values.taxRate > 0, {
    path: ["taxRate"],
    message: "Enter a rate above 0%, or switch VAT off.",
  });

type Values = z.infer<typeof schema>;

export function SettingsPage() {
  const shop = useShop();
  const router = useRouter();
  const owner = shop.role === "owner";
  const tenant = useQuery(api.tenants.get, owner ? { tenantId: shop.tenantId } : "skip");
  const updateSettings = useMutation(api.tenants.updateSettings);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { vatEnabled: true, taxRate: DEFAULT_RATE, pricesIncludeTax: true },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const values = useWatch({ control: form.control });

  // Only owners change tax settings; the server refuses anyone else (tenants.updateSettings).
  useEffect(() => {
    if (!owner) router.replace(`/${shop.slug}`);
  }, [owner, router, shop.slug]);

  // Fill the form once, from the first read. Later live updates must not overwrite typing.
  const filled = useRef(false);
  useEffect(() => {
    if (!tenant || filled.current) return;
    filled.current = true;
    form.reset({
      vatEnabled: tenant.taxRateBps > 0,
      taxRate: tenant.taxRateBps / 100,
      pricesIncludeTax: tenant.pricesIncludeTax,
    });
  }, [tenant, form]);

  const onSubmit = form.handleSubmit(async (next) => {
    setError(null);
    const taxRateBps = next.vatEnabled ? Math.round(next.taxRate * 100) : 0;
    try {
      await updateSettings({ tenantId: shop.tenantId, taxRateBps, pricesIncludeTax: next.pricesIncludeTax });
    } catch (err) {
      setError(errorMessage(err));
      return;
    }
    form.reset(next); // keeps what was saved, and clears the dirty state
    toast.success(next.vatEnabled ? "VAT settings saved." : "VAT is off. New sales won't add VAT.");
  });

  if (!owner) return null;

  const vatEnabled = values.vatEnabled ?? true;
  // A half-typed or cleared rate must not put "₱NaN" on the preview.
  const typed = values.taxRate;
  const rate = vatEnabled && Number.isFinite(typed) ? Math.round(typed! * 100) : 0;
  const preview = taxBreakdown(SAMPLE, rate, values.pricesIncludeTax ?? true);

  return (
    <>
      <PageHeader title="Settings" description={`How ${shop.name} charges tax.`} />

      {tenant === undefined ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <form onSubmit={onSubmit} className="grid max-w-2xl gap-5" noValidate>
          <section className="grid gap-5 rounded-xl border bg-card p-5">
            <header>
              <h2 className="font-semibold">VAT</h2>
              <p className="text-sm text-muted-foreground">
                Switch this off if your shop isn&apos;t VAT-registered. Past sales keep the VAT they were rung up with.
              </p>
            </header>

            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <span id="vat-enabled-label" className="text-sm font-medium">Charge VAT</span>
                <span className="text-sm text-muted-foreground">
                  {vatEnabled ? "The checkout and receipts show a VAT line." : "No VAT is added, and receipts show no VAT line."}
                </span>
              </div>
              <Switch
                checked={vatEnabled}
                onCheckedChange={(on) => {
                  form.setValue("vatEnabled", on, { shouldDirty: true });
                  // Coming back from off, offer the usual rate rather than saving 0% by accident.
                  if (on && !form.getValues("taxRate")) form.setValue("taxRate", DEFAULT_RATE);
                  void form.trigger("taxRate");
                }}
                aria-labelledby="vat-enabled-label"
              />
            </div>

            <div className="grid gap-2 sm:max-w-48">
              <Label htmlFor="taxRate">VAT rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                disabled={!vatEnabled}
                className="h-11 tabular-nums"
                aria-invalid={errors.taxRate ? true : undefined}
                {...form.register("taxRate", { valueAsNumber: true })}
              />
              <FieldError message={errors.taxRate?.message} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <span id="prices-include-vat-label" className="text-sm font-medium">Prices include VAT</span>
                <span className="text-sm text-muted-foreground">
                  {(values.pricesIncludeTax ?? true)
                    ? "The price on the tag is what the customer pays."
                    : "VAT is added on top of the price at checkout."}
                </span>
              </div>
              <Switch
                checked={values.pricesIncludeTax ?? true}
                onCheckedChange={(on) => form.setValue("pricesIncludeTax", on, { shouldDirty: true })}
                aria-labelledby="prices-include-vat-label"
              />
            </div>

            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="mb-1 font-medium">An item priced {formatMoney(SAMPLE)}</p>
              <dl className="grid gap-1">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Net</dt>
                  <dd className="tabular-nums text-foreground">{formatMoney(preview.net)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>VAT</dt>
                  <dd className="tabular-nums text-foreground">{formatMoney(preview.tax)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Customer pays</dt>
                  <dd className="tabular-nums">{formatMoney(preview.total)}</dd>
                </div>
              </dl>
            </div>

            <p className="text-sm text-muted-foreground">
              Changing this re-checks every product&apos;s margin in the background, and applies to the checkout right away.
            </p>
          </section>

          <FieldError message={error ?? undefined} />
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="h-11 px-5" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-11"
                onClick={() => {
                  setError(null);
                  if (tenant) {
                    form.reset({
                      vatEnabled: tenant.taxRateBps > 0,
                      taxRate: tenant.taxRateBps / 100,
                      pricesIncludeTax: tenant.pricesIncludeTax,
                    });
                  }
                }}
              >
                Discard
              </Button>
            )}
          </div>
        </form>
      )}
    </>
  );
}
