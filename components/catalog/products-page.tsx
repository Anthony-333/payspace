"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Archive, ArchiveRestore, FileUp, ImageIcon, MoreHorizontal, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ProductFormSheet, type Product } from "@/components/catalog/product-form-sheet";
import { useShellSearch } from "@/components/shop/app-shell";
import { PageHeader } from "@/components/shop/page-header";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatBps, formatMoney, grossMarginBps } from "@/convex/lib/money";
import { errorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

const ALL = "all";
const KIND_LABEL = { stocked: "Stocked", recipe: "Recipe", service: "Service" } as const;

export function ProductsPage() {
  const shop = useShop();
  const tenantId = shop.tenantId;
  const manage = canManage(shop.role);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const { value: term } = useShellSearch();
  const search = useDebouncedValue(term.trim(), 250);
  // A snapshot of the product being edited, so live updates don't reset the open form.
  const [editing, setEditing] = useState<{ product: Product | null } | null>(null);

  const categories = useQuery(api.categories.list, { tenantId });
  const groups = useQuery(api.modifiers.list, { tenantId });
  const tenant = useQuery(api.tenants.get, { tenantId });
  const setArchived = useMutation(api.products.setArchived);

  const archived = tab === "archived";
  const listed = usePaginatedQuery(
    api.products.list,
    search ? "skip" : {
      tenantId,
      archived,
      categoryId: categoryId === ALL ? undefined : (categoryId as Id<"categories">),
    },
    { initialNumItems: 50 },
  );
  const found = useQuery(api.products.search, search ? { tenantId, term: search, archived } : "skip");

  const rows = search
    ? found?.filter((p) => categoryId === ALL || p.categoryId === categoryId)
    : listed.status === "LoadingFirstPage" ? undefined : listed.results;
  const categoryName = new Map((categories ?? []).map((c) => [c._id, c.name]));

  async function toggleArchived(product: Product) {
    try {
      await setArchived({ tenantId, productId: product._id, archived: product.isActive });
      toast.success(product.isActive ? `Archived ${product.name}.` : `Restored ${product.name}.`, {
        action: product.isActive
          ? { label: "Undo", onClick: () => void setArchived({ tenantId, productId: product._id, archived: false }) }
          : undefined,
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="What you sell at the counter."
        actions={manage && (
          <>
            <Button variant="outline" size="lg" className="h-10" asChild>
              <Link href={`/${shop.slug}/products/import`}><FileUp /> Import CSV</Link>
            </Button>
            <Button size="lg" className="h-10" onClick={() => setEditing({ product: null })}>
              <Plus /> Add product
            </Button>
          </>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-10 w-44" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              {manage && <TableHead className="hidden text-right md:table-cell">Cost</TableHead>}
              {manage && <TableHead className="text-right">Margin</TableHead>}
              {manage && <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === undefined ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search ? `No products match “${search}”.` : archived ? "No archived products." : "No products yet."}
                </TableCell>
              </TableRow>
            ) : rows.map((product) => {
              const margin = tenant && product.unitCost
                ? grossMarginBps(product.price, product.unitCost, tenant.taxRateBps, tenant.pricesIncludeTax)
                : null;
              return (
                <TableRow
                  key={product._id}
                  className={cn(manage && "cursor-pointer")}
                  onClick={manage ? () => setEditing({ product }) : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, already resized
                          <img src={product.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <ImageIcon className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{product.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="secondary">{KIND_LABEL[product.kind]}</Badge>
                          {product.barcode && <span className="font-mono">{product.barcode}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {(product.categoryId && categoryName.get(product.categoryId)) ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(product.price)}</TableCell>
                  {manage && (
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                      {product.unitCost ? formatMoney(product.unitCost) : "—"}
                    </TableCell>
                  )}
                  {manage && (
                    <TableCell className="text-right tabular-nums">
                      {margin === null ? (
                        <span className="text-xs text-muted-foreground">
                          {product.kind === "recipe" ? "No recipe yet" : "No cost"}
                        </span>
                      ) : (
                        <span className={cn(tenant && margin < tenant.targetMarginBps && "font-medium text-destructive")}>
                          {formatBps(margin)}
                        </span>
                      )}
                    </TableCell>
                  )}
                  {manage && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-lg" aria-label={`Actions for ${product.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing({ product })}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleArchived(product)}>
                            {product.isActive ? <><Archive /> Archive</> : <><ArchiveRestore /> Restore</>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!search && listed.status === "CanLoadMore" && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="lg" onClick={() => listed.loadMore(50)}>Load more</Button>
        </div>
      )}
      {search && found && found.length === 50 && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Showing the first 50 matches. Refine your search to see more.</p>
      )}

      {manage && (
        <ProductFormSheet
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          product={editing?.product ?? null}
          categories={categories ?? []}
          groups={groups ?? []}
          tenant={tenant}
        />
      )}
    </>
  );
}
