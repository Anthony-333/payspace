import { Boxes, ChefHat, Printer, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { cn } from "cn";
import { TESTIMONIALS, type Testimonial } from "./content";

const BENEFITS = [
  { icon: Zap, title: "Fast at the counter", body: "Ring up a queue quickly with big tiles, search and USB barcode scanners." },
  { icon: ChefHat, title: "Recipe costing", body: "Costs flow from ingredients to items, so margins stay accurate." },
  { icon: Boxes, title: "Stock management", body: "Track stock as it sells and catch low items before you run out." },
  { icon: ShieldCheck, title: "Private by design", body: "Each shop's data is kept separate and checked on every request." },
  { icon: Printer, title: "Receipts your way", body: "Print on 58 or 80 mm thermal paper, or share a digital receipt link." },
  { icon: Smartphone, title: "Runs on what you have", body: "Works in the browser on a tablet, phone or laptop. Nothing to install." },
];

const TINTS: Record<Testimonial["tint"], string> = {
  green: "bg-tint-green text-tint-green-foreground",
  blue: "bg-tint-blue text-tint-blue-foreground",
  peach: "bg-tint-peach text-tint-peach-foreground",
  violet: "bg-tint-violet text-tint-violet-foreground",
};

export function Benefits() {
  return (
    <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div>
        <h2 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Easy in the hand
        </h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          Made for busy counters and small teams. Here&apos;s what shops get from day one:
        </p>
        <ul className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <span className="grid size-11 place-items-center rounded-full bg-muted">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-5">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className={cn("rounded-2xl p-7", TINTS[t.tint])}>
            <blockquote className="text-xl leading-snug font-medium">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-card text-sm font-bold">
                {t.initials}
              </span>
              <span className="text-sm">
                <span className="block font-semibold">{t.name}</span>
                {t.role}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
