import type { Doc } from "../_generated/dataModel";
import { roundAvgCost } from "./costing";

// Starter catalogs for onboarding ("open for business in 15 minutes").
// Authored in US cents: prices per item, ingredient costs per base unit ($0.025 a gram of
// beans → 2.5), at typical 2026 supplier prices. `localizeTemplate` rescales them to the
// shop's currency so a new shop starts with believable numbers, which it then edits.

type Recipe = [stockKey: string, qty: number][];

export type Template = {
  categories: string[];
  stockItems: {
    key: string;
    name: string;
    baseUnit: Doc<"stockItems">["baseUnit"];
    avgCost: number;
    reorderPoint: number;
    purchaseUnit?: { name: string; factor: number };
  }[];
  modifierGroups: {
    key: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    options: { key: string; name: string; priceDelta: number; recipe?: Recipe }[];
  }[];
  products: (
    | { kind: "recipe"; name: string; category: string; price: number; recipe: Recipe; groups?: string[] }
    | { kind: "stocked"; name: string; category: string; price: number; cost: number }
  )[];
};

const MILK_DRINK = ["size-milk", "milk", "add-ons"];
const SWEET_MILK_DRINK = ["size-milk", "milk", "sugar", "add-ons"];
const BLACK_DRINK = ["size", "add-ons"];

