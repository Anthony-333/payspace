import { Gift } from "lucide-react";
import { cardColor } from "@/components/loyalty/card-colors";
import { SignatureView } from "@/components/loyalty/signature-view";
import type { Signature } from "@/convex/lib/signature";
import { cn } from "@/lib/utils";

type Props = {
  shopName: string;
  cardName: string;
  reward: string;
  color: string;
  holder?: string;
  stampsRequired: number;
  /** The current round's stamps, oldest first; each shows the signature it was given with. */
  stamps: { signature: Signature }[];
  className?: string;
};

/**
 * The card face, shared by the staff screen, the program preview and the customer's view.
 * Each filled box is a round ink stamp holding the signature it was given with.
 */
export function StampCard({ shopName, cardName, reward, color, holder, stampsRequired, stamps, className }: Props) {
  const face = cardColor(color);
  const full = stamps.length >= stampsRequired;
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl p-5 text-white shadow-lg", className)}
      style={{ backgroundColor: face.bg }}
    >
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium tracking-wide text-white/80 uppercase">{shopName}</p>
          <p className="truncate text-lg font-semibold">{cardName}</p>
        </div>
        <p className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums">
          {Math.min(stamps.length, stampsRequired)} / {stampsRequired}
        </p>
      </div>

      <ol
        className="relative mt-4 grid gap-2"
        // Even rows: up to 5 across, so 5 is one row, 8 is 4 + 4 and 10 is 5 + 5.
        style={{ gridTemplateColumns: `repeat(${stampsRequired <= 5 ? stampsRequired : Math.min(5, Math.ceil(stampsRequired / 2))}, minmax(0, 1fr))` }}
        aria-label={`${stamps.length} of ${stampsRequired} stamps`}
      >
        {Array.from({ length: stampsRequired }, (_, i) => {
          const stamp = stamps[i];
          const last = i === stampsRequired - 1;
          return (
            <li
              key={i}
              className={cn(
                "grid aspect-square w-full max-w-20 place-items-center justify-self-center rounded-full",
                stamp ? "bg-white shadow-inner" : "border-2 border-dashed border-white/40",
              )}
              style={stamp ? { color: face.ink } : undefined}
            >
              {stamp ? (
                <span className="grid size-[88%] -rotate-6 place-items-center rounded-full border-2 border-current/60 p-[8%]">
                  <SignatureView signature={stamp.signature} label={`Stamp ${i + 1}, signed`} className="w-full" />
                </span>
              ) : last ? (
                <Gift className="size-1/3 text-white/70" aria-label="Reward" />
              ) : (
                <span className="text-xs font-semibold text-white/50 tabular-nums">{i + 1}</span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="relative mt-4 flex items-end justify-between gap-3 text-sm">
        <p className="min-w-0 text-white/90">
          <span className="font-semibold">{full ? "Reward ready: " : "Reward: "}</span>
          {reward}
        </p>
        {holder && <p className="shrink-0 truncate text-xs text-white/75">{holder}</p>}
      </div>
    </div>
  );
}
