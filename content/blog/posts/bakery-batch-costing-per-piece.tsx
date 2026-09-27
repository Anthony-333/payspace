import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import { CostTable } from "@/components/marketing/cost-table";
import { getIndustry } from "@/content/industries";
import type { CostExample } from "@/lib/costing-example";
import type { BlogPost } from "../types";

const perPiece = getIndustry("bakery")!.example;
const PIECES = 24;

// The same recipe as a whole batch: every per-piece amount × 24, shown without a price.
const batch: CostExample = {
  product: `Cheese ensaymada, batch of ${PIECES}`,
  price: 0,
  vatRateBps: perPiece.vatRateBps,
  lines: perPiece.lines.map((l) => ({ ...l, use: l.use * PIECES })),
};

function Body() {
  return (
    <>
      <p>
        You bake by the tray but sell by the piece. To know what each piece really costs, cost the whole batch, then
        divide by the number of good pieces it makes. Here&rsquo;s how, with a cheese ensaymada as the example.
      </p>

      <h2 id="step-1">Step 1: Cost the whole batch</h2>
      <p>
        List every ingredient in the batch recipe and what you paid for it. Include the small things. Yeast, salt,
        flavouring and the oil for the pans are cheap per batch, but they add up across a month. Include packaging too:
        paper, boxes and bags.
      </p>
      <CostTable example={batch} />

      <h2 id="step-2">Step 2: Divide by the pieces you can actually sell</h2>
      <p>
        This batch costs ₱393.84 and makes 24 pieces, so each ensaymada costs <strong>₱16.41</strong>. Use the number of
        pieces you can <em>sell</em>, not the number the recipe promises. If two pieces usually come out misshapen or
        burnt, divide by 22 instead: each sellable piece then costs <strong>₱17.90</strong>.
      </p>

      <h2 id="step-3">Step 3: Compare with the price</h2>
      <CostTable example={perPiece} />
      <p>
        At ₱45 with 12% VAT included, the price you keep is ₱40.18 and the margin is 59.2%. If your target is 60%, this
        item is just short. Raising it to ₱48 gives 61.7%; keeping ₱45 and trimming the butter from 12 g to 10 g a piece
        gives 61.9%.
        Our <Link href="/blog/markup-vs-margin-pricing">pricing guide</Link> shows how to work out the price for any
        target.
      </p>
      <Callout title="Food cost isn't all your cost">
        <p>
          Gas, electricity, rent and wages aren&rsquo;t in this number. They&rsquo;re paid from the margin, which is why a
          bakery needs a healthy one.
        </p>
      </Callout>

      <h2 id="waste">Count your waste</h2>
      <p>
        Unsold bread at the end of the day is part of what you spent. Write down how many pieces you throw away or sell
        off cheaply as day-old, every day. After a few weeks you&rsquo;ll know which items you bake too many of, which is
        often a quicker win than changing prices.
      </p>

      <h2 id="update">Update when prices change</h2>
      <p>
        Butter, eggs and flour prices move. When a delivery comes in at a new price, the cost of every item that uses it
        changes. If you still have older stock, use a <strong>weighted average</strong>: the total you paid for everything
        on hand, divided by the total quantity.
      </p>

      <TryPayspace>
        <p>
          In Payspace you enter what one piece uses, including fractions like a quarter of an egg. Each delivery updates
          the weighted average cost of its ingredients, every product&rsquo;s margin updates with it, and anything below
          your target is flagged. Record unsold pieces as waste, and the stock ledger shows where everything went. See{" "}
          <Link href="/pos/bakery">Payspace for bakeries</Link>.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "bakery-batch-costing-per-piece",
  title: "How to cost a bakery recipe per piece (batch costing made simple)",
  description:
    "Cost a whole batch, divide by the pieces you can sell, and check the margin: a worked ensaymada example for bakeries, with waste and price changes included.",
  category: "Costing and pricing",
  keywords: ["bakery costing", "cost per piece bakery", "batch recipe costing", "how to price baked goods", "bakery business Philippines"],
  published: "2026-09-27",
  readingMinutes: 5,
  industries: ["bakery"],
  faqs: [
    {
      q: "How do I compute the cost per piece of a baked product?",
      a: "Add up the cost of every ingredient and packaging item in the batch, then divide by the number of pieces you can actually sell from it.",
    },
    {
      q: "Should I include rejects when costing bread?",
      a: "Yes. Divide the batch cost by the sellable pieces only. A batch of 24 that always has 2 rejects should be divided by 22.",
    },
  ],
  Body,
};

export default post;
