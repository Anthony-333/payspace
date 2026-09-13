"use client";

import { useQuery } from "convex/react";
import { LayoutGrid, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EMPTY_CART, useCartStore } from "@/components/pos/cart-store";
import { InvoicePanel, useInvoice } from "@/components/pos/invoice-panel";
import { ModifierDialog } from "@/components/pos/modifier-dialog";
import { Price, ProductThumb, Stepper } from "@/components/pos/parts";
import { categoryIcon, defaultOptions, groupsFor, type Group, type SaleProduct } from "@/components/pos/pricing";
import { useShellSearch } from "@/components/shop/app-shell";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/convex/lib/money";
import { cn } from "@/lib/utils";

const ALL = "all";

// Checkout screen, laid out per docs/design/blueprint.md. "Place order" is wired up with
// sales.checkout (roadmap Week 4); until then the cart is fully usable and kept on the device.
export function PosScreen() {
  const shop = useShop();
  const tenantId = shop.tenantId;
  const products = useQuery(api.products.forSale, { tenantId });
  const categories = useQuery(api.categories.list, { tenantId });
  const groupList = useQuery(api.modifiers.list, { tenantId });
  const tenant = useQuery(api.tenants.get, { tenantId });
  const search = useShellSearch();

  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const cart = useCartStore((s) => s.carts[tenantId] ?? EMPTY_CART);
  const [categoryId, setCategoryId] = useState(ALL);
  const [choosing, setChoosing] = useState<SaleProduct | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);

  const groups = useMemo(() => new Map((groupList ?? []).map((g) => [g._id as string, g as Group])), [groupList]);
  const invoice = useInvoice(products, groups);

  // The saved cart loads after the first render so server and client HTML match.
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  // Keep the search/barcode field focused on devices with a keyboard or USB scanner,
  // but don't pop the on-screen keyboard on touch tablets.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) search.focus();
    // Only on arrival; refocusing on every render would fight taps elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const term = search.value.trim().toLowerCase();
  const visible = (products ?? []).filter((p) =>
    term
      ? p.name.toLowerCase().includes(term) || p.barcode === search.value.trim()
      : categoryId === ALL || p.categoryId === categoryId);
  const counts = new Map<string, number>();
  for (const p of products ?? []) if (p.categoryId) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  const activeCategory = categories?.find((c) => c._id === categoryId);

  /** Products without options go straight into the order; others open the options dialog. */
  function addProduct(product: SaleProduct) {
    const productGroups = groupsFor(product, groups);
    const needsChoice = productGroups.some((g) => g.options.length > 1 || g.minSelect < g.maxSelect || g.minSelect === 0);
    if (needsChoice) setChoosing(product);
    else add(tenantId, product._id, defaultOptions(productGroups));
  }

  // Enter in the search field: a scanned barcode adds that product; otherwise a single match is added.
  useEffect(() => {
    search.setOnSubmit(() => {
      const code = search.value.trim();
      if (!code) return;
      const match = (products ?? []).find((p) => p.barcode === code)
        ?? (visible.length === 1 ? visible[0] : undefined);
      if (!match) {
        toast.error(`No product matches “${code}”.`);
        return;
      }
      addProduct(match);
      search.setValue("");
    });
    return () => search.setOnSubmit(null);
  });

  const quantityOf = (product: SaleProduct) =>
    cart.lines.filter((l) => l.productId === product._id).reduce((sum, l) => sum + l.qty, 0);

  function removeOne(product: SaleProduct) {
    const last = cart.lines.findLast((l) => l.productId === product._id);
    if (last) setQty(tenantId, last.id, last.qty - 1);
  }

  const loading = products === undefined || categories === undefined || groupList === undefined;

  return (
    <div className="flex lg:h-[calc(100dvh-4.5rem)]">
      <div className="min-w-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 lg:pb-6">
        {/* Category tiles */}
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3 2xl:grid-cols-4">
          <CategoryTile
            name="All"
            count={products?.length ?? 0}
            icon={LayoutGrid}
            active={categoryId === ALL && !term}
            onClick={() => { setCategoryId(ALL); search.setValue(""); }}
          />
          {(categories ?? []).map((c) => (
            <CategoryTile
              key={c._id}
              name={c.name}
              count={counts.get(c._id) ?? 0}
              icon={categoryIcon(c.name)}
              active={categoryId === c._id && !term}
              onClick={() => { setCategoryId(c._id); search.setValue(""); }}
            />
          ))}
        </div>

        <h1 className="mt-7 mb-4 text-2xl font-semibold">
          {term ? `Results for “${search.value.trim()}”` : activeCategory ? activeCategory.name : "All items"}
        </h1>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-4">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-card" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center text-muted-foreground">
            <PackageOpen className="size-8" />
            {term ? "No products match your search." : products.length === 0 ? "There are no products to sell yet." : "No products in this category."}
            {products.length === 0 && canManage(shop.role) && (
              <Button asChild size="lg" className="h-11"><Link href={`/${shop.slug}/products`}>Add products</Link></Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-4">
            {visible.map((product) => {
              const productGroups = groupsFor(product, groups);
              const subtitle = productGroups.length
                ? productGroups.map((g) => g.name.replace(/\s*\(.*\)$/, "")).join(", ")
                : categories.find((c) => c._id === product.categoryId)?.name ?? "";
              const qty = quantityOf(product);
              return (
                <article key={product._id} className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-3 transition-colors", qty > 0 && "border-primary/40")}>
                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex min-w-0 items-start gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ProductThumb name={product.name} imageUrl={product.imageUrl} className="size-20" />
                    <span className="grid min-w-0 gap-1 pt-1">
                      <span className="line-clamp-2 font-semibold leading-snug">{product.name}</span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</span>
                    </span>
                  </button>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-3 px-1.5">
                    <Price amount={product.price} className="text-2xl" />
                    <div className="ml-auto shrink-0">
                      <Stepper
                        label={product.name}
                        value={qty}
                        onDecrement={() => removeOne(product)}
                        onIncrement={() => addProduct(product)}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice: a column on large screens, a bottom bar and sheet below that */}
      <div className="hidden w-80 shrink-0 py-4 pr-4 lg:flex xl:w-[23.75rem] xl:py-6 xl:pr-6">
        <InvoicePanel invoice={invoice} tenant={tenant} className="w-full" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3 lg:hidden">
        <Button size="lg" className="h-13 w-full justify-between px-5 text-base font-semibold" onClick={() => setOrderOpen(true)}>
          <span>{invoice.itemCount} {invoice.itemCount === 1 ? "item" : "items"}</span>
          <span>View order · {formatMoney(invoice.subtotal)}</span>
        </Button>
      </div>
      <Sheet open={orderOpen} onOpenChange={setOrderOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md" showCloseButton>
          <SheetTitle className="sr-only">Order</SheetTitle>
          <InvoicePanel invoice={invoice} tenant={tenant} className="h-full rounded-none border-0" />
        </SheetContent>
      </Sheet>

      <ModifierDialog
        product={choosing}
        groups={groups}
        productGroups={choosing ? groupsFor(choosing, groups) : []}
        onClose={() => setChoosing(null)}
        onAdd={(options, qty) => {
          if (choosing) add(tenantId, choosing._id, options, qty);
          setChoosing(null);
        }}
      />
    </div>
  );
}

function CategoryTile({ name, count, icon: Icon, active, onClick }: {
  name: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-18 min-w-44 shrink-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-w-0",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", active ? "bg-card text-primary" : "bg-muted text-foreground")}>
        <Icon className="size-5" />
      </span>
      <span className="grid min-w-0">
        <span className="truncate font-semibold">{name}</span>
        <span className={cn("text-sm", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {count} {count === 1 ? "item" : "items"}
        </span>
      </span>
    </button>
  );
}
