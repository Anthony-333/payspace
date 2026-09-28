import Link from "next/link";
import { ArrowRight, ChartColumn, Sparkles, Store } from "lucide-react";
import { cn } from "cn";
import { PosMockup, StockMockup, TabletFrame } from "./mockups";
import { QuoteCarousel } from "./quote-carousel";

// Monthly profit in thousands of pesos, for the decorative chart card.
const MONTHS = [
  ["Jan", 42],
  ["Feb", 58],
  ["Mar", 81],
  ["Apr", 55],
  ["May", 83],
  ["Jun", 74],
  ["Jul", 49],
  ["Aug", 62],
  ["Sep", 95],
  ["Oct", 64],
] as const;
const HIGHLIGHT = 5;

export function Hero({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <section id="top" className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 lg:grid-cols-[1.55fr_1fr]">
      {/* Dark lead card */}
      <div className="relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-[32px] bg-foreground p-7 text-background sm:min-h-[640px] sm:p-10">
        <Rings />
        <p className="max-w-xs text-sm text-background/70">
          The point of sale for coffee shops, bakeries and small stores 🚀
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-[3.5rem]">
          Know the real profit on everything you sell
        </h1>
        <p className="mt-4 max-w-md text-sm text-background/70 sm:text-base">
          Payspace records your sales. Your customers pay you directly, and we never touch the money.
        </p>
        <Link
          href={ctaHref}
          className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          {ctaLabel}
          <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-primary">
            <ArrowRight className="size-4" />
          </span>
        </Link>

        {/* Tablets, cropped by the card's bottom edge like the reference */}
        <div className="relative mt-10 flex-1">
          <TabletFrame
            label="Stock screen with a low-stock warning"
            className="absolute -bottom-16 -left-20 hidden h-[330px] w-[440px] -rotate-6 opacity-90 md:block"
          >
            <StockMockup />
          </TabletFrame>
          <TabletFrame
            label="Payspace checkout screen with an order at the counter"
            className="absolute -bottom-20 left-0 h-[300px] w-[520px] sm:left-8 md:left-auto md:right-[-40px] md:h-[360px] md:w-[600px]"
          >
            <PosMockup />
          </TabletFrame>
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-muted p-6 sm:col-span-2">
          <Chip icon={ChartColumn}>Profit statistics</Chip>
          <div className="mt-5 flex h-44 gap-3">
            <div className="flex flex-col justify-between pb-6 text-xs text-muted-foreground">
              <span>₱90k</span>
              <span>₱45k</span>
              <span>₱0</span>
            </div>
            <div className="flex flex-1 items-end justify-between gap-1.5">
              {MONTHS.map(([m, v], i) => (
                <div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className={cn("relative w-full max-w-4 rounded-full", i === HIGHLIGHT ? "bg-brand" : "bg-brand/35")}
                    style={{ height: `calc(${v}% - 24px)` }}
                  >
                    {i === HIGHLIGHT && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-background">
                        ₱{v}k
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 rounded-2xl bg-tint-violet p-6">
          <div>
            <Chip icon={Sparkles}>Profit per latte</Chip>
            <p className="mt-3 text-sm text-tint-violet-foreground">
              Recipes costed to the gram, so every item shows what it really earns.
            </p>
          </div>
          <p className="text-4xl font-semibold tracking-tight">₱101.50</p>
        </div>

        <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-foreground p-6 text-background">
          <div className="pointer-events-none absolute -right-10 -bottom-10 size-40 rounded-full bg-brand/25 blur-2xl" />
          <Chip icon={Store} dark>
            Free to start
          </Chip>
          <p className="text-4xl font-semibold tracking-tight">
            $0 <span className="text-base font-normal text-background/70">no card needed</span>
          </p>
        </div>

        <div className="sm:col-span-2">
          <QuoteCarousel />
        </div>
      </div>
    </section>
  );
}

function Chip({
  icon: Icon,
  dark,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold",
        dark ? "bg-background/10" : "bg-card",
      )}
    >
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full",
          dark ? "bg-background text-foreground" : "bg-foreground text-background",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      {children}
    </span>
  );
}

function Rings() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute top-[45%] -right-24 size-80 rounded-full border border-background/10" />
      <div className="absolute top-[52%] -right-8 size-56 rounded-full border border-background/10" />
      <div className="absolute top-[60%] -left-20 size-64 rounded-full border border-background/10" />
    </div>
  );
}
