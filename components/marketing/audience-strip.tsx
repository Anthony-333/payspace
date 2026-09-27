import { Coffee, Croissant, CupSoda, Shirt, ShoppingBasket, Soup } from "lucide-react";

const SHOPS = [
  { icon: Coffee, label: "Coffee shops" },
  { icon: Croissant, label: "Bakeries" },
  { icon: CupSoda, label: "Milk tea" },
  { icon: ShoppingBasket, label: "Groceries" },
  { icon: Soup, label: "Food stalls" },
  { icon: Shirt, label: "Small retail" },
];

// Stands in for the reference's logo wall: the kinds of shops Payspace is built for.
export function AudienceStrip() {
  return (
    <section aria-labelledby="audience-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <h2 id="audience-title" className="text-center text-base font-medium">
        Built for small shops across the Philippines
      </h2>
      <ul className="mt-8 grid grid-cols-3 gap-y-8 sm:grid-cols-6">
        {SHOPS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-2 text-foreground">
            <Icon className="size-10" strokeWidth={1.6} />
            <span className="text-sm font-semibold">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
