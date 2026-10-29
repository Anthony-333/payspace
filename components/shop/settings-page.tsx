"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { BillingCard } from "@/components/shop/billing-card";
import { CurrencySelect, TimezoneSelect } from "@/components/shop/locale-fields";
import { PageHeader } from "@/components/shop/page-header";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { currencySymbol, formatMoney, MAX_CURRENCY_SYMBOL, taxBreakdown } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";

/** The preview is worked out on one 100.00 item, so the numbers are easy to check by eye. */
const SAMPLE = 10_000;

// Tax off is stored as a 0% rate, not as a separate flag, so there is only ever one
// answer to "what tax does this shop charge" (CLAUDE.md rule 6: the server prices everything).
const schema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    currencySymbol: z
      .string()
      .trim()
      .max(MAX_CURRENCY_SYMBOL, `Use up to ${MAX_CURRENCY_SYMBOL} characters.`)
      .refine((s) => !/\d/.test(s), "Leave numbers out of the sign."),
    timezone: z.string().min(1),
    taxEnabled: z.boolean(),
    taxRate: z.number({ error: "Enter a tax rate." }).min(0, "Enter a tax rate.").max(100),
    pricesIncludeTax: z.boolean(),
  })
  .refine((values) => !values.taxEnabled || values.taxRate > 0, {
    path: ["taxRate"],
    message: "Enter a rate above 0%, or switch tax off.",
  });

type Values = z.infer<typeof schema>;

function fromTenant(tenant: Doc<"tenants">): Values {
  return {
    currency: tenant.currency,
    currencySymbol: tenant.currencySymbol ?? "",
    timezone: tenant.timezone,
    taxEnabled: tenant.taxRateBps > 0,
    taxRate: tenant.taxRateBps / 100,
    pricesIncludeTax: tenant.pricesIncludeTax,
  };
}

