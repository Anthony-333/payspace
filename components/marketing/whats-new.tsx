import { Camera, Check, FileSpreadsheet, Flame, Percent } from "lucide-react";
import { cn } from "cn";
import { Chip } from "./chip";

// Recently shipped features, as a bento in the hero's style. Keep to what's live.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
// Five steps of the brand orange, darkest last. Literal classes so Tailwind keeps them.
const RAMP = ["bg-brand/10", "bg-brand/25", "bg-brand/45", "bg-brand/70", "bg-brand"];

// A made-up café week: a morning rush, a lunch bump, an afternoon merienda crowd, busier weekends.
function busy(day: number, hour: number) {
  const bump = (at: number, width: number, height: number) => height * Math.exp(-((hour - at) ** 2) / width);
  const weekend = day >= 5 ? 1.25 : 1;
  const mornings = day >= 5 ? bump(10, 3, 0.8) : bump(8, 1.5, 1);
  return weekend * (0.12 + mornings + bump(12, 1, 0.45) + bump(15.5, 2.5, 0.75));
}
const PEAK = Math.max(...DAYS.flatMap((_, d) => HOURS.map((h) => busy(d, h))));
const step = (v: number) => Math.min(RAMP.length - 1, Math.floor((v / PEAK) * RAMP.length));

export function WhatsNew() {
  return (
    <section id="new" aria-labelledby="new-title" className="mx-auto w-full max-w-7xl scroll-mt-6 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="new-title" className="max-w-xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          New at the counter
        </h2>
        <p className="rounded-full bg-muted px-4 py-2 text-sm font-medium">Recently shipped, on every plan</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Payment photos */}
        <article className="flex flex-col justify-between gap-6 rounded-2xl bg-tint-peach p-6 lg:col-span-2">
          <div>
            <Chip icon={Camera}>Payment photos</Chip>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">Proof of payment, saved with the sale</h3>
            <p className="mt-2 text-sm text-tint-peach-foreground">
              Snap the customer&apos;s GCash or Maya screen, or the card slip, right at the till. It stays with the
              sale for your staff, and never shows on the customer&apos;s receipt link.
            </p>
          </div>
          <div aria-hidden className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5 rounded-xl bg-card p-3 text-xs">
              <div className="flex justify-between font-semibold">
                <span>Receipt #0142</span>
                <span>₱390.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GCash · ref 8891234</span>
                <span>₱390.00</span>
              </div>
              <div className="flex items-center gap-1 text-tint-green-foreground">
                <Check className="size-3" strokeWidth={3} /> Photo attached
              </div>
            </div>
            <div className="w-20 shrink-0 -rotate-3 rounded-[14px] bg-foreground p-1 shadow-lg shadow-black/15">
              <div className="space-y-1 rounded-[10px] bg-[#0a5bd8] p-2 text-center text-[8px] leading-tight text-white">
                <div className="mx-auto grid size-4 place-items-center rounded-full bg-white/20">
                  <Check className="size-2.5" strokeWidth={3} />
                </div>
                <div className="font-semibold">Sent</div>
                <div className="text-[11px] font-bold">₱390.00</div>
                <div className="text-white/70">Ref 8891234</div>
              </div>
            </div>
          </div>
        </article>

        {/* Busy hours */}
        <article className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-foreground p-6 text-background lg:col-span-3">
          <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-brand/20 blur-2xl" />
          <div className="relative">
            <Chip icon={Flame} dark>
              Busy hours
            </Chip>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">See when the rush really hits</h3>
            <p className="mt-2 max-w-md text-sm text-background/70">
              A week at a glance, hour by hour, so you know when to add a second cashier and when to bake the next batch.
            </p>
          </div>
          <div
            role="img"
            aria-label="Heatmap of sales by weekday and hour: busiest on weekday mornings around 8 am and weekend afternoons"
            className="relative"
          >
            <div aria-hidden className="grid grid-cols-[2rem_repeat(12,minmax(0,1fr))] gap-1 text-[10px] text-background/60">
              {DAYS.map((d, di) => (
                <div key={d} className="contents">
                  <span className="self-center">{d}</span>
                  {HOURS.map((h) => (
                    <span key={h} className={cn("aspect-[2/1] rounded-[4px]", RAMP[step(busy(di, h))])} />
                  ))}
                </div>
              ))}
              <span />
              {HOURS.map((h) => (
                <span key={h} className="text-center">
                  {h % 3 === 1 ? `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}` : ""}
                </span>
              ))}
            </div>
          </div>
        </article>

        {/* Templates and CSV import */}
        <article className="flex flex-col justify-between gap-6 rounded-2xl bg-tint-blue p-6 lg:col-span-3">
          <div>
            <Chip icon={FileSpreadsheet}>Set up in minutes</Chip>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">Start from a template or your spreadsheet</h3>
            <p className="mt-2 max-w-lg text-sm text-tint-blue-foreground">
              Pick a café, bakery or grocery starter menu, or import your products from a CSV. Rows with a
              problem are pointed out by their row number, so you fix them in the sheet you already have.
            </p>
          </div>
          <div aria-hidden className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-wrap gap-2 sm:flex-col">
              {["Café", "Bakery", "Grocery"].map((t, i) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-center text-sm font-semibold",
                    i === 0 ? "bg-foreground text-background" : "bg-card",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="rounded-xl bg-card p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <FileSpreadsheet className="size-4 text-tint-green-foreground" /> products.csv
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[96%] rounded-full bg-tint-green-foreground" />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-tint-green-foreground">48 products added</span>
                <span className="text-primary">2 to fix: rows 14 and 31</span>
              </div>
            </div>
          </div>
        </article>

        {/* VAT settings */}
        <article className="flex flex-col justify-between gap-6 rounded-2xl bg-tint-green p-6 lg:col-span-2">
          <div>
            <Chip icon={Percent}>VAT your way</Chip>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">VAT registered or not</h3>
            <p className="mt-2 text-sm text-tint-green-foreground">
              12% included by default. Change the rate or switch VAT off, and past receipts keep the VAT they were
              issued with.
            </p>
          </div>
          <div aria-hidden className="space-y-2 rounded-xl bg-card p-3 text-xs">
            {[
              ["Charge VAT", true],
              ["Prices include VAT", true],
            ].map(([label, on]) => (
              <div key={String(label)} className="flex items-center justify-between">
                <span className="font-semibold">{label}</span>
                <span className={cn("flex h-4 w-7 rounded-full p-0.5", on ? "justify-end bg-tint-green-foreground" : "bg-muted")}>
                  <span className="size-3 rounded-full bg-card" />
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-muted-foreground">
              <span>₱100 item at 12%</span>
              <span>VAT ₱10.71</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
