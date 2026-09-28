import Link from "next/link";
import { cn } from "cn";
import { DashboardMockup, PosMockup, RecipeMockup, StockMockup, TabletFrame } from "./mockups";

const FEATURES = [
  {
    title: "Profit per item, not just sales",
    body: "Build each drink or pastry from its ingredients in grams, millilitres or pieces. As you receive stock, costs update on their own, and anything below your target margin gets flagged.",
    screen: <RecipeMockup />,
    label: "Recipe screen showing a latte's ingredient costs and profit",
  },
  {
    title: "A checkout your cashiers learn in minutes",
    body: "Big, touch-first tiles for tablets and phones. Record cash, GCash, Maya or card, split a bill across methods, and print a receipt or share a digital one. VAT is worked out for you.",
    screen: <PosMockup />,
    label: "Checkout screen with an order and payment methods",
  },
  {
    title: "Stock you can trust",
    body: "Every sale, delivery, spoilage and count goes into a stock ledger, so on-hand numbers always add up. Low-stock items show up before you run out.",
    screen: <StockMockup />,
    label: "Stock list with on-hand amounts and low-stock warnings",
  },
  {
    title: "A dashboard that shows what you made",
    body: "Sales, profit and margin for today against the same day last week, your best sellers by profit, busy hours and payment mix. It updates live as sales come in.",
    screen: <DashboardMockup />,
    label: "Dashboard with sales, profit and top items by profit",
  },
];

export function Features({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-6 px-4 py-12 sm:px-6">
      <h2 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        Everything your shop needs, including the profit it&apos;s hiding
      </h2>
      <div className="mt-12 space-y-6">
        {FEATURES.map((f, i) => (
          <article
            key={f.title}
            className="grid grid-cols-1 items-center gap-8 rounded-[32px] bg-muted p-6 sm:p-10 lg:grid-cols-2 lg:gap-14"
          >
            <TabletFrame label={f.label} className={cn("aspect-[16/10] w-full", i % 2 === 1 && "lg:order-2")}>
              {f.screen}
            </TabletFrame>
            <div>
              <h3 className="text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">{f.title}</h3>
              <p className="mt-4 max-w-lg text-muted-foreground">{f.body}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={ctaHref}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Start free
                </Link>
                <a
                  href="#pricing"
                  className="rounded-full border border-foreground/80 px-6 py-3 text-sm font-semibold transition-colors hover:bg-card"
                >
                  See pricing
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
