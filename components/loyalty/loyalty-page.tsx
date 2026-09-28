"use client";

import { useQuery } from "convex/react";
import { Copy, ExternalLink, Plus, Search, Settings2, Stamp, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CardSheet } from "@/components/loyalty/card-sheet";
import { CredentialsDialog } from "@/components/loyalty/credentials-dialog";
import { ProgramDialog } from "@/components/loyalty/program-dialog";
import { StampCard } from "@/components/loyalty/stamp-card";
import { PageHeader } from "@/components/shop/page-header";
import { ProBadge, UpgradeNote } from "@/components/shop/plan";
import { useShop } from "@/components/shop/shop-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

/**
 * Staff screen for loyalty cards. The owner sets up the card; anyone at the counter can open a
 * card and give signed stamps. `saleNumber` comes from a receipt's "Loyalty stamp" button.
 */
export function LoyaltyPage({ saleNumber }: { saleNumber?: number }) {
  const shop = useShop();
  const data = useQuery(api.loyalty.program, { tenantId: shop.tenantId });
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const cards = useQuery(api.loyalty.cards, { tenantId: shop.tenantId, search: search.trim() || undefined, archived });
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openCard, setOpenCard] = useState<Id<"loyaltyCards"> | null>(null);
  const [pendingSale, setPendingSale] = useState(saleNumber);
  const owner = shop.role === "owner";

  const customerPath = `/loyalty/${shop.slug}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${customerPath}`);
      toast.success("Customer link copied.");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it instead.");
    }
  };

  if (data === undefined) {
    return <div className="h-64 animate-pulse rounded-xl bg-card" />;
  }
  const { pro, program } = data;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Loyalty"
        description="Stamp cards your customers can check on their phone."
        actions={
          <>
            {owner && program && (
              <Button variant="outline" className="h-11" onClick={() => setEditing(true)} disabled={!pro}>
                <Settings2 className="size-4" /> Card settings
              </Button>
            )}
            {program && (
              <Button className="h-11" onClick={() => setCreating(true)} disabled={!pro || !program.isActive}>
                <Plus className="size-4" /> New card
              </Button>
            )}
          </>
        }
      />

      {!pro && <UpgradeNote>Loyalty cards with signed stamps are part of Pro. Customers can still see the cards they have.</UpgradeNote>}

      {!program ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border bg-card p-10 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><Stamp className="size-6" /></div>
          <h2 className="text-lg font-semibold">No loyalty card yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Give customers a stamp for every receipt, signed by whoever serves them. A full card earns the reward you choose.
          </p>
          {owner ? (
            <Button className="h-11" onClick={() => setEditing(true)} disabled={!pro}>
              Set up loyalty card {!pro && <ProBadge className="ml-1" />}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Ask the owner to set it up.</p>
          )}
        </div>
      ) : (
        <>
          {pendingSale !== undefined && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-accent/60 p-3 text-sm">
              <Stamp className="size-4 text-primary" />
              <span className="flex-1">Pick the customer&apos;s card to stamp receipt <strong>#{pendingSale}</strong>.</span>
              <Button variant="ghost" size="sm" onClick={() => setPendingSale(undefined)}><X className="size-4" /> Cancel</Button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section className="grid content-start gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-56 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 pl-9"
                    placeholder="Find by username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={archived} onCheckedChange={setArchived} /> Archived
                </label>
              </div>

              {cards === undefined ? (
                <div className="h-40 animate-pulse rounded-xl bg-card" />
              ) : cards.length === 0 ? (
                <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                  {search ? `No ${archived ? "archived " : ""}cards with a username starting “${search.trim()}”.` : archived ? "No archived cards." : "No cards yet. Open one with New card."}
                </p>
              ) : (
                <ul className="grid divide-y overflow-hidden rounded-xl border bg-card">
                  {cards.map((card) => {
                    const full = card.stamps >= card.stampsRequired;
                    return (
                      <li key={card._id}>
                        <button
                          type="button"
                          onClick={() => setOpenCard(card._id)}
                          className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{card.name}</p>
                            <p className="truncate text-sm text-muted-foreground">@{card.username}</p>
                          </div>
                          <div className="hidden gap-1 sm:flex" aria-hidden>
                            {Array.from({ length: Math.min(card.stampsRequired, 12) }, (_, i) => (
                              <span key={i} className={cn("size-2.5 rounded-full", i < card.stamps ? "bg-primary" : "bg-border")} />
                            ))}
                          </div>
                          <span className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                            full ? "bg-tint-green text-tint-green-foreground" : "bg-muted text-muted-foreground",
                          )}>
                            {full ? "Reward ready" : `${card.stamps} / ${card.stampsRequired}`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="grid content-start gap-3">
              <StampCard
                shopName={shop.name}
                cardName={program.name}
                reward={program.reward}
                color={program.color}
                stampsRequired={program.stampsRequired}
                stamps={[]}
              />
              {!program.isActive && <p className="text-sm text-muted-foreground">Loyalty is switched off: no new cards or stamps.</p>}
              <div className="grid gap-2 rounded-xl border bg-card p-4 text-sm">
                <p className="font-medium">Where customers check their card</p>
                <p className="break-all text-muted-foreground">{customerPath}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyLink}><Copy className="size-4" /> Copy link</Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={customerPath} target="_blank"><ExternalLink className="size-4" /> Open</Link>
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          <CardSheet
            cardId={openCard}
            program={program}
            saleNumber={pendingSale}
            onClose={() => setOpenCard(null)}
            onStamped={() => setPendingSale(undefined)}
          />
          <CredentialsDialog
            mode="create"
            open={creating}
            onClose={(cardId) => {
              setCreating(false);
              if (cardId) setOpenCard(cardId);
            }}
          />
        </>
      )}

      <ProgramDialog open={editing} program={program} onClose={() => setEditing(false)} />
    </div>
  );
}
