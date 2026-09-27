import type { CostExample } from "@/lib/costing-example";

// Copy for the industry landing pages at /pos/[industry]. Same rule as the home page: claim
// only what the app does today. Example prices are illustrative, in centavos.

export type Industry = {
  slug: string;
  /** "Coffee shops": card titles, nav and breadcrumbs. */
  name: string;
  /** Used in the <title>, the H1 and the share image. */
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  headline: string;
  intro: string;
  pains: { title: string; body: string }[];
  features: { title: string; body: string }[];
  exampleIntro: string;
  example: CostExample;
  exampleNote: string;
  faqs: { q: string; a: string }[];
  /** Blog post slugs to link to. */
  guides: string[];
};

const VAT = 1200;

export const INDUSTRIES: Industry[] = [
  {
    slug: "coffee-shop",
    name: "Coffee shops",
    metaTitle: "Coffee Shop POS System in the Philippines",
    metaDescription:
      "A coffee shop POS that shows the real profit on every drink. Recipe costing for espresso, milk and cups, add-ons that change price and recipe, GCash and Maya, and a live sales dashboard. Free to start.",
    keywords: ["coffee shop POS", "cafe POS system Philippines", "coffee shop POS system", "cafe inventory", "coffee drink costing"],
    headline: "The coffee shop POS that shows what every cup really makes",
    intro:
      "Milk prices move, oat milk costs more than fresh, and an extra shot adds beans as well as pesos. Payspace costs every drink from its recipe, so you see the profit on each latte, not just the sales total.",
    pains: [
      { title: "Margins you can only guess", body: "Most café POS apps show sales. Few show what a drink cost you to make, so a cheap-to-sell drink can quietly lose money." },
      { title: "Add-ons that change the cost", body: "An extra shot, oat milk or a larger cup changes both the price and the ingredients. Spreadsheets rarely keep up." },
      { title: "Running out mid-rush", body: "Finding out you're low on milk at 8 a.m. costs sales. Stock should warn you before the queue does." },
    ],
    features: [
      { title: "Recipe costing per drink", body: "Build each drink from beans, milk, syrups and cups in grams, millilitres and pieces. Costs update on their own when you receive stock at new prices." },
      { title: "Modifiers with recipes", body: "Options like extra shot, oat milk or large size carry both a price change and an ingredient change, so every variant is costed correctly." },
      { title: "Fast, touch-first checkout", body: "Big tiles for a tablet at the counter. Take cash, GCash, Maya or card, and split one bill across methods." },
      { title: "Best sellers by profit", body: "The dashboard ranks drinks by profit, not just by sales, and shows your busiest hours, updated live." },
      { title: "Low-stock and margin alerts", body: "Get a warning when beans or milk run low, and when a drink falls below your target margin." },
      { title: "Café template", body: "Start from a ready café menu or import your products from a spreadsheet, then adjust prices and recipes." },
    ],
    exampleIntro: "A 12 oz latte, costed the way Payspace does it: each ingredient at the price you paid, and margin on the price without VAT.",
    example: {
      product: "Latte, 12 oz",
      price: 14000,
      vatRateBps: VAT,
      lines: [
        { item: "Espresso beans", use: 18, unit: "g", buyPrice: 120000, buySize: 1000, buyLabel: "1 kg bag" },
        { item: "Fresh milk", use: 200, unit: "ml", buyPrice: 9500, buySize: 1000, buyLabel: "1 L" },
        { item: "Cup and lid", use: 1, unit: "pc", buyPrice: 65000, buySize: 100, buyLabel: "100 pcs" },
      ],
    },
    exampleNote: "Swap fresh milk for oat milk and the cost changes with it. In Payspace, the oat milk option carries its own recipe change.",
    faqs: [
      { q: "Can Payspace handle drink sizes and add-ons?", a: "Yes. Sizes and add-ons are modifier options. Each option can change the price and the recipe, so a large oat latte uses more milk and the right kind, and its cost is worked out correctly." },
      { q: "Does it work on an iPad or Android tablet?", a: "Yes. Payspace runs in the browser on any tablet, phone or laptop, so there's nothing to install. USB barcode scanners and 58 mm or 80 mm thermal printers work through the browser." },
      { q: "Is recipe costing on the free plan?", a: "Recipe costing and profit per item are part of Pro, at $5 a month per shop. The free plan covers checkout, receipts and stock for up to 50 products." },
    ],
    guides: ["how-to-compute-food-cost-per-drink", "markup-vs-margin-pricing", "gcash-maya-payments-end-of-day"],
  },
  {
    slug: "milk-tea-shop",
    name: "Milk tea shops",
    metaTitle: "Milk Tea Shop POS System in the Philippines",
    metaDescription:
      "A POS for milk tea shops: cost every cup from tea, creamer, syrup, pearls and packaging, handle sizes and sinkers as add-ons, and take GCash and Maya. See the profit per cup. Free to start.",
    keywords: ["milk tea POS", "milk tea shop POS system", "milk tea costing", "milk tea business Philippines", "bubble tea POS"],
    headline: "A milk tea POS that knows what every cup costs you",
    intro:
      "Pearls, creamer, syrup, cups and sealing film all add up, and sinkers change the cost of every order. Payspace works out the cost of each cup and warns you when a flavour stops paying its way.",
    pains: [
      { title: "Many small costs per cup", body: "Tea, creamer, syrup, pearls, cup, film and straw: miss one and your margin looks better than it is." },
      { title: "Sizes and sinkers", body: "Medium and large, extra pearls, nata or cream cheese: each option changes the price and the ingredients." },
      { title: "Supplier price hikes", body: "When creamer or pearls go up, which flavours are still worth selling at the old price?" },
    ],
    features: [
      { title: "Cost per cup from the recipe", body: "Record grams and millilitres for every ingredient and packaging item. Receive new stock at a new price and every cup's cost updates." },
      { title: "Sizes and sinkers as options", body: "Each size or add-on can change both the price and the recipe, so a large with extra pearls is costed correctly." },
      { title: "Margin alerts", body: "Set a target margin and Payspace flags any flavour that drops below it after a price change." },
      { title: "GCash and Maya with reference numbers", body: "Record the reference number with every e-wallet sale, and attach a photo of the payment screen if you like." },
      { title: "Stock ledger", body: "Every sale, delivery, spoilage and count is recorded, so you can see where your pearls and creamer went." },
      { title: "Live dashboard", body: "Sales, profit, best sellers by profit and busy hours, updated as orders come in." },
    ],
    exampleIntro: "A large classic milk tea with pearls. Packaging is part of the cost, so it's in the recipe too.",
    example: {
      product: "Classic milk tea with pearls, large",
      price: 11200,
      vatRateBps: VAT,
      lines: [
        { item: "Black tea leaves", use: 8, unit: "g", buyPrice: 60000, buySize: 1000, buyLabel: "1 kg" },
        { item: "Non-dairy creamer", use: 30, unit: "g", buyPrice: 18000, buySize: 1000, buyLabel: "1 kg" },
        { item: "Fructose syrup", use: 30, unit: "ml", buyPrice: 11000, buySize: 1000, buyLabel: "1 L" },
        { item: "Tapioca pearls", use: 50, unit: "g", buyPrice: 14000, buySize: 1000, buyLabel: "1 kg" },
        { item: "Cup, film and straw", use: 1, unit: "pc", buyPrice: 85000, buySize: 100, buyLabel: "100 sets" },
      ],
    },
    exampleNote: "If your shop isn't VAT-registered, turn VAT off in Settings and the margin is worked out on the full price.",
    faqs: [
      { q: "Can I set sugar levels without changing the price?", a: "Yes. A modifier option can have no price change, so sugar and ice levels are recorded on the order without changing the total." },
      { q: "Can customers pay with GCash or Maya?", a: "Yes. Record GCash, Maya, cash or card, split one order across methods, and keep the e-wallet reference number with the sale. Card payments are recorded, not processed." },
      { q: "How much does it cost?", a: "The free plan covers checkout, receipts and stock for up to 50 products. Pro, with recipe costing and margin alerts, is $5 a month per shop, not per cashier." },
    ],
    guides: ["how-to-compute-food-cost-per-drink", "markup-vs-margin-pricing", "gcash-maya-payments-end-of-day"],
  },
  {
    slug: "bakery",
    name: "Bakeries",
    metaTitle: "Bakery POS System in the Philippines",
    metaDescription:
      "A bakery POS with recipe costing per piece: flour, butter, eggs and packaging costed from your latest deliveries. Track waste and day-old stock, and see the profit on every pastry. Free to start.",
    keywords: ["bakery POS", "bakery POS system Philippines", "bakeshop POS", "bakery costing", "bakery inventory"],
    headline: "The bakery POS that costs every piece from its recipe",
    intro:
      "Flour, butter and egg prices change with every delivery. Payspace keeps a running average cost for each ingredient, so the cost of every ensaymada and loaf stays current, and you can see which ones are worth baking.",
    pains: [
      { title: "Ingredient prices that keep moving", body: "Butter and eggs cost more this month than last. Your prices may not have caught up." },
      { title: "Waste you never see", body: "Unsold and day-old bread is a real cost. If it isn't recorded, it looks like the stock simply disappeared." },
      { title: "Batch recipes, per-piece sales", body: "You bake by the batch but sell by the piece, so the cost per piece takes a bit of maths." },
    ],
    features: [
      { title: "Per-piece recipe costing", body: "Enter what one piece uses. Payspace keeps the cost current as you receive ingredients at new prices, using a weighted average." },
      { title: "Waste and spoilage", body: "Record unsold, damaged or expired items as waste, so the stock ledger explains every missing piece." },
      { title: "Margin flags", body: "Any product that falls below your target margin is flagged on the dashboard, so you know what to reprice." },
      { title: "Bakery template", body: "Start from a ready bakery catalog, or import your products from a spreadsheet." },
      { title: "Quick counter checkout", body: "Big tiles for your best sellers, search for the rest, and cash, GCash, Maya or card." },
      { title: "Receipts your way", body: "Print on 58 mm or 80 mm thermal paper, or share a digital receipt link." },
    ],
    exampleIntro: "One cheese ensaymada. Divide your batch recipe by the number of pieces it makes, then cost each ingredient.",
    example: {
      product: "Cheese ensaymada, 1 piece",
      price: 4500,
      vatRateBps: VAT,
      lines: [
        { item: "Bread flour", use: 40, unit: "g", buyPrice: 130000, buySize: 25000, buyLabel: "25 kg sack" },
        { item: "Butter", use: 12, unit: "g", buyPrice: 56000, buySize: 1000, buyLabel: "1 kg" },
        { item: "Sugar", use: 10, unit: "g", buyPrice: 8000, buySize: 1000, buyLabel: "1 kg" },
        { item: "Egg", use: 0.25, unit: "pc", buyPrice: 27000, buySize: 30, buyLabel: "tray of 30" },
        { item: "Grated cheese", use: 8, unit: "g", buyPrice: 42000, buySize: 1000, buyLabel: "1 kg" },
        { item: "Paper wrapper", use: 1, unit: "pc", buyPrice: 12000, buySize: 100, buyLabel: "100 pcs" },
      ],
    },
    exampleNote: "At a 60% target margin, this ensaymada would be flagged. A ₱48 price, or a little less butter, brings it back above target.",
    faqs: [
      { q: "Can I record day-old or unsold bread?", a: "Yes. Record it as waste. It comes off your stock through the ledger, so your on-hand numbers stay right and you can see how much you throw away." },
      { q: "How do I cost a batch recipe per piece?", a: "Divide each ingredient in the batch by the number of pieces it makes, and enter those per-piece amounts as the recipe. Our batch costing guide walks through it." },
      { q: "Do I need special hardware?", a: "No. Any tablet, phone or laptop with a modern browser works. USB barcode scanners and thermal receipt printers work through the browser." },
    ],
    guides: ["bakery-batch-costing-per-piece", "markup-vs-margin-pricing", "vat-inclusive-pricing-philippines"],
  },
  {
    slug: "sari-sari-store",
    name: "Sari-sari stores",
    metaTitle: "Sari-Sari Store POS and Inventory App",
    metaDescription:
      "A simple POS for sari-sari stores that runs on your phone or tablet. Track stock as it sells, see the profit on each product, record GCash and Maya payments, and get low-stock alerts. Free to start.",
    keywords: ["sari-sari store POS", "sari-sari store inventory app", "sari-sari store system", "POS app Philippines", "tindahan inventory"],
    headline: "A sari-sari store POS that runs on the phone you already have",
    intro:
      "Know what's selling, what's running low and what you actually earn on each item. Payspace works in the browser on a phone or tablet, with nothing to install.",
    pains: [
      { title: "Stock that disappears", body: "Without a record, it's hard to tell whether an item sold, spoiled or went missing." },
      { title: "Thin margins per item", body: "When you earn a few pesos per piece, a small price increase from your supplier can wipe out the profit." },
      { title: "Paper notebooks", body: "Writing every sale down takes time, and the notebook can't tell you what to reorder." },
    ],
    features: [
      { title: "Works on a phone", body: "Runs in the browser on any phone, tablet or laptop. Add it to your home screen like an app." },
      { title: "Stock that counts itself", body: "Every sale takes the item off your stock. Record deliveries, spoilage and counts, and low-stock items are flagged." },
      { title: "Profit per product", body: "Record what you paid for each case, and Payspace works out the cost and margin of every piece." },
      { title: "GCash and Maya", body: "Record e-wallet payments with their reference number, and split one sale across cash and GCash." },
      { title: "Barcode scanning", body: "Plug in a USB barcode scanner and ring up packaged goods quickly." },
      { title: "VAT on or off", body: "Most small stores aren't VAT-registered. Switch VAT off in Settings and prices and receipts follow." },
    ],
    exampleIntro: "A packaged product is a one-line recipe: the cost is what you paid for the case, divided by the pieces in it.",
    example: {
      product: "Instant noodles, 1 pack",
      price: 1400,
      vatRateBps: 0,
      lines: [{ item: "Instant noodles", use: 1, unit: "pc", buyPrice: 72000, buySize: 72, buyLabel: "case of 72" }],
    },
    exampleNote: "This example has VAT switched off. If your supplier's case price goes up, the cost per pack and the margin update when you record the delivery.",
    faqs: [
      { q: "Is Payspace free for a sari-sari store?", a: "The free plan covers checkout, receipts and stock for up to 50 products, with no card needed. Pro, with unlimited products and margin alerts, is $5 a month per store." },
      { q: "Can I use it on my phone?", a: "Yes. Payspace runs in the browser on Android and iPhone, as well as tablets and laptops. You can add it to your home screen." },
      { q: "Can I add my products from a list?", a: "Yes. Import products from a spreadsheet (CSV), with a preview that shows any rows that need fixing before anything is saved." },
    ],
    guides: ["sari-sari-store-inventory-count", "gcash-maya-payments-end-of-day", "markup-vs-margin-pricing"],
  },
  {
    slug: "grocery",
    name: "Groceries and mini-marts",
    metaTitle: "Grocery and Mini-Mart POS System in the Philippines",
    metaDescription:
      "A grocery POS with barcode scanning, a stock ledger, weighted average costs and profit per product. Import your catalog from a spreadsheet and take cash, GCash, Maya and card. Free to start.",
    keywords: ["grocery POS system", "mini mart POS Philippines", "grocery inventory system", "supermarket POS", "barcode POS"],
    headline: "A grocery POS that keeps stock and margins honest",
    intro:
      "Hundreds of products, thin margins and supplier prices that change every delivery. Payspace scans barcodes, keeps every stock movement in a ledger and shows the margin on each product.",
    pains: [
      { title: "Hundreds of products to track", body: "Keeping stock right across a whole store is hard without a record of every movement." },
      { title: "Costs that change per delivery", body: "The same item can arrive at a different price every week. Which cost do you use for your margin?" },
      { title: "Slow checkout lines", body: "Typing in prices by hand slows the queue and invites mistakes." },
    ],
    features: [
      { title: "Barcode scanning", body: "USB barcode scanners work out of the box, and each barcode is unique in your shop." },
      { title: "Weighted average cost", body: "Every delivery updates the product's average cost, so margins reflect what you really paid." },
      { title: "Stock ledger and counts", body: "Sales, deliveries, adjustments, waste and stock counts are all recorded. On-hand numbers always add up." },
      { title: "Spreadsheet import", body: "Bring in your catalog from a CSV file, with a preview and per-row errors before anything is saved." },
      { title: "Split payments", body: "Cash, GCash, Maya and card on one sale, with e-wallet reference numbers kept." },
      { title: "Grocery template", body: "Start from a ready grocery catalog and edit it to match your shelves." },
    ],
    exampleIntro: "Grocery margins are thin, so a small change in the case price matters. Here's one product, costed from its case.",
    example: {
      product: "Dishwashing liquid, 500 ml",
      price: 7900,
      vatRateBps: VAT,
      lines: [{ item: "Dishwashing liquid, 500 ml", use: 1, unit: "pc", buyPrice: 144000, buySize: 24, buyLabel: "case of 24" }],
    },
    exampleNote: "If the next case arrives at a higher price, Payspace blends it into the average cost, and the margin updates on its own.",
    faqs: [
      { q: "Do barcode scanners work?", a: "Yes. USB barcode scanners work out of the box in the browser. Each product can have its own barcode, unique within your shop." },
      { q: "How many products can I have?", a: "Up to 50 on the free plan and unlimited on Pro, which is $5 a month per shop." },
      { q: "Can I do a stock count?", a: "Yes. Count what's on the shelf and Payspace records the difference in the stock ledger, so you can see what went missing." },
    ],
    guides: ["sari-sari-store-inventory-count", "vat-inclusive-pricing-philippines", "markup-vs-margin-pricing"],
  },
];

export function getIndustry(slug: string) {
  return INDUSTRIES.find((i) => i.slug === slug);
}
