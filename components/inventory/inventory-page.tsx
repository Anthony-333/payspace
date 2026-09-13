"use client";

import { useMutation, useQuery } from "convex/react";
import { ClipboardList, ClipboardPen, MoreHorizontal, Pencil, Plus, Trash, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ItemFormDialog } from "@/components/inventory/item-form-dialog";
import { ItemSheet } from "@/components/inventory/item-sheet";
import { ReceiveSheet } from "@/components/inventory/receive-sheet";
import { StockActionDialog, type StockAction } from "@/components/inventory/stock-action-dialog";
import { formatUnitCost, StockStatusBadge, type StockItem } from "@/components/inventory/stock-parts";
import { useShellSearch } from "@/components/shop/app-shell";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatQty } from "@/convex/lib/quantity";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function InventoryPage() {
  const shop = useShop();
  const tenantId = shop.tenantId;
  const manage = canManage(shop.role);
  const items = useQuery(api.inventory.listItems, { tenantId });
  const removeItem = useMutation(api.inventory.removeItem);
  const { value: term } = useShellSearch();
  const [tab, setTab] = useState<"all" | "attention">("all");

  const [openItemId, setOpenItemId] = useState<Id<"stockItems"> | null>(null);
  const [editing, setEditing] = useState<{ item: StockItem | null } | null>(null);
  const [receiving, setReceiving] = useState<{ item: StockItem | null } | null>(null);
  const [action, setAction] = useState<StockAction | null>(null);
  const [deleting, setDeleting] = useState<StockItem | null>(null);

  const search = term.trim().toLowerCase();
  const attention = (items ?? []).filter((item) => item.status !== "ok");
  const rows = items && (tab === "attention" ? attention : items).filter((item) => !search || item.name.toLowerCase().includes(search));

  const sheetActions = {
    onReceive: (item: StockItem) => setReceiving({ item }),
    onWaste: (item: StockItem) => setAction({ mode: "waste", item }),
    onAdjust: (item: StockItem) => setAction({ mode: "adjust", item }),
    onEdit: (item: StockItem) => setEditing({ item }),
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        description="What's on your shelves. Recipes and sales draw from these items."
        actions={manage && (
          <>
            <Button variant="outline" size="lg" className="h-10" asChild>
              <Link href={`/${shop.slug}/inventory/count`}><ClipboardList /> Count stock</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-10" onClick={() => setEditing({ item: null })}>
              <Plus /> Add item
            </Button>
            <Button size="lg" className="h-10" onClick={() => setReceiving({ item: null })} disabled={!items?.length}>
              <Truck /> Receive stock
            </Button>
          </>
        )}
      />

      <div className="mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All items</TabsTrigger>
            <TabsTrigger value="attention">
              Needs attention{attention.length > 0 && <span className="ml-1 tabular-nums text-muted-foreground">{attention.length}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Reorder at</TableHead>
              {manage && <TableHead className="hidden text-right md:table-cell">Average cost</TableHead>}
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === undefined ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {search
                    ? `No items match “${term.trim()}”.`
                    : tab === "attention"
                      ? "Nothing is low, out or below zero."
                      : "No stock items yet. Stocked products add their own; add ingredients for your recipes."}
                </TableCell>
              </TableRow>
            ) : rows.map((item) => (
              <TableRow key={item._id} className="cursor-pointer" onClick={() => setOpenItemId(item._id)}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <StockStatusBadge status={item.status} />
                  </div>
                  {item.purchaseUnit && (
                    <div className="text-xs text-muted-foreground">
                      {item.purchaseUnit.name} = {formatQty(item.purchaseUnit.factor, item.baseUnit)}
                    </div>
                  )}
                </TableCell>
                <TableCell className={cn("text-right font-medium tabular-nums", item.onHand < 0 && "text-destructive")}>
                  {formatQty(item.onHand, item.baseUnit)}
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                  {item.reorderPoint > 0 ? formatQty(item.reorderPoint, item.baseUnit) : "—"}
                </TableCell>
                {manage && (
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                    {item.avgCost ? formatUnitCost(item.avgCost, item.baseUnit) : "—"}
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-lg" aria-label={`Actions for ${item.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {manage && <DropdownMenuItem onClick={() => setReceiving({ item })}><Truck /> Receive</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => setAction({ mode: "waste", item })}><Trash /> Log waste</DropdownMenuItem>
                      {manage && <DropdownMenuItem onClick={() => setAction({ mode: "adjust", item })}><ClipboardPen /> Adjust count</DropdownMenuItem>}
                      {manage && <DropdownMenuItem onClick={() => setEditing({ item })}><Pencil /> Edit</DropdownMenuItem>}
                      {manage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(item)}><Trash2 /> Delete</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ItemSheet stockItemId={openItemId} onClose={() => setOpenItemId(null)} {...sheetActions} />
      <StockActionDialog action={action} onClose={() => setAction(null)} />
      {manage && (
        <>
          <ItemFormDialog open={editing !== null} item={editing?.item ?? null} onClose={() => setEditing(null)} />
          <ReceiveSheet
            open={receiving !== null}
            onOpenChange={(open) => !open && setReceiving(null)}
            items={items ?? []}
            initialItem={receiving?.item ?? null}
          />
        </>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only items with no stock history that no product, recipe or modifier uses can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await removeItem({ tenantId, stockItemId: deleting._id });
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