const cafe: Template = {
  categories: ["Hot coffee", "Iced coffee", "Non-coffee"],
  stockItems: [
    { key: "beans", name: "Espresso beans", baseUnit: "g", avgCost: 2.5, reorderPoint: 1000, purchaseUnit: { name: "1 kg bag", factor: 1000 } },
    { key: "milk", name: "Fresh milk", baseUnit: "ml", avgCost: 0.1, reorderPoint: 4000, purchaseUnit: { name: "1 L carton", factor: 1000 } },
    { key: "oat", name: "Oat milk", baseUnit: "ml", avgCost: 0.3, reorderPoint: 2000, purchaseUnit: { name: "1 L carton", factor: 1000 } },
    { key: "condensed", name: "Condensed milk", baseUnit: "ml", avgCost: 0.5, reorderPoint: 500 },
    { key: "syrup", name: "Sugar syrup", baseUnit: "ml", avgCost: 0.1, reorderPoint: 1000 },
    { key: "vanilla", name: "Vanilla syrup", baseUnit: "ml", avgCost: 1.2, reorderPoint: 500, purchaseUnit: { name: "750 ml bottle", factor: 750 } },
    { key: "caramel", name: "Caramel sauce", baseUnit: "ml", avgCost: 1.2, reorderPoint: 500 },
    { key: "chocolate", name: "Chocolate sauce", baseUnit: "ml", avgCost: 1, reorderPoint: 500 },
    { key: "matcha", name: "Matcha powder", baseUnit: "g", avgCost: 6, reorderPoint: 200 },
    { key: "tea", name: "Black tea leaves", baseUnit: "g", avgCost: 4, reorderPoint: 200 },
    { key: "cream", name: "Whipped cream", baseUnit: "g", avgCost: 0.8, reorderPoint: 500 },
    { key: "ice", name: "Ice", baseUnit: "g", avgCost: 0.01, reorderPoint: 5000 },
    { key: "hot-cup", name: "Hot cup and lid, 12 oz", baseUnit: "pc", avgCost: 15, reorderPoint: 100, purchaseUnit: { name: "Sleeve of 50", factor: 50 } },
    { key: "iced-cup", name: "Iced cup, lid and straw, 16 oz", baseUnit: "pc", avgCost: 20, reorderPoint: 100, purchaseUnit: { name: "Sleeve of 50", factor: 50 } },
  ],
  modifierGroups: [
    {
      key: "size-milk", name: "Size (milk drinks)", minSelect: 1, maxSelect: 1,
      options: [
        { key: "regular", name: "Regular", priceDelta: 0 },
        { key: "large", name: "Large", priceDelta: 75, recipe: [["milk", 60]] },
      ],
    },
    {
      key: "size", name: "Size", minSelect: 1, maxSelect: 1,
      options: [
        { key: "regular", name: "Regular", priceDelta: 0 },
        { key: "large", name: "Large", priceDelta: 75 },
      ],
    },
    {
      key: "milk", name: "Milk", minSelect: 0, maxSelect: 1,
      options: [
        { key: "fresh", name: "Fresh milk", priceDelta: 0 },
        { key: "oat", name: "Oat milk", priceDelta: 75, recipe: [["oat", 150], ["milk", -150]] },
      ],
    },
    {
      key: "sugar", name: "Sugar level", minSelect: 1, maxSelect: 1,
      options: [
        { key: "100", name: "100% sugar", priceDelta: 0 },
        { key: "50", name: "50% sugar", priceDelta: 0, recipe: [["syrup", -10]] },
        { key: "0", name: "No sugar", priceDelta: 0, recipe: [["syrup", -20]] },
      ],
    },
    {
      key: "add-ons", name: "Add-ons", minSelect: 0, maxSelect: 3,
      options: [
        { key: "extra-shot", name: "Extra shot", priceDelta: 100, recipe: [["beans", 18]] },
        { key: "vanilla", name: "Vanilla syrup", priceDelta: 75, recipe: [["vanilla", 15]] },
        { key: "whipped-cream", name: "Whipped cream", priceDelta: 75, recipe: [["cream", 20]] },
      ],
    },
  ],
  products: [
    { kind: "recipe", category: "Hot coffee", name: "Espresso", price: 300, recipe: [["beans", 18], ["hot-cup", 1]], groups: ["add-ons"] },
    { kind: "recipe", category: "Hot coffee", name: "Americano", price: 350, recipe: [["beans", 18], ["hot-cup", 1]], groups: BLACK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Café latte", price: 475, recipe: [["beans", 18], ["milk", 180], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Cappuccino", price: 475, recipe: [["beans", 18], ["milk", 150], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Flat white", price: 500, recipe: [["beans", 18], ["milk", 120], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Mocha", price: 525, recipe: [["beans", 18], ["milk", 150], ["chocolate", 30], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Caramel macchiato", price: 550, recipe: [["beans", 18], ["milk", 150], ["caramel", 25], ["vanilla", 10], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Spanish latte", price: 525, recipe: [["beans", 18], ["milk", 150], ["condensed", 30], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced Americano", price: 375, recipe: [["beans", 18], ["ice", 150], ["iced-cup", 1]], groups: BLACK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced latte", price: 500, recipe: [["beans", 18], ["milk", 180], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced vanilla latte", price: 550, recipe: [["beans", 18], ["milk", 180], ["vanilla", 20], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced mocha", price: 575, recipe: [["beans", 18], ["milk", 150], ["chocolate", 30], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced caramel macchiato", price: 575, recipe: [["beans", 18], ["milk", 150], ["caramel", 25], ["vanilla", 10], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced Spanish latte", price: 550, recipe: [["beans", 18], ["milk", 150], ["condensed", 30], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Cold brew", price: 475, recipe: [["beans", 25], ["ice", 150], ["iced-cup", 1]], groups: BLACK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Matcha latte", price: 525, recipe: [["matcha", 5], ["milk", 180], ["syrup", 20], ["hot-cup", 1]], groups: SWEET_MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Iced matcha latte", price: 550, recipe: [["matcha", 5], ["milk", 180], ["syrup", 20], ["ice", 150], ["iced-cup", 1]], groups: SWEET_MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Hot chocolate", price: 425, recipe: [["chocolate", 40], ["milk", 200], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Iced chocolate", price: 450, recipe: [["chocolate", 40], ["milk", 180], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Iced tea", price: 325, recipe: [["tea", 5], ["syrup", 20], ["ice", 150], ["iced-cup", 1]], groups: ["size", "sugar"] },
  ],
};

const bakery: Template = {
  categories: ["Breads", "Pastries", "Drinks"],
  stockItems: [
    { key: "flour", name: "Bread flour", baseUnit: "g", avgCost: 0.12, reorderPoint: 25000, purchaseUnit: { name: "25 kg sack", factor: 25000 } },
    { key: "sugar", name: "White sugar", baseUnit: "g", avgCost: 0.2, reorderPoint: 5000, purchaseUnit: { name: "1 kg pack", factor: 1000 } },
    { key: "butter", name: "Butter", baseUnit: "g", avgCost: 1, reorderPoint: 2000, purchaseUnit: { name: "250 g block", factor: 250 } },
    { key: "eggs", name: "Eggs", baseUnit: "pc", avgCost: 30, reorderPoint: 60, purchaseUnit: { name: "Tray of 30", factor: 30 } },
    { key: "yeast", name: "Instant yeast", baseUnit: "g", avgCost: 1.5, reorderPoint: 500 },
    { key: "milk", name: "Fresh milk", baseUnit: "ml", avgCost: 0.1, reorderPoint: 2000, purchaseUnit: { name: "1 L carton", factor: 1000 } },
    { key: "cheese", name: "Cheddar cheese", baseUnit: "g", avgCost: 1.2, reorderPoint: 1000 },
    { key: "blueberries", name: "Blueberries", baseUnit: "g", avgCost: 1.5, reorderPoint: 1000 },
    { key: "banana", name: "Bananas", baseUnit: "pc", avgCost: 25, reorderPoint: 20 },
    { key: "cocoa", name: "Cocoa powder", baseUnit: "g", avgCost: 1.5, reorderPoint: 500 },
    { key: "cinnamon", name: "Ground cinnamon", baseUnit: "g", avgCost: 3, reorderPoint: 200 },
    { key: "beans", name: "Coffee beans", baseUnit: "g", avgCost: 2.5, reorderPoint: 1000, purchaseUnit: { name: "1 kg bag", factor: 1000 } },
    { key: "bag", name: "Paper bag", baseUnit: "pc", avgCost: 5, reorderPoint: 200, purchaseUnit: { name: "Pack of 100", factor: 100 } },
    { key: "cup", name: "Hot cup and lid", baseUnit: "pc", avgCost: 15, reorderPoint: 100, purchaseUnit: { name: "Sleeve of 50", factor: 50 } },
  ],
  modifierGroups: [
    {
      key: "coffee", name: "Coffee extras", minSelect: 0, maxSelect: 2,
      options: [
        { key: "milk", name: "With milk", priceDelta: 50, recipe: [["milk", 60]] },
        { key: "extra-shot", name: "Extra shot", priceDelta: 100, recipe: [["beans", 12]] },
      ],
    },
  ],
  products: [
    { kind: "recipe", category: "Breads", name: "Dinner roll", price: 75, recipe: [["flour", 25], ["sugar", 3], ["butter", 2], ["yeast", 0.5], ["bag", 0.1]] },
    { kind: "recipe", category: "Breads", name: "Brioche bun", price: 150, recipe: [["flour", 40], ["sugar", 10], ["butter", 10], ["eggs", 0.1], ["yeast", 0.5], ["bag", 0.2]] },
    { kind: "recipe", category: "Breads", name: "Cheese roll", price: 225, recipe: [["flour", 40], ["sugar", 5], ["butter", 8], ["cheese", 10], ["yeast", 0.5], ["bag", 0.2]] },
    { kind: "recipe", category: "Breads", name: "Banana bread (slice)", price: 325, recipe: [["flour", 30], ["sugar", 15], ["butter", 12], ["eggs", 0.25], ["banana", 0.5], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Butter croissant", price: 375, recipe: [["flour", 45], ["sugar", 6], ["butter", 30], ["eggs", 0.1], ["yeast", 0.5], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Blueberry muffin", price: 325, recipe: [["flour", 35], ["sugar", 15], ["butter", 12], ["eggs", 0.25], ["milk", 30], ["blueberries", 25], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Cinnamon roll", price: 425, recipe: [["flour", 60], ["sugar", 20], ["butter", 20], ["cinnamon", 2], ["eggs", 0.2], ["yeast", 1], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Chocolate crinkle cookie", price: 175, recipe: [["flour", 20], ["sugar", 15], ["cocoa", 8], ["butter", 5], ["eggs", 0.15], ["bag", 0.2]] },
    { kind: "recipe", category: "Pastries", name: "Custard tart (slice)", price: 375, recipe: [["flour", 25], ["sugar", 15], ["butter", 12], ["eggs", 0.75], ["milk", 60], ["bag", 1]] },
    { kind: "recipe", category: "Drinks", name: "Brewed coffee", price: 300, recipe: [["beans", 12], ["cup", 1]], groups: ["coffee"] },
    { kind: "stocked", category: "Drinks", name: "Bottled water 500 ml", price: 175, cost: 60 },
    { kind: "stocked", category: "Drinks", name: "Soft drink 330 ml can", price: 225, cost: 110 },
  ],
};

const grocery: Template = {
  categories: ["Beverages", "Snacks", "Canned goods", "Condiments", "Household", "Personal care"],
  stockItems: [],
  modifierGroups: [],
  products: [
    { kind: "stocked", category: "Beverages", name: "Soft drink 330 ml can", price: 175, cost: 110 },
    { kind: "stocked", category: "Beverages", name: "Bottled water 500 ml", price: 150, cost: 70 },
    { kind: "stocked", category: "Beverages", name: "Instant coffee sachet", price: 50, cost: 30 },
    { kind: "stocked", category: "Snacks", name: "Potato chips 60 g", price: 225, cost: 150 },
    { kind: "stocked", category: "Snacks", name: "Instant noodles", price: 125, cost: 75 },
    { kind: "stocked", category: "Canned goods", name: "Tuna in brine 150 g", price: 225, cost: 160 },
    { kind: "stocked", category: "Canned goods", name: "Baked beans 400 g", price: 200, cost: 140 },
    { kind: "stocked", category: "Condiments", name: "Soy sauce 350 ml", price: 300, cost: 200 },
    { kind: "stocked", category: "Condiments", name: "White vinegar 500 ml", price: 250, cost: 160 },
    { kind: "stocked", category: "Household", name: "Laundry detergent 1 kg", price: 650, cost: 470 },
    { kind: "stocked", category: "Personal care", name: "Shampoo 200 ml", price: 550, cost: 380 },
    { kind: "stocked", category: "Personal care", name: "Bath soap 90 g", price: 150, cost: 100 },
  ],
};

export const TEMPLATES: Partial<Record<Doc<"tenants">["businessType"], Template>> = { cafe, bakery, grocery };

/**
 * Roughly what a US$1 counter item costs in each currency: a price level for café and
 * corner-store goods, not an exchange rate. Unlisted currencies keep the dollar figures.
 */
const PRICE_LEVEL: Record<string, number> = {
  USD: 1, EUR: 0.9, GBP: 0.8, CAD: 1.35, AUD: 1.5, NZD: 1.65, SGD: 1.3, HKD: 7.5,
  PHP: 28, INR: 40, MYR: 3, THB: 20, AED: 3.7, ZAR: 10, MXN: 15, BRL: 4, CHF: 1.2, SEK: 9,
};

/** Price steps in minor units, so a converted latte reads €4.30 or ₱135, not €4.27 or ₱133. */
const STEPS = [5, 10, 25, 50, 100, 500, 1000];

/** A template with its prices and costs in `currency`; prices land on a round step. */
export function localizeTemplate(template: Template, currency: string): Template {
  const level = PRICE_LEVEL[currency] ?? 1;
  const step = STEPS.filter((s) => s <= 25 * level).pop() ?? STEPS[0];
  const price = (minor: number) => (minor === 0 ? 0 : Math.max(step, Math.round((minor * level) / step) * step));
  return {
    ...template,
    stockItems: template.stockItems.map((item) => ({ ...item, avgCost: roundAvgCost(item.avgCost * level) })),
    modifierGroups: template.modifierGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({ ...option, priceDelta: price(option.priceDelta) })),
    })),
    products: template.products.map((product) =>
      product.kind === "stocked"
        ? { ...product, price: price(product.price), cost: Math.round(product.cost * level) }
        : { ...product, price: price(product.price) }),
  };
}
