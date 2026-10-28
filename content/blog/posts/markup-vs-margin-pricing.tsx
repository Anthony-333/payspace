import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import type { BlogPost } from "../types";

const TABLE: [margin: string, markup: string][] = [
  ["25%", "33.3%"],
  ["30%", "42.9%"],
  ["40%", "66.7%"],
  ["50%", "100%"],
  ["60%", "150%"],
  ["65%", "185.7%"],
  ["70%", "233.3%"],
  ["75%", "300%"],
];

function Body() {
  return (
    <>
      <p>
        &ldquo;I add 60% to my cost&rdquo; and &ldquo;I make 60% on everything&rdquo; sound like the same thing.
        They&rsquo;re not, and mixing them up is one of the most common reasons small shops earn less than they think.
      </p>

      <h2 id="definitions">Markup and margin in one minute</h2>
      <ul>
        <li>
          <strong>Markup</strong> is profit as a share of <em>cost</em>: profit ÷ cost.
        </li>
        <li>
          <strong>Margin</strong> is profit as a share of the <em>price</em>: profit ÷ price.
        </li>
      </ul>
      <p>
        A pastry that costs $1.60 and sells for $4.00 makes $2.40. That&rsquo;s a <strong>150% markup</strong> (2.40 ÷ 1.60) and
        a <strong>60% margin</strong> (2.40 ÷ 4.00). Same pastry, same profit, two very different-looking numbers.
      </p>

      <h2 id="trap">The trap: adding a percentage to cost</h2>
      <p>
        If that $1.60 pastry is priced by &ldquo;adding 60%&rdquo;, it sells for $2.56. The profit is $0.96, which is a{" "}
        <strong>37.5% margin</strong>, not 60%. Rent, wages and electricity are paid out of margin, so the difference
        matters.
      </p>

      <h2 id="table">Margin to markup conversion table</h2>
      <table>
        <thead>
          <tr>
            <th>If you want this margin</th>
            <th>you need this markup</th>
          </tr>
        </thead>
        <tbody>
          {TABLE.map(([margin, markup]) => (
            <tr key={margin}>
              <td>{margin}</td>
              <td>{markup}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        The formulas: markup = margin ÷ (1 − margin), and margin = markup ÷ (1 + markup).
      </p>

      <h2 id="price-from-margin">How to set a price from a target margin</h2>
      <p>
        Start from the margin you want and work backwards: <strong>price = cost ÷ (1 − target margin)</strong>.
      </p>
      <p>
        Say a latte costs $1.19 to make (see <Link href="/blog/how-to-compute-food-cost-per-drink">how we got that</Link>)
        and you want a 65% margin:
      </p>
      <ol>
        <li>$1.19 ÷ (1 − 0.65) = $1.19 ÷ 0.35 = <strong>$3.40</strong> before tax.</li>
        <li>If your prices include a 10% tax, multiply by 1.10: $3.40 × 1.10 = <strong>$3.74</strong>.</li>
        <li>Round to a menu price. At $3.75 the margin is 65.1%; at $4.00 it&rsquo;s 67.3%.</li>
      </ol>
      <Callout title="Always add tax last">
        <p>
          Work out the price you need to keep, then add tax on top. If you set a tax-inclusive price by eye and compute the
          margin on it, you&rsquo;re counting the government&rsquo;s share as your profit. See{" "}
          <Link href="/blog/tax-inclusive-pricing">how to take tax out of a price</Link>.
        </p>
      </Callout>

      <h2 id="which-margin">What margin should you target?</h2>
      <p>
        It depends on what you sell. Made-to-order drinks and baked goods usually carry higher margins, because the price
        also pays for the time and skill to make them. Resold packaged goods, like the stock in a convenience store or a
        grocery, usually carry much thinner margins and make up for it in volume. Pick a target for each kind of product,
        then check which items fall short.
      </p>

      <h2 id="checklist">A quick pricing checklist</h2>
      <ul>
        <li>Cost every item from its ingredients, including packaging.</li>
        <li>Set a target margin, not a markup.</li>
        <li>Price = cost ÷ (1 − margin), then add sales tax, VAT or GST if you charge it.</li>
        <li>Round to a clean menu price, and check the margin you ended up with.</li>
        <li>Re-check whenever a supplier raises prices.</li>
      </ul>

      <TryPayspace>
        <p>
          Payspace shows every product&rsquo;s margin on the price without tax, recomputes it when ingredient costs change,
          and flags anything below the target margin you set. No spreadsheet to keep up to date.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "markup-vs-margin-pricing",
  title: "Markup vs margin: formula and examples",
  description:
    "Markup vs margin explained: the difference, a conversion table, and a simple formula to price any item from a target margin, with sales tax and VAT done right.",
  category: "Costing and pricing",
  keywords: ["markup vs margin", "how to price products", "pricing formula", "profit margin calculator", "menu pricing"],
  published: "2026-09-27",
  updated: "2026-10-27",
  readingMinutes: 4,
  industries: ["coffee-shop", "bakery", "milk-tea-shop"],
  faqs: [
    {
      q: "What is the difference between markup and margin?",
      a: "Markup is profit divided by cost; margin is profit divided by price. An item that costs $1.60 and sells for $4.00 has a 150% markup and a 60% margin.",
    },
    {
      q: "How do I compute a selling price from a target margin?",
      a: "Divide the cost by (1 − target margin). For a $1.19 cost and a 65% margin: 1.19 ÷ 0.35 = $3.40. If your prices include a 10% tax, multiply by 1.10 afterwards.",
    },
  ],
  Body,
};

export default post;
