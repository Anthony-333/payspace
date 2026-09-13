"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { ClipboardPen, Pencil, Trash, Truck } from "lucide-react";
import type { ReactNode } from "react";
import {
  formatDateTime,
  formatPurchaseCost,
  formatUnitCost,
  StockStatusBadge,
  type StockItem,
} from "@/components/inventory/stock-parts";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, roundMinor } from "@/convex/lib/money";
import { formatQty } from "@/convex/lib/quantity";
import { cn } from "@/lib/utils";

const TYPE_LABEL = { receive: "Received", sale: "Sold", refund: "Refunded", adjust: "Adjusted", waste: "Waste" } as const;

type Actions = {
  onReceive: (item: StockItem) => void;
  onWaste: (item: StockItem) => void;
  onAdjust: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
};

type Props = Actions & { stockItemId: Id<"stockItems"> | null; onClose: () => void };

export function ItemSheet({ stockItemId, onClose, ...actions }: Props) {
  return (
    <Sheet open={stockItemId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {stockItemId && <ItemDetails key={stockItemId} stockItemId={stockItemId} {...actions} />}
      </SheetContent>
    </Sheet>
  );
}

function ItemDetails({ stockItemId, onReceive, onWaste, onAdjust, onEdit }: Actions & { stockItemId: Id<"stockItems"> }) {
  const shop = useShop();
  const manage = canManage(shop.role);
  const item = useQuery(api.inventory.getItem, { tenantId: shop.tenantId, stockItemId });

  if (item === undefined) {
    return (
      <SheetHeader>
        <SheetTitle>Loading…</SheetTitle>
        <SheetDescription className="sr-only">Loading the stock item.</SheetDescription>
      </SheetHeader>
    );
  }

  const purchaseCost = formatPurchaseCost(item);
  return (
    <div className="grid gap-6 pb-6">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 pr-8">
          {item.name} <StockStatusBadge status={item.status} />
        </SheetTitle>
        <SheetDescription>
          Measured in {item.baseUnit}
          {item.purchaseUnit ? `, bought as ${item.purchaseUnit.name} (${formatQty(item.purchaseUnit.factor, item.baseUnit)})` : ""}.
        </SheetDescription>
      </SheetHeader>

      <dl className="grid grid-cols-2 gap-3 px-4">
        <Stat label="On hand">
          <span className={cn(item.onHand < 0 && "text-destructive")}>{formatQty(item.onHand, item.baseUnit)}</span>
        </Stat>
        <Stat label="Reorder at">{formatQty(item.reorderPoint, item.baseUnit)}</Stat>
        {manage && item.avgCost !== null && (
          <Stat label="Average cost">
            {formatUnitCost(item.avgCost, item.baseUnit)}
            {purchaseCost && <span className="block text-xs font-normal text-muted-foreground">{purchaseCost}</span>}
          </Stat>
        )}
        {manage && item.avgCost !== null && (
          <Stat label="Stock value">{formatMoney(Math.max(0, roundMinor(item.onHand * item.avgCost)))}</Stat>
        )}
        <Stat label="Last received">{item.lastReceivedAt ? formatDateTime(item.lastReceivedAt) : "Not yet"}</Stat>
      </dl>

      <div className="flex flex-wrap gap-2 px-4">
        {manage && (
          <Button size="lg" className="h-11" onClick={() => onReceive(item)}>
            <Truck /> Receive
          </Button>
        )}
        <Button variant="outline" size="lg" className="h-11" onClick={() => onWaste(item)}>
          <Trash /> Log waste
        </Button>
        {manage && (
          <Button variant="outline" size="lg" className="h-11" onClick={() => onAdjust(item)}>
            <ClipboardPen /> Adjust
          </Button>
        )}
        {manage && (
          <Button variant="outline" size="lg" className="h-11" onClick={() => onEdit(item)}>
            <Pencil /> Edit
          </Button>
        )}
      </div>

      {item.usedIn.length > 0 && (
        <section className="grid gap-2 px-4">
          <h3 className="text-sm font-semibold">Used by</h3>
          <div className="flex flex-wrap gap-1.5">
            {item.usedIn.map((p) => (
              <Badge key={p._id} variant="secondary">{p.name}{p.isActive ? "" : " (archived)"}</Badge>
            ))}
          </div>
        </section>
      )}

      {manage && <Ledger stockItemId={stockItemId} baseUnit={item.baseUnit} />}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Ledger({ stockItemId, baseUnit }: { stockItemId: Id<"stockItems">; baseUnit: StockItem["baseUnit"] }) {
  const shop = useShop();
  const { results, status, loadMore } = usePaginatedQuery(
    api.inventory.movements,
    { tenantId: shop.tenantId, stockItemId },
    { initialNumItems: 20 },
  );

  return (
    <section className="grid gap-2 px-4">
      <h3 className="text-sm font-semibold">History</h3>
      {status === "LoadingFirstPage" ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stock changes yet.</p>
      ) : (
        <ol className="divide-y rounded-xl border">
          {results.map((m) => (
            <li key={m._id} className="flex items-start gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{TYPE_LABEL[m.type]}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(m._creationTime)} · {m.memberName}
                  {m.type === "receive" && ` · ${formatUnitCost(m.unitCost, baseUnit)}`}
                </div>
                {m.note && <div className="mt-1 text-xs break-words text-muted-foreground">“{m.note}”</div>}
              </div>
              <div className={cn("shrink-0 font-semibold tabular-nums", m.qty < 0 ? "text-destructive" : "text-foreground")}>
                {m.qty > 0 ? "+" : ""}{formatQty(m.qty, baseUnit)}
              </div>
            </li>
          ))}
        </ol>
      )}
      {status === "CanLoadMore" && (
        <Button variant="outline" size="lg" className="h-11" onClick={() => loadMore(20)}>Show older</Button>
      )}
    </section>
  );
}
