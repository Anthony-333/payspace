"use client";

import { useQuery } from "convex/react";
import { ChartLine, FileUp, Package, ShoppingBag, SlidersHorizontal, Tags } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StarterTemplateCard } from "@/components/catalog/starter-template-card";
import { KpiGrid } from "@/components/shop/analytics-page";
import { PageHeader } from "@/components/shop/page-header";
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

  // Cashiers work from the checkout screen; the dashboard is for owners and managers.
  useEffect(() => {
    if (!manage) router.replace(`/${shop.slug}/pos`);
  }, [manage, router, shop.slug]);
  if (!manage) return null;

  return (
    <>
      <PageHeader title="Dashboard" description={`Good to see you, ${shop.memberName.split(" ")[0]}. Here's ${shop.name} today.`} />
      <div className="grid gap-5">
        {template && shop.role === "owner" && <StarterTemplateCard template={template} />}
        <KpiGrid />
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shortcuts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={`/${shop.slug}${link.href}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 outline-none transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
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
