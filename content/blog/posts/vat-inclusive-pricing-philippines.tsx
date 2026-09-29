import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import type { BlogPost } from "../types";

const EXAMPLES: [price: string, net: string, vat: string][] = [
  ["₱45.00", "₱40.18", "₱4.82"],
  ["₱112.00", "₱100.00", "₱12.00"],
  ["₱140.00", "₱125.00", "₱15.00"],
  ["₱1,000.00", "₱892.86", "₱107.14"],
];

function Body() {
  return (
    <>
      <p>
        In the Philippines, most shops show prices with VAT already included. That&rsquo;s simpler for customers, but it
        means you have to take the VAT back out to know your real sales and margins. Here&rsquo;s how, and the mistake
        that gets it wrong.
      </p>

      <h2 id="formula">The formula</h2>
      <p>For a price that already includes 12% VAT:</p>
      <ul>
        <li>
          <strong>Price without VAT</strong> = price ÷ 1.12
        </li>
        <li>
          <strong>VAT</strong> = price × 12 ÷ 112 (the same as price − price without VAT)
        </li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>Price with VAT</th>
            <th>Without VAT</th>
            <th>VAT (12%)</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map(([price, net, vat]) => (
            <tr key={price}>
              <td>{price}</td>
              <td>{net}</td>
              <td>{vat}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="mistake">The common mistake: 12% of the price</h2>
      <p>
        12% of ₱140 is ₱16.80, but the VAT inside a ₱140 price is only <strong>₱15.00</strong>. Taking 12% of the
        VAT-inclusive price treats the VAT as if it were added on top of ₱140. Use 12 ÷ 112 instead.
      </p>
      <p>
        Going the other way is simple: to add VAT to a price that doesn&rsquo;t include it, multiply by 1.12. ₱100 becomes
        ₱112.
      </p>

      <h2 id="rounding">Round once per receipt, not per item</h2>
      <p>
        Three items at ₱15 each: taking the VAT out of each one gives ₱1.61 × 3 = ₱4.83. Taking it out of the ₱45 total
        gives ₱4.82. The one-centavo difference is rounding. Compute VAT on the receipt total and round once, so the
        numbers on the receipt always add up.
      </p>

      <h2 id="margin">Why it matters for your margins</h2>
      <p>
        The VAT you collect isn&rsquo;t yours; it&rsquo;s paid to the BIR. If you compute margins on the VAT-inclusive
        price, every item looks more profitable than it is. Always compute cost and margin against the price without
        VAT. Our <Link href="/blog/markup-vs-margin-pricing">pricing guide</Link> shows how to build a VAT-inclusive price
        from a target margin.
      </p>

      <h2 id="who">Who charges VAT?</h2>
      <p>
        Only VAT-registered businesses charge VAT. Under the current rules, a business must register for VAT once its
        gross sales go over <strong>₱3,000,000 in any 12-month period</strong>, and smaller businesses can choose to
        register. Businesses that aren&rsquo;t VAT-registered generally pay percentage tax instead and shouldn&rsquo;t
        show VAT on their receipts. Some goods, and sales to senior citizens and persons with disabilities, follow
        special VAT and discount rules.
      </p>
      <Callout title="Check with your accountant">
        <p>
          This guide explains the arithmetic, not your tax obligations. Tax rules change, and your situation may differ.
          Confirm your registration, rates and invoicing requirements with a licensed accountant or the BIR.
        </p>
      </Callout>

      <TryPayspace>
        <p>
          In Payspace you set your VAT rate once, choose whether prices include it, or switch VAT off if you aren&rsquo;t
          registered. VAT is worked out on each order total, and every margin is computed on the price without VAT.
          Payspace receipts are records of the sale, not BIR-registered invoices, so keep issuing the invoices the law
          requires.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "vat-inclusive-pricing-philippines",
  title: "How to compute 12% VAT in the Philippines",
  description:
    "How to compute 12% VAT from a VAT-inclusive price in the Philippines: the formula, a quick reference table, and the common mistake that overstates VAT.",
  category: "Tax",
  keywords: ["how to compute VAT Philippines", "VAT inclusive formula", "12% VAT computation", "VAT exclusive price", "VAT for small business Philippines"],
  published: "2026-09-27",
  readingMinutes: 4,
  industries: ["grocery", "bakery", "coffee-shop"],
  faqs: [
    {
      q: "How do I compute the VAT inside a price in the Philippines?",
      a: "Multiply the VAT-inclusive price by 12 and divide by 112. For ₱140, the VAT is ₱15.00 and the price without VAT is ₱125.00.",
    },
    {
      q: "Why isn't the VAT 12% of the price?",
      a: "Because 12% is charged on the price without VAT. When VAT is already included, it is 12/112 of the total, about 10.71%, not 12%.",
    },
  ],
  Body,
};

export default post;
