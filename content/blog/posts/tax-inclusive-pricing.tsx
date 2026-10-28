import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import type { BlogPost } from "../types";

const EXAMPLES: [price: string, net: string, tax: string][] = [
  ["$4.50", "$4.09", "$0.41"],
  ["$5.50", "$5.00", "$0.50"],
  ["$11.00", "$10.00", "$1.00"],
  ["$100.00", "$90.91", "$9.09"],
];

function Body() {
  return (
    <>
      <p>
        In many countries, shops show prices with VAT or GST already included. That&rsquo;s simpler for customers, but
        it means you have to take the tax back out to know your real sales and margins. Here&rsquo;s how, and the
        mistake that gets it wrong. The examples use a 10% rate; swap in your own.
      </p>

      <h2 id="formula">The formula</h2>
      <p>For a price that already includes a tax rate of <em>r</em>% (10% in these examples):</p>
      <ul>
        <li>
          <strong>Price without tax</strong> = price ÷ (1 + r/100), so price ÷ 1.10 at 10%
        </li>
        <li>
          <strong>Tax</strong> = price × r ÷ (100 + r), so price × 10 ÷ 110 at 10% (the same as price − price
          without tax)
        </li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>Price with tax</th>
            <th>Without tax</th>
            <th>Tax (10%)</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map(([price, net, tax]) => (
            <tr key={price}>
              <td>{price}</td>
              <td>{net}</td>
              <td>{tax}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="mistake">The common mistake: 10% of the price</h2>
      <p>
        10% of $5.50 is $0.55, but the tax inside a $5.50 price is only <strong>$0.50</strong>. Taking 10% of the
        tax-inclusive price treats the tax as if it were added on top of $5.50. Use 10 ÷ 110 instead. At a 20% rate the
        tax inside a price is 20 ÷ 120, or one sixth, not one fifth.
      </p>
      <p>
        Going the other way is simple: to add tax to a price that doesn&rsquo;t include it, multiply by 1 + r/100. At
        10%, $10.00 becomes $11.00.
      </p>

      <h2 id="added">When tax is added at the register</h2>
      <p>
        In some places, such as most of the United States, shelf prices don&rsquo;t include sales tax and it&rsquo;s
        added at checkout instead. Then there&rsquo;s nothing to take out: your price is already the price without
        tax, and the tax on top goes to the government.
      </p>

      <h2 id="rounding">Round once per receipt, not per item</h2>
      <p>
        Three items at $1.50 each: taking the tax out of each one gives $0.14 × 3 = $0.42. Taking it out of the $4.50
        total gives $0.41. The one-cent difference is rounding. Compute tax on the receipt total and round once, so the
        numbers on the receipt always add up.
      </p>

      <h2 id="margin">Why it matters for your margins</h2>
      <p>
        The tax you collect isn&rsquo;t yours; it&rsquo;s paid to your tax authority. If you compute margins on the
        tax-inclusive price, every item looks more profitable than it is. Always compute cost and margin against the
        price without tax. Our <Link href="/blog/markup-vs-margin-pricing">pricing guide</Link> shows how to build a
        tax-inclusive price from a target margin.
      </p>

      <h2 id="who">Who charges tax, and at what rate?</h2>
      <p>
        That depends on where you sell. Rates differ from country to country, and sometimes by region or by product,
        and many places only require small businesses to register once their sales pass a threshold. Some goods, and
        some customers, follow special rules or discounts.
      </p>
      <Callout title="Check with your accountant">
        <p>
          This guide explains the arithmetic, not your tax obligations. Tax rules change, and your situation may differ.
          Confirm your registration, rates and invoicing requirements with a licensed accountant or your local tax
          authority.
        </p>
      </Callout>

      <TryPayspace>
        <p>
          In Payspace you set your tax rate once, choose whether prices include it, or switch tax off if you don&rsquo;t
          charge it. Tax is worked out on each order total, and every margin is computed on the price without tax.
          Payspace receipts are records of the sale, not certified tax invoices, so keep issuing any invoices your local
          rules require.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "tax-inclusive-pricing",
  title: "How to take VAT or GST out of a tax-inclusive price",
  description:
    "How to work out the tax inside a VAT- or GST-inclusive price: the formula for any rate, a quick reference table, and the common mistake that overstates tax.",
  category: "Tax",
  keywords: ["tax inclusive price formula", "how to calculate VAT from gross", "GST inclusive calculation", "price without VAT", "sales tax for small business"],
  published: "2026-09-27",
  updated: "2026-10-27",
  readingMinutes: 4,
  industries: ["grocery", "bakery", "coffee-shop"],
  faqs: [
    {
      q: "How do I work out the tax inside a price?",
      a: "Multiply the tax-inclusive price by the rate and divide by 100 plus the rate. At 10%, the tax inside $5.50 is 5.50 × 10 ÷ 110 = $0.50, and the price without tax is $5.00.",
    },
    {
      q: "Why isn't the tax 10% of the price?",
      a: "Because the 10% is charged on the price without tax. When tax is already included, it is 10/110 of the total, about 9.09%, not 10%.",
    },
  ],
  Body,
};

export default post;