export function SettingsPage() {
  const shop = useShop();
  const router = useRouter();
  const owner = shop.role === "owner";
  const tenant = useQuery(api.tenants.get, owner ? { tenantId: shop.tenantId } : "skip");
  const updateSettings = useMutation(api.tenants.updateSettings);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: shop.currency,
      currencySymbol: "",
      timezone: shop.timezone,
      taxEnabled: false,
      taxRate: 0,
      pricesIncludeTax: true,
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const values = useWatch({ control: form.control });

  // Only owners change these settings; the server refuses anyone else (tenants.updateSettings).
  useEffect(() => {
    if (!owner) router.replace(`/${shop.slug}`);
  }, [owner, router, shop.slug]);

  // Fill the form once, from the first read. Later live updates must not overwrite typing.
  const filled = useRef(false);
  useEffect(() => {
    if (!tenant || filled.current) return;
    filled.current = true;
    form.reset(fromTenant(tenant));
  }, [tenant, form]);

  const onSubmit = form.handleSubmit(async (next) => {
    setError(null);
    const taxRateBps = next.taxEnabled ? Math.round(next.taxRate * 100) : 0;
    try {
      await updateSettings({
        tenantId: shop.tenantId,
        currency: next.currency,
        currencySymbol: next.currencySymbol,
        timezone: next.timezone,
        taxRateBps,
        pricesIncludeTax: next.pricesIncludeTax,
      });
    } catch (err) {
      setError(errorMessage(err));
      return;
    }
    form.reset(next); // keeps what was saved, and clears the dirty state
    toast.success("Settings saved.");
  });

  if (!owner) return null;

  const currency = values.currency ?? shop.currency;
  const defaultSign = currencySymbol({ currency });
  const sign = currencySymbol({ currency, currencySymbol: values.currencySymbol });
  const money = (minor: number) => formatMoney(minor, sign);

  const taxEnabled = values.taxEnabled ?? false;
  // A half-typed or cleared rate must not put "NaN" on the preview.
  const typed = values.taxRate;
  const rate = taxEnabled && Number.isFinite(typed) ? Math.round(typed! * 100) : 0;
  const preview = taxBreakdown(SAMPLE, rate, values.pricesIncludeTax ?? true);

  return (
    <>
      <PageHeader title="Settings" description={`${shop.name}'s plan, currency and how it charges tax.`} />

      {tenant === undefined ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="grid gap-5">
          <BillingCard timezone={tenant.timezone} />
          <form onSubmit={onSubmit} className="grid max-w-2xl gap-5" noValidate>
            <section className="grid gap-5 rounded-xl border bg-card p-5">
              <header>
                <h2 className="font-semibold">Currency and time zone</h2>
                <p className="text-sm text-muted-foreground">
                  The sign on prices, receipts and reports, and the clock your business day runs on. Past receipts keep
                  the sign they were issued with.
                </p>
              </header>

              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <CurrencySelect
                    id="currency"
                    value={currency}
                    onChange={(code) => form.setValue("currency", code, { shouldDirty: true })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currencySymbol">Sign (optional)</Label>
                  <Input
                    id="currencySymbol"
                    placeholder={defaultSign.trim()}
                    maxLength={MAX_CURRENCY_SYMBOL}
                    className="h-11"
                    aria-invalid={errors.currencySymbol ? true : undefined}
                    aria-describedby="currencySymbol-hint"
                    {...form.register("currencySymbol")}
                  />
                </div>
              </div>
              <p id="currencySymbol-hint" className="-mt-2 text-sm text-muted-foreground">
                Leave the sign empty to use {defaultSign.trim()}, or type your own, like Rs, kr or Br.
              </p>
              <FieldError message={errors.currencySymbol?.message} />
              {currency !== tenant.currency && (
                <p role="status" className="flex gap-2 rounded-lg bg-tint-peach p-3 text-sm text-tint-peach-foreground">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Prices aren&apos;t converted. A {formatMoney(14_000, currencySymbol({ currency: tenant.currency, currencySymbol: tenant.currencySymbol }))} item
                    becomes {money(14_000)}, so update your prices and costs after saving. Dashboard totals from before the change show with the new sign too.
                  </span>
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="timezone">Time zone</Label>
                <TimezoneSelect
                  id="timezone"
                  value={values.timezone ?? shop.timezone}
                  onChange={(zone) => form.setValue("timezone", zone, { shouldDirty: true })}
                />
                <p className="text-sm text-muted-foreground">
                  Sales count toward the day it is in this time zone. Changing it doesn&apos;t move past sales.
                </p>
              </div>
            </section>

            <section className="grid gap-5 rounded-xl border bg-card p-5">
              <header>
                <h2 className="font-semibold">Tax</h2>
                <p className="text-sm text-muted-foreground">
                  Sales tax, VAT or GST. Switch this off if you don&apos;t charge tax. Past sales keep the tax they were rung up with.
                </p>
              </header>

              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-0.5">
                  <span id="tax-enabled-label" className="text-sm font-medium">Charge tax</span>
                  <span className="text-sm text-muted-foreground">
                    {taxEnabled ? "The checkout and receipts show a tax line." : "No tax is added, and receipts show no tax line."}
                  </span>
                </div>
                <Switch
                  checked={taxEnabled}
                  onCheckedChange={(on) => {
                    form.setValue("taxEnabled", on, { shouldDirty: true });
                    void form.trigger("taxRate");
                  }}
                  aria-labelledby="tax-enabled-label"
                />
              </div>

              <div className="grid gap-2 sm:max-w-48">
                <Label htmlFor="taxRate">Tax rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="100"
                  disabled={!taxEnabled}
                  className="h-11 tabular-nums"
                  aria-invalid={errors.taxRate ? true : undefined}
                  {...form.register("taxRate", { valueAsNumber: true })}
                />
                <FieldError message={errors.taxRate?.message} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-0.5">
                  <span id="prices-include-tax-label" className="text-sm font-medium">Prices include tax</span>
                  <span className="text-sm text-muted-foreground">
                    {(values.pricesIncludeTax ?? true)
                      ? "The price on the tag is what the customer pays."
                      : "Tax is added on top of the price at checkout."}
                  </span>
                </div>
                <Switch
                  checked={values.pricesIncludeTax ?? true}
                  onCheckedChange={(on) => form.setValue("pricesIncludeTax", on, { shouldDirty: true })}
                  aria-labelledby="prices-include-tax-label"
                />
              </div>

              <div className="rounded-xl bg-muted p-4 text-sm">
                <p className="mb-1 font-medium">An item priced {money(SAMPLE)}</p>
                <dl className="grid gap-1">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Net</dt>
                    <dd className="tabular-nums text-foreground">{money(preview.net)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Tax</dt>
                    <dd className="tabular-nums text-foreground">{money(preview.tax)}</dd>
                  </div>
                  <div className="flex justify-between font-medium">
                    <dt>Customer pays</dt>
                    <dd className="tabular-nums">{money(preview.total)}</dd>
                  </div>
                </dl>
              </div>

              <p className="text-sm text-muted-foreground">
                Changing tax re-checks every product&apos;s margin in the background, and applies to the checkout right away.
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
                    if (tenant) form.reset(fromTenant(tenant));
                  }}
                >
                  Discard
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
