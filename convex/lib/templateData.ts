import type { Doc } from "../_generated/dataModel";

// Starter catalogs for onboarding ("open for business in 15 minutes").
// Prices are in centavos and include 12% VAT. Ingredient costs are centavos per base unit
// (₱1.20 per gram of beans → 120) and are typical Metro Manila supplier prices in 2026.

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
    { key: "beans", name: "Espresso beans", baseUnit: "g", avgCost: 120, reorderPoint: 1000, purchaseUnit: { name: "1 kg bag", factor: 1000 } },
    { key: "milk", name: "Fresh milk", baseUnit: "ml", avgCost: 11, reorderPoint: 4000, purchaseUnit: { name: "1 L carton", factor: 1000 } },
    { key: "oat", name: "Oat milk", baseUnit: "ml", avgCost: 25, reorderPoint: 2000, purchaseUnit: { name: "1 L carton", factor: 1000 } },
    { key: "condensed", name: "Condensed milk", baseUnit: "ml", avgCost: 15, reorderPoint: 500 },
    { key: "syrup", name: "Sugar syrup", baseUnit: "ml", avgCost: 5, reorderPoint: 1000 },
    { key: "vanilla", name: "Vanilla syrup", baseUnit: "ml", avgCost: 30, reorderPoint: 500, purchaseUnit: { name: "750 ml bottle", factor: 750 } },
    { key: "caramel", name: "Caramel sauce", baseUnit: "ml", avgCost: 35, reorderPoint: 500 },
    { key: "chocolate", name: "Chocolate sauce", baseUnit: "ml", avgCost: 30, reorderPoint: 500 },
    { key: "matcha", name: "Matcha powder", baseUnit: "g", avgCost: 400, reorderPoint: 200 },
    { key: "tea", name: "Black tea leaves", baseUnit: "g", avgCost: 150, reorderPoint: 200 },
    { key: "cream", name: "Whipped cream", baseUnit: "g", avgCost: 20, reorderPoint: 500 },
    { key: "ice", name: "Ice", baseUnit: "g", avgCost: 1, reorderPoint: 5000 },
    { key: "hot-cup", name: "Hot cup and lid, 12 oz", baseUnit: "pc", avgCost: 600, reorderPoint: 100, purchaseUnit: { name: "Sleeve of 50", factor: 50 } },
    { key: "iced-cup", name: "Iced cup, lid and straw, 16 oz", baseUnit: "pc", avgCost: 750, reorderPoint: 100, purchaseUnit: { name: "Sleeve of 50", factor: 50 } },
  ],
  modifierGroups: [
    {
      key: "size-milk", name: "Size (milk drinks)", minSelect: 1, maxSelect: 1,
      options: [
        { key: "regular", name: "Regular", priceDelta: 0 },
        { key: "large", name: "Large", priceDelta: 2000, recipe: [["milk", 60]] },
      ],
    },
    {
      key: "size", name: "Size", minSelect: 1, maxSelect: 1,
      options: [
        { key: "regular", name: "Regular", priceDelta: 0 },
        { key: "large", name: "Large", priceDelta: 2000 },
      ],
    },
    {
      key: "milk", name: "Milk", minSelect: 0, maxSelect: 1,
      options: [
        { key: "fresh", name: "Fresh milk", priceDelta: 0 },
        { key: "oat", name: "Oat milk", priceDelta: 2000, recipe: [["oat", 150], ["milk", -150]] },
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
        { key: "extra-shot", name: "Extra shot", priceDelta: 3000, recipe: [["beans", 18]] },
        { key: "vanilla", name: "Vanilla syrup", priceDelta: 2000, recipe: [["vanilla", 15]] },
        { key: "whipped-cream", name: "Whipped cream", priceDelta: 2500, recipe: [["cream", 20]] },
      ],
    },
  ],
  products: [
    { kind: "recipe", category: "Hot coffee", name: "Espresso", price: 9000, recipe: [["beans", 18], ["hot-cup", 1]], groups: ["add-ons"] },
    { kind: "recipe", category: "Hot coffee", name: "Americano", price: 11000, recipe: [["beans", 18], ["hot-cup", 1]], groups: BLACK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Café latte", price: 13000, recipe: [["beans", 18], ["milk", 180], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Cappuccino", price: 13000, recipe: [["beans", 18], ["milk", 150], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Flat white", price: 14000, recipe: [["beans", 18], ["milk", 120], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Mocha", price: 15000, recipe: [["beans", 18], ["milk", 150], ["chocolate", 30], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Caramel macchiato", price: 15500, recipe: [["beans", 18], ["milk", 150], ["caramel", 25], ["vanilla", 10], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Hot coffee", name: "Spanish latte", price: 15000, recipe: [["beans", 18], ["milk", 150], ["condensed", 30], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced Americano", price: 12000, recipe: [["beans", 18], ["ice", 150], ["iced-cup", 1]], groups: BLACK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced latte", price: 14000, recipe: [["beans", 18], ["milk", 180], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced vanilla latte", price: 15000, recipe: [["beans", 18], ["milk", 180], ["vanilla", 20], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced mocha", price: 16000, recipe: [["beans", 18], ["milk", 150], ["chocolate", 30], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced caramel macchiato", price: 16500, recipe: [["beans", 18], ["milk", 150], ["caramel", 25], ["vanilla", 10], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Iced Spanish latte", price: 16000, recipe: [["beans", 18], ["milk", 150], ["condensed", 30], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Iced coffee", name: "Cold brew", price: 14000, recipe: [["beans", 25], ["ice", 150], ["iced-cup", 1]], groups: BLACK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Matcha latte", price: 15500, recipe: [["matcha", 5], ["milk", 180], ["syrup", 20], ["hot-cup", 1]], groups: SWEET_MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Iced matcha latte", price: 16000, recipe: [["matcha", 5], ["milk", 180], ["syrup", 20], ["ice", 150], ["iced-cup", 1]], groups: SWEET_MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Hot chocolate", price: 13000, recipe: [["chocolate", 40], ["milk", 200], ["hot-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Iced chocolate", price: 14000, recipe: [["chocolate", 40], ["milk", 180], ["ice", 150], ["iced-cup", 1]], groups: MILK_DRINK },
    { kind: "recipe", category: "Non-coffee", name: "Iced tea", price: 9000, recipe: [["tea", 5], ["syrup", 20], ["ice", 150], ["iced-cup", 1]], groups: ["size", "sugar"] },
  ],
};

const bakery: Template = {
  categories: ["Breads", "Pastries", "Drinks"],
  stockItems: [
    { key: "flour", name: "Bread flour", baseUnit: "g", avgCost: 6, reorderPoint: 25000, purchaseUnit: { name: "25 kg sack", factor: 25000 } },
    { key: "sugar", name: "White sugar", baseUnit: "g", avgCost: 8, reorderPoint: 5000, purchaseUnit: { name: "1 kg pack", factor: 1000 } },
    { key: "butter", name: "Butter", baseUnit: "g", avgCost: 55, reorderPoint: 2000, purchaseUnit: { name: "225 g bar", factor: 225 } },
    { key: "eggs", name: "Eggs", baseUnit: "pc", avgCost: 900, reorderPoint: 60, purchaseUnit: { name: "Tray of 30", factor: 30 } },
    { key: "yeast", name: "Instant yeast", baseUnit: "g", avgCost: 40, reorderPoint: 500 },
    { key: "milk", name: "Fresh milk", baseUnit: "ml", avgCost: 11, reorderPoint: 2000, purchaseUnit: { name: "1 L carton", factor: 1000 } },
    { key: "cheese", name: "Cheddar cheese", baseUnit: "g", avgCost: 45, reorderPoint: 1000 },
    { key: "ube", name: "Ube halaya", baseUnit: "g", avgCost: 30, reorderPoint: 1000 },
    { key: "banana", name: "Bananas", baseUnit: "pc", avgCost: 800, reorderPoint: 20 },
    { key: "cocoa", name: "Cocoa powder", baseUnit: "g", avgCost: 40, reorderPoint: 500 },
    { key: "cinnamon", name: "Ground cinnamon", baseUnit: "g", avgCost: 80, reorderPoint: 200 },
    { key: "beans", name: "Coffee beans", baseUnit: "g", avgCost: 100, reorderPoint: 1000, purchaseUnit: { name: "1 kg bag", factor: 1000 } },
    { key: "bag", name: "Paper bag", baseUnit: "pc", avgCost: 100, reorderPoint: 200, purchaseUnit: { name: "Pack of 100", factor: 100 } },
    { key: "cup", name: "Hot cup and lid", baseUnit: "pc", avgCost: 600, reorderPoint: 100, purchaseUnit: { name: "Sleeve of 50", factor: 50 } },
  ],
  modifierGroups: [
    {
      key: "coffee", name: "Coffee extras", minSelect: 0, maxSelect: 2,
      options: [
        { key: "milk", name: "With milk", priceDelta: 1000, recipe: [["milk", 60]] },
        { key: "extra-shot", name: "Extra shot", priceDelta: 2000, recipe: [["beans", 12]] },
      ],
    },
  ],
  products: [
    { kind: "recipe", category: "Breads", name: "Pandesal", price: 500, recipe: [["flour", 25], ["sugar", 3], ["butter", 2], ["yeast", 0.5], ["bag", 0.1]] },
    { kind: "recipe", category: "Breads", name: "Spanish bread", price: 1500, recipe: [["flour", 40], ["sugar", 10], ["butter", 10], ["yeast", 0.5], ["bag", 0.2]] },
    { kind: "recipe", category: "Breads", name: "Cheese roll", price: 2500, recipe: [["flour", 40], ["sugar", 5], ["butter", 8], ["cheese", 10], ["yeast", 0.5], ["bag", 0.2]] },
    { kind: "recipe", category: "Breads", name: "Ube cheese pandesal", price: 2000, recipe: [["flour", 35], ["sugar", 5], ["butter", 4], ["ube", 15], ["cheese", 5], ["yeast", 0.5], ["bag", 0.2]] },
    { kind: "recipe", category: "Breads", name: "Banana bread (slice)", price: 4500, recipe: [["flour", 30], ["sugar", 15], ["butter", 12], ["eggs", 0.25], ["banana", 0.5], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Ensaymada", price: 3500, recipe: [["flour", 45], ["sugar", 12], ["butter", 15], ["eggs", 0.2], ["cheese", 5], ["yeast", 0.5], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Cinnamon roll", price: 6500, recipe: [["flour", 60], ["sugar", 20], ["butter", 20], ["cinnamon", 2], ["eggs", 0.2], ["yeast", 1], ["bag", 1]] },
    { kind: "recipe", category: "Pastries", name: "Chocolate crinkles", price: 2000, recipe: [["flour", 20], ["sugar", 15], ["cocoa", 8], ["butter", 5], ["eggs", 0.15], ["bag", 0.2]] },
    { kind: "recipe", category: "Pastries", name: "Egg pie (slice)", price: 5500, recipe: [["flour", 25], ["sugar", 15], ["butter", 12], ["eggs", 0.75], ["milk", 60], ["bag", 1]] },
    { kind: "recipe", category: "Drinks", name: "Brewed coffee", price: 6000, recipe: [["beans", 12], ["cup", 1]], groups: ["coffee"] },
    { kind: "stocked", category: "Drinks", name: "Bottled water 500 ml", price: 2500, cost: 1200 },
    { kind: "stocked", category: "Drinks", name: "Soft drink 330 ml can", price: 4500, cost: 3200 },
  ],
};

const grocery: Template = {
  categories: ["Beverages", "Snacks", "Canned goods", "Condiments", "Household", "Personal care"],
  stockItems: [],
  modifierGroups: [],
  products: [
    { kind: "stocked", category: "Beverages", name: "Soft drink 330 ml can", price: 4500, cost: 3500 },
    { kind: "stocked", category: "Beverages", name: "Bottled water 500 ml", price: 2000, cost: 1200 },
    { kind: "stocked", category: "Beverages", name: "3-in-1 coffee sachet", price: 1000, cost: 750 },
    { kind: "stocked", category: "Snacks", name: "Potato chips 60 g", price: 3500, cost: 2600 },
    { kind: "stocked", category: "Snacks", name: "Instant noodles", price: 1500, cost: 1100 },
    { kind: "stocked", category: "Canned goods", name: "Sardines in tomato sauce 155 g", price: 2800, cost: 2200 },
    { kind: "stocked", category: "Canned goods", name: "Corned beef 150 g", price: 4500, cost: 3700 },
    { kind: "stocked", category: "Condiments", name: "Soy sauce 350 ml", price: 2500, cost: 1900 },
    { kind: "stocked", category: "Condiments", name: "Cane vinegar 350 ml", price: 2200, cost: 1600 },
    { kind: "stocked", category: "Household", name: "Laundry powder sachet", price: 1200, cost: 900 },
    { kind: "stocked", category: "Personal care", name: "Shampoo sachet", price: 800, cost: 600 },
    { kind: "stocked", category: "Personal care", name: "Bath soap 90 g", price: 3500, cost: 2700 },
  ],
};

export const TEMPLATES: Partial<Record<Doc<"tenants">["businessType"], Template>> = { cafe, bakery, grocery };
