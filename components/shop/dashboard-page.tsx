"use client";

import { useQuery } from "convex/react";
import { ArrowRight, ChartLine, FileUp, Package, ShoppingBag, SlidersHorizontal, Tags } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertsCard } from "@/components/analytics/alerts-card";
import { KpiTiles } from "@/components/analytics/kpi-tiles";
import { rangeFrom, useShopToday } from "@/components/analytics/range-picker";
import { StarterTemplateCard } from "@/components/catalog/starter-template-card";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { api } from "@/convex/_generated/api";

const LINKS = [
  { href: "/pos", title: "Sell", description: "Open the checkout screen.", icon: ShoppingBag },
  { href: "/products", title: "Products", description: "Prices, photos, barcodes and modifiers.", icon: Package },
  { href: "/categories", title: "Categories", description: "The tiles on your checkout screen.", icon: Tags },
  { href: "/modifiers", title: "Modifiers", description: "Sizes, milk options, add-ons.", icon: SlidersHorizontal },
  { href: "/products/import", title: "Import from CSV", description: "Bring in a product list from a spreadsheet.", icon: FileUp },
  { href: "/analytics", title: "Analytics", description: "Sales and profit trends.", icon: ChartLine },
];

export function DashboardPage() {
  const shop = useShop();
  const router = useRouter();
  const manage = canManage(shop.role);
  const template = useQuery(api.templates.available, manage ? { tenantId: shop.tenantId } : "skip");
  // Today in the shop's own calendar, against the same weekday last week.
  const today = useShopToday(shop.timezone);
  const summary = useQuery(
    api.analytics.summary,
    manage && today ? { tenantId: shop.tenantId, ...rangeFrom(today, "today") } : "skip",
  );

  // Cashiers work from the checkout screen; the dashboard is for owners and managers.
  useEffect(() => {
    if (!manage) router.replace(`/${shop.slug}/pos`);
  }, [manage, router, shop.slug]);
  if (!manage) return null;

  return (
    <>
      <div className="grid gap-5">
        {/* Welcome card, the dark hero from the landing page */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-foreground p-6 text-background sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 -right-16 size-72 rounded-full border border-background/10" />
            <div className="absolute -top-6 right-10 size-48 rounded-full border border-background/10" />
            <div className="absolute -right-10 -bottom-16 size-48 rounded-full bg-brand/20 blur-3xl" />
          </div>
          <p className="text-sm text-background/75">Dashboard · {shop.name}</p>
          <h1 className="mt-2 max-w-xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Good to see you, {shop.memberName.split(" ")[0]}. Here&apos;s today.
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${shop.slug}/pos`}
              className="inline-flex h-12 items-center gap-3 rounded-full bg-primary pr-2 pl-5 text-sm font-semibold text-primary-foreground outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Open checkout
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground text-primary">
                <ArrowRight className="size-4" />
              </span>
            </Link>
            <Link
              href={`/${shop.slug}/analytics`}
              className="inline-flex h-12 items-center rounded-full border border-background/30 px-5 text-sm font-semibold outline-none transition-colors hover:bg-background/10 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              See analytics
            </Link>
          </div>
        </section>
        {template && shop.role === "owner" && <StarterTemplateCard template={template} />}
        <KpiTiles
          current={summary?.current}
          previous={summary?.previous}
          loading={summary === undefined}
          comparison="the same weekday last week"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <AlertsCard />
          <Link
            href={`/${shop.slug}/analytics`}
            className="flex flex-col justify-center gap-1 rounded-xl bg-tint-peach p-5 text-center text-tint-peach-foreground outline-none transition-[filter] hover:brightness-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full bg-foreground text-background">
              <ChartLine className="size-5" />
            </span>
            <span className="font-semibold text-foreground">See the full picture</span>
            <span className="text-sm">
              Busiest hours, payment mix, and what earns rather than just what sells.
            </span>
          </Link>
        </div>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shortcuts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={`/${shop.slug}${link.href}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 outline-none transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <link.icon className="size-5" />
                </span>
                <span className="grid">
                  <span className="font-semibold">{link.title}</span>
                  <span className="text-sm text-muted-foreground">{link.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
