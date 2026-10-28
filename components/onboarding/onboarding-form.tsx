"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/auth/auth-card";
import { browserTimezone, CurrencySelect, TimezoneSelect } from "@/components/shop/locale-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { normalizeSlug } from "@/convex/lib/slugs";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES = [
  { value: "cafe", label: "Café" },
  { value: "grocery", label: "Grocery" },
  { value: "bakery", label: "Bakery" },
  { value: "retail", label: "Retail" },
] as const;

const STARTER_HINT = {
  cafe: "20 drinks with sizes, milk options and recipes.",
  bakery: "Breads and pastries with ingredients and recipes.",
  grocery: "Common categories and everyday items.",
  retail: "",
} as const;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(80),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Use 3 to 40 letters, numbers or dashes."),
  businessType: z.enum(["cafe", "grocery", "bakery", "retail"]),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().min(1),
  taxRate: z.number({ error: "Enter a tax rate." }).min(0).max(100),
  pricesIncludeTax: z.boolean(),
  starterMenu: z.boolean(),
});

type Values = z.infer<typeof schema>;

export function OnboardingForm() {
  const router = useRouter();
  const createShop = useMutation(api.tenants.create);
  const applyTemplate = useMutation(api.templates.apply);
  const [error, setError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      businessType: "cafe",
      currency: "USD",
      timezone: "UTC", // replaced by the device's zone after hydration, below
      taxRate: 0,
      pricesIncludeTax: true,
      starterMenu: true,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const [businessType, currency, timezone] = useWatch({ control: form.control, name: ["businessType", "currency", "timezone"] });

  // The server render can't know the visitor's time zone, so it's filled in on the client.
  useEffect(() => form.setValue("timezone", browserTimezone()), [form]);

  const onSubmit = form.handleSubmit(async ({ taxRate, starterMenu, ...values }) => {
    setError(null);
    let shop;
    try {
      shop = await createShop({ ...values, taxRateBps: Math.round(taxRate * 100) });
    } catch (err) {
      setError(errorMessage(err));
      return;
    }
    posthog.capture("shop_created", {
      business_type: values.businessType,
      starter_menu_enabled: starterMenu && values.businessType !== "retail",
      prices_include_tax: values.pricesIncludeTax,
    });
    if (starterMenu && values.businessType !== "retail") {
      // The shop exists either way; if this fails, the home page still offers the starter menu.
      try {
        await applyTemplate({ tenantId: shop.tenantId });
      } catch (err) {
        toast.error(errorMessage(err, "Your shop is ready, but the starter menu didn't load. Add it from the home page."));
      }
    }
    router.replace(`/${shop.slug}`);
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          {...form.register("name", {
            onChange: (e) => {
              if (!slugEdited) form.setValue("slug", normalizeSlug(e.target.value).slice(0, 40));
            },
          })}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Shop link</Label>
        <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-sm text-muted-foreground">payspace.app/</span>
          <Input
            id="slug"
            className="border-0 pl-0.5 shadow-none focus-visible:ring-0"
            {...form.register("slug", {
              onChange: (e) => {
                setSlugEdited(true);
                form.setValue("slug", normalizeSlug(e.target.value));
              },
            })}
          />
        </div>
        <FieldError message={errors.slug?.message} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Type of business</legend>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              aria-pressed={businessType === type.value}
              onClick={() => form.setValue("businessType", type.value)}
              className={cn(
                "h-12 rounded-md border text-sm font-medium transition-colors",
                businessType === type.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="taxRate">Tax rate (%)</Label>
          <Input
            id="taxRate"
            type="number"
            inputMode="decimal"
            step="0.01"
            {...form.register("taxRate", { valueAsNumber: true })}
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...form.register("pricesIncludeTax")} />
          Prices include tax
        </label>
      </div>
      <FieldError message={errors.taxRate?.message} />
      <p className="-mt-3 text-sm text-muted-foreground">Sales tax, VAT or GST. Leave it at 0 if you don&apos;t charge tax.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="currency">Currency</Label>
          <CurrencySelect id="currency" value={currency} onChange={(code) => form.setValue("currency", code)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timezone">Time zone</Label>
          <TimezoneSelect id="timezone" value={timezone} onChange={(zone) => form.setValue("timezone", zone)} />
        </div>
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">Change these, or use your own currency sign, any time in Settings.</p>

      {businessType !== "retail" && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...form.register("starterMenu")} />
          <span>
            Start with a starter {businessType === "grocery" ? "product list" : "menu"}
            <span className="block text-muted-foreground">
              {STARTER_HINT[businessType]} Edit or archive anything later.
            </span>
          </span>
        </label>
      )}

      <FieldError message={error ?? undefined} />
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Creating your shop…" : "Create shop"}
      </Button>
    </form>
  );
}
