// Public facts about the site, shared by metadata, robots, sitemap, JSON-LD and llms.txt.
// NEXT_PUBLIC_SITE_URL is localhost in development. The Vercel production build always uses the
// real domain, so a stray env value can never leak localhost or a preview URL into canonicals,
// robots.txt or the sitemap.
const PRODUCTION_URL = "https://www.payspace.shop";
const isVercelProduction = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV) === "production";
export const SITE_URL = (isVercelProduction ? PRODUCTION_URL : (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_URL)).replace(/\/$/, "");

export const SITE_NAME = "Payspace POS";

export const SUPPORT_EMAIL = "support@payspace.shop";

export const SITE_TITLE = "Payspace POS: point of sale with real profit per item";

export const SITE_DESCRIPTION =
  "Free POS system for coffee shops, bakeries, milk tea stands, groceries and sari-sari stores in the Philippines. Recipe costing shows the profit on every item, with stock tracking, a record of every cash, GCash and Maya sale, VAT and receipts. Runs in the browser.";

export const SITE_KEYWORDS = [
  "POS system Philippines",
  "point of sale system",
  "free POS system",
  "cloud POS",
  "web POS",
  "POS for small business",
  "coffee shop POS",
  "cafe POS system",
  "bakery POS",
  "milk tea shop POS",
  "sari-sari store POS",
  "grocery POS system",
  "retail POS",
  "restaurant POS",
  "tablet POS",
  "POS with inventory",
  "inventory management",
  "stock tracking",
  "recipe costing",
  "food cost calculator",
  "profit per item",
  "profit margin tracking",
  "GCash POS",
  "Maya POS",
  "split bill tracking",
  "VAT receipts",
  "thermal receipt printing",
  "sales dashboard",
];
