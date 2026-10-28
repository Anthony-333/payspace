import type { Shop } from "@/components/shop/shop-provider";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /**
   * `data-tour` values to point at, tried in order; the first one visible on screen wins.
   * With none visible (or none given) the popover sits in the middle of the screen.
   */
  targets?: string[];
  /** Route under the shop (e.g. "/pos") the step needs; the tour goes there first. */
  route?: string;
  /** Who sees the step. The server enforces the same rules on the pages themselves. */
  audience?: "manage" | "owner";
};

// On phones the rail is hidden, so rail steps fall back to the menu button.
const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Payspace",
    body: "A quick look around: where to sell, where your receipts go, and where to find your numbers. It takes under a minute.",
  },
  {
    id: "pos-menu",
    route: "/pos",
    targets: ["pos-menu"],
    title: "Tap to sell",
    body: "Your menu lives here. Tap an item to add it to the order, or scan a barcode into the search bar.",
  },
  {
    id: "pos-order",
    route: "/pos",
    targets: ["pos-order"],
    title: "The order",
    body: "Check the items, then place the order to take cash, e-wallet or card. Split payments work too.",
  },
  {
    id: "receipts",
    targets: ["nav-/receipts", "nav-menu"],
    title: "Receipts",
    body: "Every sale lands here. Reprint a receipt or share its link with a customer.",
  },
  {
    id: "loyalty",
    targets: ["nav-/loyalty", "nav-menu"],
    title: "Loyalty cards",
    body: "On Pro, give regulars a stamp card and reward them after a set number of visits.",
  },
  {
    id: "dashboard",
    audience: "manage",
    targets: ["nav-", "nav-menu"],
    title: "Dashboard",
    body: "Today's sales and true profit at a glance. On Pro, alerts warn you about low stock and thin margins.",
  },
  {
    id: "products",
    audience: "manage",
    targets: ["nav-/products", "nav-menu"],
    title: "Products and recipes",
    body: "Add what you sell. On Pro, give an item a recipe and Payspace works out what it really costs you to make.",
  },
  {
    id: "inventory",
    audience: "manage",
    targets: ["nav-/inventory", "nav-menu"],
    title: "Inventory",
    body: "Receive deliveries, count stock and log waste. Every sale deducts what it used.",
  },
  {
    id: "settings",
    audience: "owner",
    targets: ["nav-/settings", "nav-menu"],
    title: "Settings",
    body: "Set your currency, tax, target margin and plan here.",
  },
  {
    id: "profile",
    targets: ["profile"],
    title: "You're all set",
    body: "Switch shops from this menu. You can take this tour again from here any time.",
  },
];

export function stepsFor(role: Shop["role"]) {
  return STEPS.filter((step) =>
    !step.audience
    || (step.audience === "manage" && (role === "owner" || role === "manager"))
    || (step.audience === "owner" && role === "owner"));
}
