"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatQty, parseQty, roundQty } from "@/convex/lib/quantity";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

/**
 * A full stock count in one pass: type what's on the shelf, Enter moves to the next item.
 * Blank rows aren't counted. Differences are measured against stock when the count is saved.
 */
export function CountPage() {
  const shop = useShop();
  const router = useRouter();
  const items = useQuery(api.inventory.listItems, { tenantId: shop.tenantId });
  const submitCount = useMutation(api.inventory.submitCount);
  const { value: term } = useShellSearch();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  const search = term.trim().toLowerCase();
  const visible = (items ?? []).filter((item) => !search || item.name.toLowerCase().includes(search));

  const entered = (items ?? []).flatMap((item) => {
    const text = counts[item._id]?.trim();
    if (!text) return [];
    const counted = parseQty(text);
    return [{ item, counted, diff: counted === null ? null : roundQty(counted - item.onHand) }];
  });
  const invalid = entered.filter((e) => e.counted === null);
  const differences = entered.filter((e) => e.diff !== null && e.diff !== 0);

  function focusNext(id: string) {
    const index = visible.findIndex((item) => item._id === id);
    const next = visible[index + 1];
    if (next) inputs.current.get(next._id)?.focus();
    else inputs.current.get(id)?.blur();
  }

  async function save() {
    setSaving(true);
    try {
      const result = await submitCount({
        tenantId: shop.tenantId,
        note: note.trim() || undefined,
        counts: entered.map((e) => ({ stockItemId: e.item._id as Id<"stockItems">, counted: e.counted! })),
      });
      toast.success(
        result.changed === 0
          ? "Count saved. Everything matched."
          : `Count saved. ${result.changed} ${result.changed === 1 ? "item was" : "items were"} corrected.`,
      );
      router.push(`/${shop.slug}/inventory`);
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  const back = (
    <Button variant="ghost" size="lg" className="mb-2 h-10 px-2" asChild>
      <Link href={`/${shop.slug}/inventory`}><ArrowLeft /> Inventory</Link>
    </Button>
  );
  if (!canManage(shop.role)) {
    return (
      <>
        {back}
        <PageHeader title="Stock count" description="Only owners and managers can save a stock count." />
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title="Stock count"
        description="Count what's on the shelf and type it in. Leave an item blank to skip it. Press Enter to jump to the next one."
      />

      {items === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stock items to count yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {visible.map((item) => {
              const text = counts[item._id] ?? "";
              const counted = text.trim() ? parseQty(text) : undefined;
              const diff = counted === undefined || counted === null ? null : roundQty(counted - item.onHand);
              return (
                <li key={item._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:flex-nowrap">
                  <label htmlFor={`count-${item._id}`} className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Expected {formatQty(item.onHand, item.baseUnit)}
                    </span>
                  </label>
                  <span
                    className={cn(
                      "min-w-20 flex-1 text-sm tabular-nums sm:flex-none sm:text-right",
                      counted === null ? "text-destructive" : diff !== null && diff < 0 ? "text-destructive" : "text-muted-foreground",
                    )}
                    aria-live="polite"
                  >
                    {counted === null ? "Not a number" : diff === null ? "" : diff === 0 ? "Matches" : `${diff > 0 ? "+" : ""}${formatQty(diff)}`}
                  </span>
                  <div className="relative w-36 shrink-0">
                    <Input
                      id={`count-${item._id}`}
                      ref={(el) => {
                        if (el) inputs.current.set(item._id, el);
                        else inputs.current.delete(item._id);
                      }}
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      className="h-12 pr-10 text-right text-lg tabular-nums"
                      placeholder="—"
                      value={text}
                      aria-invalid={counted === null}
                      onChange={(e) => setCounts((current) => ({ ...current, [item._id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          focusNext(item._id);
                        }
                      }}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                      {item.baseUnit}
                    </span>
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">No items match “{term.trim()}”.</li>
            )}
          </ul>
        </div>
      )}

      {/* Pinned save bar */}
      <div className="sticky bottom-0 z-10 mt-4 -mx-4 border-t bg-card px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted-foreground tabular-nums">
            {entered.length} of {items?.length ?? 0} counted · {differences.length} {differences.length === 1 ? "difference" : "differences"}
          </p>
          <Input
            aria-label="Note for this count"
            className="h-11 w-full sm:w-56"
            maxLength={200}
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            size="lg"
            className="h-11 w-full sm:w-auto"
            disabled={entered.length === 0 || invalid.length > 0 || saving}
            onClick={() => setConfirming(true)}
          >
            {saving ? "Saving…" : "Save count"}
          </Button>
        </div>
        {invalid.length > 0 && (
          <p className="mt-2 text-sm text-destructive">Fix the counts that aren&apos;t numbers: {invalid.map((e) => e.item.name).join(", ")}.</p>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this count?</AlertDialogTitle>
            <AlertDialogDescription>
              {differences.length === 0
                ? `All ${entered.length} counted items match. Nothing will change.`
                : `${differences.length} of ${entered.length} counted items will be corrected, and each change is recorded in its history.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {differences.length > 0 && (
            <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border text-sm">
              {differences.map(({ item, counted, diff }) => (
                <li key={item._id} className="flex justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatQty(item.onHand)} → {formatQty(counted!, item.baseUnit)}
                    <span className={cn("ml-2", diff! < 0 ? "text-destructive" : "text-foreground")}>
                      ({diff! > 0 ? "+" : ""}{formatQty(diff!)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep counting</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Save count</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
