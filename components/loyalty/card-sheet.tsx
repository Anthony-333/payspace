"use client";

import { useMutation, useQuery } from "convex/react";
import { Archive, ArchiveRestore, Copy, Gift, KeyRound, Lock, Stamp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CredentialsDialog } from "@/components/loyalty/credentials-dialog";
import { SignDialog } from "@/components/loyalty/sign-dialog";
import { SignatureView } from "@/components/loyalty/signature-view";
import { StampCard } from "@/components/loyalty/stamp-card";
import { canManage, useShop } from "@/components/shop/shop-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

const ROLE_NAMES = { owner: "Owner", manager: "Manager", cashier: "Cashier" } as const;

type Program = { name: string; reward: string; color: string; isActive: boolean };

type Props = {
  cardId: Id<"loyaltyCards"> | null;
  program: Program;
  /** From a receipt's "Loyalty stamp" link: opens the stamp dialog with this receipt filled in. */
  saleNumber?: number;
  onClose: () => void;
  onStamped?: () => void;
};

/** One customer's card: the stamps with their signatures, the signed ledger, and the actions. */
export function CardSheet({ cardId, program, saleNumber, onClose, onStamped }: Props) {
  const shop = useShop();
  const card = useQuery(api.loyalty.card, cardId ? { tenantId: shop.tenantId, cardId } : "skip");
  const setArchived = useMutation(api.loyalty.setArchived);
  const [signing, setSigning] = useState<"stamp" | "redeem" | null>(null);
  const [resetting, setResetting] = useState(false);
  const manager = canManage(shop.role);
  const time = (at: number) => new Date(at).toLocaleString("en-PH", { timeZone: shop.timezone, dateStyle: "medium", timeStyle: "short" });

  const archive = async (archived: boolean) => {
    if (!card) return;
    try {
      await setArchived({ tenantId: shop.tenantId, cardId: card._id, archived });
      toast.success(archived ? `Archived @${card.username}. They can't sign in any more.` : `Restored @${card.username}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const copyLink = async () => {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/loyalty/${shop.slug}/${card.username}`);
      toast.success(`Card link for @${card.username} copied.`);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const current = card?.history.filter((e) => e.kind === "stamp" && e.round === card.round).reverse() ?? [];
  const full = card ? card.stamps >= card.stampsRequired : false;
  const active = card?.status === "active";

  return (
    <>
      <Sheet open={cardId !== null} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{card?.name ?? "Loyalty card"}</SheetTitle>
            <SheetDescription>
              {card ? <>@{card.username} · card {card.round}{card.round > 1 ? ` (${card.round - 1} reward${card.round === 2 ? "" : "s"} given)` : ""}</> : "Loading…"}
            </SheetDescription>
          </SheetHeader>

          {card && (
            <div className="grid gap-5 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                {!active && <Badge variant="secondary">Archived</Badge>}
                {card.locked && <Badge variant="destructive"><Lock className="size-3" /> Locked after wrong passwords</Badge>}
              </div>

              <StampCard
                shopName={shop.name}
                cardName={program.name}
                reward={program.reward}
                color={program.color}
                holder={card.name}
                stampsRequired={card.stampsRequired}
                stamps={current}
              />

              {active && (
                <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                  <p className="min-w-0 truncate text-muted-foreground">/loyalty/{shop.slug}/{card.username}</p>
                  <Button variant="outline" size="sm" onClick={copyLink}><Copy className="size-4" /> Copy link</Button>
                </div>
              )}

              {active && program.isActive && (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-12" onClick={() => setSigning("stamp")} disabled={full}>
                    <Stamp className="size-4" /> Give stamp
                  </Button>
                  <Button className="h-12" variant={full ? "default" : "outline"} onClick={() => setSigning("redeem")} disabled={!full}>
                    <Gift className="size-4" /> Give reward
                  </Button>
                </div>
              )}

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Signed log</h3>
                {card.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stamps yet.</p>
                ) : (
                  <ol className="grid divide-y rounded-xl border">
                    {card.history.map((entry) => (
                      <li key={entry._id} className="flex items-center gap-3 p-3">
                        <div className="h-10 w-20 shrink-0 rounded-md border bg-white p-1 text-[#1b2a6b]">
                          <SignatureView signature={entry.signature} label={`Signature of ${entry.memberName}`} className="size-full" />
                        </div>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium">
                            {entry.kind === "stamp" ? `Stamp · receipt #${entry.saleNumber}` : "Reward given"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {entry.memberName} ({ROLE_NAMES[entry.memberRole]}) · {time(entry.at)}
                          </p>
                          {entry.note && <p className="truncate text-xs text-muted-foreground">“{entry.note}”</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {manager && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {active && (
                    <Button variant="outline" className="h-11" onClick={() => setResetting(true)}>
                      <KeyRound className="size-4" /> Reset password
                    </Button>
                  )}
                  <Button variant="ghost" className="h-11" onClick={() => archive(active)}>
                    {active ? <><Archive className="size-4" /> Archive card</> : <><ArchiveRestore className="size-4" /> Restore card</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Siblings of the sheet, not inside it: a Radix dialog nested in a sheet can lose clicks. */}
      {card && (
        <>
          <SignDialog
            open={signing !== null}
            mode={signing ?? "stamp"}
            card={{ ...card, reward: program.reward }}
            saleNumber={saleNumber}
            onDone={signing === "stamp" ? onStamped : undefined}
            onClose={() => setSigning(null)}
          />
          <CredentialsDialog mode="reset" open={resetting} card={card} onClose={() => setResetting(false)} />
        </>
      )}
    </>
  );
}
