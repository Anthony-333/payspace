"use client";

import { useQuery } from "convex/react";
import { FileUp, LayoutGrid, Package, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { StarterTemplateCard } from "@/components/catalog/starter-template-card";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

const LINKS = [
  { href: "/products", title: "Products", description: "Prices, photos, barcodes and modifiers.", icon: Package },
  { href: "/categories", title: "Categories", description: "The tabs on your checkout screen.", icon: LayoutGrid },
  { href: "/modifiers", title: "Modifiers", description: "Sizes, milk options, add-ons.", icon: SlidersHorizontal },
  { href: "/products/import", title: "Import from CSV", description: "Bring in a product list from a spreadsheet.", icon: FileUp, manageOnly: true },
];

export function ShopHome() {
  const shop = useShop();
  const template = useQuery(api.templates.available, { tenantId: shop.tenantId });

  return (
    <>
      <PageHeader title={shop.name} description="Set up your catalog, then start selling." />
      <div className="grid gap-4">
        {template && shop.role === "owner" && <StarterTemplateCard template={template} />}
        <div className="grid gap-3 sm:grid-cols-2">
          {LINKS.filter((l) => !l.manageOnly || canManage(shop.role)).map((link) => (
            <Link key={link.href} href={`/${shop.slug}${link.href}`} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <link.icon className="size-4" />
                    {link.title}
                  </CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
