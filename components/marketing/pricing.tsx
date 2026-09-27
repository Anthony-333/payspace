import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import { PLAN_ROWS } from "./content";

export function Pricing({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl scroll-mt-6 px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Plans for your shop</h2>
        <p className="rounded-full bg-muted px-4 py-2 text-sm font-medium">
          Priced per shop, never per cashier
        </p>
      </div>

      <div className="mt-6 pt-4">
        <table className="w-full border-separate border-spacing-x-1 text-left sm:border-spacing-x-2">
          <caption className="sr-only">Free and Pro plans compared</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[40%] sm:w-[44%]">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="rounded-t-xl bg-tint-green px-2 py-5 sm:px-4 text-center text-xl font-semibold text-tint-green-foreground">
                Free
              </th>
              <th scope="col" className="rounded-t-xl bg-tint-peach px-2 py-5 sm:px-4 text-center text-xl font-semibold text-tint-peach-foreground">
                {/* Anchored on a div: a positioned table cell can leak the badge out of the layout. */}
                <div className="relative">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground">
                  Best choice ✨
                </span>
                Pro
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="border-b py-6 font-medium">Price</th>
              <PriceCell tint="green" amount="$0" note="forever" />
              <PriceCell tint="peach" amount="$5" note="/month per shop" />
            </tr>
            {PLAN_ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="border-b py-4 pr-2 text-sm font-medium">{row.label}</th>
                <Cell tint="green" value={row.free} />
                <Cell tint="peach" value={row.pro} />
              </tr>
            ))}
            <tr>
              <td />
              <td className="rounded-b-xl bg-tint-green/60 px-2 py-4 text-center sm:px-4">
                <Link href={ctaHref} className="inline-block rounded-full border border-tint-green-foreground px-3 whitespace-nowrap sm:px-5 py-2.5 text-sm font-semibold text-tint-green-foreground transition-colors hover:bg-card">
                  Start free
                </Link>
              </td>
              <td className="rounded-b-xl bg-tint-peach/60 px-2 py-4 text-center sm:px-4">
                <Link href={ctaHref} className="inline-block rounded-full bg-primary px-3 sm:px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
                  Go Pro
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

const TINT = {
  green: { cell: "bg-tint-green/60", icon: "bg-tint-green-foreground" },
  peach: { cell: "bg-tint-peach/60", icon: "bg-primary" },
};

function PriceCell({ tint, amount, note }: { tint: keyof typeof TINT; amount: string; note: string }) {
  return (
    <td className={cn("border-b px-2 py-6 text-center sm:px-4", TINT[tint].cell)}>
      <span className="text-3xl font-bold tracking-tight sm:text-4xl">{amount}</span>
      <span className="block text-sm font-medium text-muted-foreground sm:inline"> {note}</span>
    </td>
  );
}

function Cell({ tint, value }: { tint: keyof typeof TINT; value: string | boolean }) {
  return (
    <td className={cn("border-b px-2 py-4 text-center text-sm font-semibold sm:px-4", TINT[tint].cell)}>
      {value === true ? (
        <span className={cn("inline-grid size-5 place-items-center rounded-full text-primary-foreground", TINT[tint].icon)}>
          <Check className="size-3" strokeWidth={3} />
          <span className="sr-only">Included</span>
        </span>
      ) : value === false ? (
        <>
          <Minus className="inline size-4 text-muted-foreground" />
          <span className="sr-only">Not included</span>
        </>
      ) : (
        value
      )}
    </td>
  );
}
