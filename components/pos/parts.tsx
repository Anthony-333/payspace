"use client";

import { Minus, Plus } from "lucide-react";
import { formatMoney } from "@/convex/lib/money";
import { cn } from "@/lib/utils";

/** "₱140.00" with a lighter peso sign, as in the blueprint's price style. */
export function Price({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("font-semibold tabular-nums", className)}>
      <span className="font-normal text-muted-foreground">₱</span>
      {formatMoney(amount, "")}
    </span>
  );
}

/** Photo or a soft letter tile when there's no photo. */
export function ProductThumb({ name, imageUrl, className }: { name: string; imageUrl: string | null; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-xl font-semibold text-accent-foreground", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, resized on upload
        <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

/**
 * − count + with round buttons. The visible circles are 40px (36px when small), and each
 * button's hit area is padded out to at least 48px for fingers.
 */
export function Stepper({ label, value, onDecrement, onIncrement, size = "default", incrementDisabled }: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  size?: "default" | "sm";
  incrementDisabled?: boolean;
}) {
  const circle = cn(
    "relative flex items-center justify-center rounded-full border transition-colors outline-none after:absolute after:-inset-1.5 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
    size === "sm" ? "size-9" : "size-10",
  );
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`${label} quantity`}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={value === 0}
        aria-label={`Remove one ${label}`}
        className={cn(circle, "bg-card text-foreground hover:bg-muted")}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label={`Add one ${label}`}
        className={cn(
          circle,
          value > 0
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card text-primary hover:bg-accent",
        )}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
