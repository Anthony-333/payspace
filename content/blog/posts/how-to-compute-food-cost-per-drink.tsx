import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import { CostTable } from "@/components/marketing/cost-table";
import { getIndustry } from "@/content/industries";
import type { BlogPost } from "../types";

const latte = getIndustry("coffee-shop")!.example;

function Body() {
  return (
    <>
      <p>
        Your sales report tells you how much came in. It doesn&rsquo;t tell you how much of that you kept. To know that,
        you need the <strong>food cost of each drink</strong>: what the beans, milk, syrup and cup inside it cost you. It
        takes about ten minutes per drink the first time, and it changes how you price your menu.
      </p>

      <h2 id="step-1">Step 1: List everything that goes into one drink</h2>
      <p>
        Write down every ingredient in one serving, in the units you measure it in: grams for beans and powders,
        millilitres for milk and syrups, pieces for cups, lids and straws. Include the packaging. A cup, lid and sleeve
        can cost as much as the milk.
      </p>

      <h2 id="step-2">Step 2: Work out the cost per gram, millilitre or piece</h2>
      <p>Divide what you paid by how much you got:</p>
      <ul>
        <li>Beans: $30 for 1,000 g = $0.03 per gram</li>
        <li>Fresh milk: $2.00 for 1,000 ml = $0.002 per millilitre</li>
        <li>Cups and lids: $25 for 100 = $0.25 each</li>
      </ul>
      <p>Use the price you actually paid, including delivery if your supplier charges for it.</p>

      <h2 id="step-3">Step 3: Multiply by how much one drink uses</h2>
      <p>
        18 g of beans at $0.03 is $0.54. 200 ml of milk at $0.002 is $0.40. Add the cup and lid, and you have the cost
        of one latte.
      </p>

      <h2 id="example">Worked example: a 12 oz latte</h2>
      <CostTable example={latte} />
      <p>
        The latte costs <strong>$1.19</strong> to make and sells for $4.50. But if your prices include a 10% sales tax,
        VAT or GST, $0.41 of that belongs to the government, not to you. Work out your margin on the price{" "}
        <em>without</em> tax: $4.09. That leaves $2.90 profit, a gross margin of 70.9%, so the ingredients take 29.1% of
        what you keep.
      </p>
      <Callout title="Food cost % vs margin">
        <p>
          <strong>Food cost %</strong> = cost ÷ price without tax. <strong>Gross margin</strong> = 100% − food cost %.
          They&rsquo;re two views of the same number. Our{" "}
          <Link href="/blog/markup-vs-margin-pricing">guide to markup and margin</Link> shows how to turn a target
          margin into a price.
        </p>
      </Callout>

      <h2 id="target">What food cost should you aim for?</h2>
      <p>
        There&rsquo;s no single right number. Many cafés aim for drink costs of roughly a quarter to a third of the
        price, because the rest has to pay for rent, wages, electricity and your own salary. Compare drinks against each
        other: if most of your menu sits near 30% and one drink is at 50%, that one needs a new price or a new recipe.
      </p>

      <h2 id="keep-current">Keep the numbers current</h2>
      <p>
        Ingredient prices change. If you have 2 kg of beans that cost $28 a kilo and receive 3 kg more at $32, your beans
        now cost an average of <strong>$30.40 a kilo</strong> ((2 × 28 + 3 × 32) ÷ 5). That&rsquo;s called a{" "}
        <strong>weighted average cost</strong>, and it&rsquo;s the fairest price to use for the next drinks you sell.
        Redo the sum whenever a delivery comes in at a new price, or let your POS do it.
      </p>

      <h2 id="mistakes">Common mistakes</h2>
      <ul>
        <li>
          <strong>Forgetting packaging.</strong> Cups, lids, straws, sleeves and bags are part of every takeaway order.
        </li>
        <li>
          <strong>Computing margin on the tax-inclusive price.</strong> It counts the tax as if you kept it, so the latte
          above would show a 73.6% margin instead of 70.9%. See <Link href="/blog/tax-inclusive-pricing">how to take the tax out of a price</Link>.
        </li>
        <li>
          <strong>Forgetting add-ons.</strong> An extra shot or oat milk changes the cost. Cost each option as well as the
          base drink.
        </li>
        <li>
          <strong>Never updating.</strong> A recipe costed last year is probably wrong today.
        </li>
      </ul>

      <TryPayspace>
        <p>
          In Payspace you enter each drink&rsquo;s recipe once. Every delivery updates the weighted average cost of its
          ingredients, every drink&rsquo;s cost and margin update with it, and anything below your target margin is
          flagged. Add-ons like an extra shot carry their own recipe change. See{" "}
          <Link href="/pos/coffee-shop">Payspace for coffee shops</Link>.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "how-to-compute-food-cost-per-drink",
  title: "How to compute food cost per drink",
  description:
    "Compute the food cost of any coffee or milk tea drink in 3 steps, with a worked latte example, sales tax or VAT done right, and the mistakes that hide lost profit.",
  category: "Costing and pricing",
  keywords: ["food cost per drink", "coffee cost calculation", "latte cost breakdown", "beverage costing", "recipe costing"],
  published: "2026-09-27",
  updated: "2026-10-27",
  readingMinutes: 5,
  industries: ["coffee-shop", "milk-tea-shop"],
  faqs: [
    {
      q: "How do I compute the cost of one cup of coffee?",
      a: "List every ingredient and packaging item in one cup, work out the cost per gram, millilitre or piece (price paid ÷ quantity bought), multiply by the amount one cup uses, and add everything up.",
    },
    {
      q: "Should I compute margin with or without tax?",
      a: "Without. If your prices include tax, divide the price by 1 plus the rate first (by 1.10 for a 10% rate). The tax isn't your money, so including it makes every item look more profitable than it is.",
    },
  ],
  Body,
};

export default post;
