// Copy for the landing page (app/(marketing)/page.tsx). Keep claims to what the app does
// today; anything not built yet is marked "Soon".

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  tint: "green" | "blue" | "peach" | "violet";
};

// Placeholder testimonials: fictional people and shops. Replace with real pilot quotes
// before launch (see docs/progress.md backlog).
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I used to guess my drink margins. Now I know every latte makes at least ₱90, and I repriced the two that didn't.",
    name: "Carla Mendoza",
    role: "Owner, Kapehan sa Kanto",
    initials: "CM",
    tint: "green",
  },
  {
    quote:
      "Stock counts used to eat my whole Sunday. Now the ledger tells me what's running low before the supplier even calls.",
    name: "Ramon Dizon",
    role: "Owner, Dizon Bakeshop",
    initials: "RD",
    tint: "blue",
  },
  {
    quote:
      "My cashiers learned it in ten minutes. GCash reference numbers are saved with every sale, so closing up is quick.",
    name: "Joy Villanueva",
    role: "Manager, Tindahan ni Aling Nena",
    initials: "JV",
    tint: "peach",
  },
];

// Pro is charged in US dollars through Polar (convex/billing.ts). The peso figure is a guide
// for Filipino shop owners; update it if the exchange rate moves a lot.
// Must match the Pro product's price in Polar (POLAR_PRO_PRODUCT_ID); Polar charges what it has.
export const PRO_PRICE = { usd: 10, phpApprox: 580, trialDays: 14 } as const;
export const PRO_PRICE_TEXT = `${PRO_PRICE.usd} (about ₱${PRO_PRICE.phpApprox}) a month per shop`;

export type PlanRow = { label: string; free: string | boolean; pro: string | boolean };

// Free-tier limits are a first proposal; adjust once billing is built.
export const PLAN_ROWS: PlanRow[] = [
  { label: "Checkout with cash, GCash, Maya and card", free: true, pro: true },
  { label: "Split payments and e-wallet reference numbers", free: true, pro: true },
  { label: "Printed and digital receipts", free: true, pro: true },
  { label: "Products", free: "Up to 50", pro: "Unlimited" },
  { label: "Stock tracking and ledger", free: true, pro: true },
  { label: "Dashboard history", free: "Last 7 days", pro: "All time" },
  { label: "Recipe costing and profit per item", free: false, pro: true },
  { label: "Margin and low-stock alerts", free: false, pro: true },
  { label: "Staff accounts and roles", free: false, pro: "Soon" },
  { label: "CSV exports and full backup", free: false, pro: "Soon" },
];

export type FaqCategory = "General" | "Pricing" | "Payments" | "Data";

export const FAQ: { category: FaqCategory; q: string; a: string }[] = [
  {
    category: "General",
    q: "What kinds of businesses is Payspace for?",
    a: "Small shops that sell over a counter: coffee shops, milk tea stands, bakeries, groceries, sari-sari stores and small retail. Start from a café, bakery or grocery template, or import your products from a spreadsheet.",
  },
  {
    category: "General",
    q: "How does profit per item work?",
    a: "Give each drink or baked good a recipe in grams, millilitres or pieces. When you receive stock, Payspace keeps a weighted average cost for every ingredient, so each item's cost updates by itself. Items that fall below your target margin are flagged on the dashboard.",
  },
  {
    category: "General",
    q: "What devices do I need?",
    a: "Any tablet, phone or laptop with a modern browser. USB barcode scanners work out of the box, and receipts print on 58 mm or 80 mm thermal printers through the browser's print dialog.",
  },
  {
    category: "Pricing",
    q: "Is the free plan really free?",
    a: "Yes. No card needed. It covers checkout, receipts and stock for up to 50 products, which is enough to run a small stall or try Payspace properly before you upgrade.",
  },
  {
    category: "Pricing",
    q: "What does Pro cost?",
    a: `${PRO_PRICE_TEXT}, charged in US dollars, and it starts with a ${PRO_PRICE.trialDays}-day free trial. You pay per location, not per cashier, so adding part-time staff never raises your bill.`,
  },
  {
    category: "Pricing",
    q: "Do I lose my data if I switch plans?",
    a: "No. Your products, stock and sales history stay exactly where they are when you upgrade or go back to the free plan.",
  },
  {
    category: "Payments",
    q: "Which payment methods can I record?",
    a: "Cash, GCash, Maya and card, including split payments on one sale. E-wallet sales keep their reference number, and you can attach a photo of the payment screen. Card payments are recorded, not processed, so keep using your terminal.",
  },
  {
    category: "Payments",
    q: "Does it handle VAT?",
    a: "Yes. Prices include 12% VAT by default, and you can change the rate or turn VAT off per shop in Settings.",
  },
  {
    category: "Data",
    q: "Is my shop's data private?",
    a: "Yes. Every shop's data is kept separate, and access is checked on every request, not only when you sign in.",
  },
  {
    category: "Data",
    q: "Can I get my data out?",
    a: "Digital receipts can be shared by link today. CSV exports and a full backup download are coming soon for Pro shops.",
  },
];
