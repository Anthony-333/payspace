import type { FunctionReturnType } from "convex/server";
import {
  Cake,
  Coffee,
  Croissant,
  CupSoda,
  Drumstick,
  Leaf,
  Package,
  Pizza,
  Salad,
  Sandwich,
  ShoppingBasket,
  Soup,
  Sparkles,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

export type SaleProduct = FunctionReturnType<typeof api.products.forSale>[number];
export type Group = Doc<"modifierGroups">;

export const optionRef = (groupId: string, key: string) => `${groupId}:${key}`;

/**
 * The price shown in the cart for a product with chosen options, and the option names.
 * Returns null if an option no longer exists. This is a display estimate: checkout
 * re-prices on the server (CLAUDE.md rule 6).
 */
export function describeLine(product: SaleProduct, groups: Map<string, Group>, options: string[]) {
  let unitPrice = product.price;
  const optionNames: string[] = [];
  for (const ref of options) {
    const split = ref.indexOf(":");
    const group = groups.get(ref.slice(0, split));
    const option = group?.options.find((o) => o.key === ref.slice(split + 1));
    if (!option) return null;
    unitPrice += option.priceDelta;
    optionNames.push(option.name);
  }
  return { unitPrice: Math.max(0, unitPrice), optionNames };
}

/** The product's modifier groups that still exist, in the product's order. */
export function groupsFor(product: SaleProduct, groups: Map<string, Group>) {
  return product.modifierGroupIds.flatMap((id) => groups.get(id) ?? []);
}

/** Default choices: required single-choice groups start on their first option. */
export function defaultOptions(productGroups: Group[]) {
  return productGroups.flatMap((g) => (g.minSelect >= 1 && g.maxSelect === 1 ? [optionRef(g._id, g.options[0].key)] : []));
}

const CATEGORY_ICONS: [RegExp, LucideIcon][] = [
  [/non-coffee|tea|matcha/i, Leaf],
  [/iced|cold|frapp|drink|beverage|juice|soda|shake/i, CupSoda],
  [/coffee|espresso|latte|brew/i, Coffee],
  [/pastr|croissant|bak/i, Croissant],
  [/bread|pandesal|grain|rice/i, Wheat],
  [/cake|dessert|sweet/i, Cake],
  [/soup|noodle|ramen/i, Soup],
  [/sandwich|burger|snack/i, Sandwich],
  [/pizza|pasta/i, Pizza],
  [/salad|vegetable|veggie/i, Salad],
  [/chicken|meat|grill/i, Drumstick],
  [/canned|condiment|grocery|household|personal/i, ShoppingBasket],
  [/add-on|extra|special/i, Sparkles],
  [/meal|lunch|dinner|breakfast/i, UtensilsCrossed],
];

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? Package;
}
