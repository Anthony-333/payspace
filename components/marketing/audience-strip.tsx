import Link from "next/link";
import { Coffee, Croissant, CupSoda, Shirt, ShoppingBasket, Soup } from "lucide-react";

const SHOPS = [
  { icon: Coffee, label: "Coffee shops", href: "/pos/coffee-shop" },
  { icon: Croissant, label: "Bakeries", href: "/pos/bakery" },
  { icon: CupSoda, label: "Milk tea", href: "/pos/milk-tea-shop" },
  { icon: ShoppingBasket, label: "Groceries", href: "/pos/grocery" },
  { icon: Soup, label: "Food stalls", href: null },
  { icon: Shirt, label: "Small retail", href: null },
];

// Stands in for the reference's logo wall: the kinds of shops Payspace is built for. Types
// with an industry page link to it.
export function AudienceStrip() {
  return (
    <section aria-labelledby="audience-title" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <h2 id="audience-title" className="text-center text-base font-medium">
        Built for small shops across the Philippines
      </h2>
      <ul className="mt-8 grid grid-cols-3 gap-y-8 sm:grid-cols-6">
        {SHOPS.map(({ icon: Icon, label, href }) => {
          const inner = (
            <>
              <Icon className="size-10" strokeWidth={1.6} />
              <span className="text-sm font-semibold">{label}</span>
            </>
          );
          return (
            <li key={label} className="flex justify-center text-foreground">
              {href ? (
                <Link href={href} className="flex flex-col items-center gap-2 transition-colors hover:text-primary">
                  {inner}
                </Link>
              ) : (
                <span className="flex flex-col items-center gap-2">{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
