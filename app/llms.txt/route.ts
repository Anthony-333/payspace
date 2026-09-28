import { FAQ, PLAN_ROWS, PRO_PRICE } from "@/components/marketing/content";
import { POSTS } from "@/content/blog";
import { INDUSTRIES } from "@/content/industries";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

// /llms.txt (llmstxt.org): a plain Markdown summary that AI assistants and answer engines
// read instead of parsing the landing page. Built from the landing page copy.
export const dynamic = "force-static";

function cell(v: string | boolean) {
  return v === true ? "Yes" : v === false ? "No" : v;
}

export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a web-based point of sale (POS) system for small businesses in the Philippines: coffee shops, milk tea stands, bakeries, groceries, sari-sari stores and small retail. Its main difference from other POS systems is true profit per item: products can have recipes in grams, millilitres or pieces, ingredient costs are tracked with a weighted average as stock is received, and every item's cost and margin update on their own.

## Key features

- Profit per item: recipe costing from ingredients, with items below the target margin flagged.
- Touch-first checkout for tablets and phones, USB barcode scanners, and search.
- Payments: cash, GCash, Maya and card, including split payments. E-wallet sales keep their reference number and an optional photo. Card payments are recorded, not processed.
- VAT: prices include 12% VAT by default; the rate can be changed or turned off per shop.
- Receipts: print on 58 mm or 80 mm thermal printers, or share a digital receipt link.
- Stock: every sale, delivery, spoilage and count is written to a stock ledger; low-stock alerts.
- Dashboard: sales, profit and margin compared with the same day last week, best sellers by profit, busy hours and payment mix, updated live.
- Runs in the browser on any tablet, phone or laptop. Nothing to install.
- Each shop's data is kept separate, and access is checked on every request.

## Pricing

- Free: $0, no card needed.
- Pro: US${PRO_PRICE.usd} (about ₱${PRO_PRICE.phpApprox}) per shop per month, with a ${PRO_PRICE.trialDays}-day free trial. Billed per location, not per cashier.

| Feature | Free | Pro |
| --- | --- | --- |
${PLAN_ROWS.map((r) => `| ${r.label} | ${cell(r.free)} | ${cell(r.pro)} |`).join("\n")}

## FAQ

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Payspace by type of business

${INDUSTRIES.map((i) => `- [${i.metaTitle}](${SITE_URL}/pos/${i.slug}): ${i.intro}`).join("\n")}

## Guides

${POSTS.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`).join("\n")}

## Links

- [Home](${SITE_URL}/): product overview, features and pricing
- [Blog](${SITE_URL}/blog)
- [Create a free account](${SITE_URL}/sign-up)
- [Sign in](${SITE_URL}/sign-in)

## Contact

Support: ${SUPPORT_EMAIL}
`;
  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
