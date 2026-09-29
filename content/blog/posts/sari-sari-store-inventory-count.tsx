import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import type { BlogPost } from "../types";

function Body() {
  return (
    <>
      <p>
        Every small store loses stock it can&rsquo;t explain: an expired pack here, a missing bottle there, something
        taken for the house and never written down. You can&rsquo;t stop what you can&rsquo;t see. A short weekly count
        shows you where the stock goes, and it takes less time than you think.
      </p>

      <h2 id="when">Pick a fixed time</h2>
      <p>
        Count at the same time each week, before you open, when nothing is being sold. A count done in the middle of a
        busy afternoon is wrong before you finish it.
      </p>

      <h2 id="what">Don&rsquo;t count everything every week</h2>
      <p>Split your products into groups:</p>
      <ul>
        <li>
          <strong>Every week:</strong> fast sellers and high-value items: softdrinks, cigarettes, rice, cooking oil,
          canned goods, load cards.
        </li>
        <li>
          <strong>Every month:</strong> everything else, one shelf or section at a time.
        </li>
      </ul>
      <p>
        Counting a small set often is called <strong>cycle counting</strong>. It catches problems while they&rsquo;re
        small, without closing the store for a day.
      </p>

      <h2 id="compare">Compare what you counted with what you expected</h2>
      <p>For each product, work out what should be on the shelf:</p>
      <p>
        <strong>expected = last count + deliveries − sales − recorded waste</strong>
      </p>
      <p>
        Say you counted 48 packs of instant noodles last week, received a case of 72, sold 90 and threw out 2 damaged
        packs. You should have 28. If you count 25, <strong>3 packs are missing</strong>. At ₱10 each, that&rsquo;s ₱30
        this week, or around ₱1,500 a year, from a single product.
      </p>

      <h2 id="why">Find out why stock goes missing</h2>
      <p>Most gaps have an ordinary explanation:</p>
      <ul>
        <li>Items taken for the family and not written down</li>
        <li>Expired or damaged goods thrown away without a note</li>
        <li>Sales on credit (utang) that were never recorded</li>
        <li>Deliveries that arrived short, but were paid in full</li>
        <li>Counting mistakes: the same box counted twice, or a box missed in the back</li>
      </ul>
      <p>
        Record each of these when it happens, and the gap that&rsquo;s left is the part worth worrying about.
      </p>
      <Callout title="Check deliveries at the door">
        <p>
          Count every delivery against the supplier&rsquo;s receipt before you sign. A short delivery you&rsquo;ve paid
          for looks exactly like theft in next week&rsquo;s count.
        </p>
      </Callout>

      <h2 id="reorder">Use the count to reorder</h2>
      <p>
        A count also tells you when to buy. For each fast seller, work out a <strong>reorder point</strong>: how many you
        sell a day × how many days a delivery takes, plus a buffer. If you sell 12 bottles of a softdrink a day, your
        supplier delivers two days after you order, and you keep one extra day as a buffer, reorder when you&rsquo;re
        down to <strong>36</strong> (12 × 3).
      </p>

      <h2 id="fifo">First in, first out</h2>
      <p>
        When you restock, put the new items behind the old ones, so the earliest expiry dates sell first. It&rsquo;s the
        simplest way to cut expired stock.
      </p>

      <TryPayspace>
        <p>
          Payspace takes every sale off your stock automatically, and records deliveries, waste and counts in a stock
          ledger, so the expected number is always ready. Enter what you counted and it records the difference. Low-stock
          items are flagged before you run out. See Payspace for{" "}
          <Link href="/pos/sari-sari-store">sari-sari stores</Link> and{" "}
          <Link href="/pos/grocery">groceries</Link>.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "sari-sari-store-inventory-count",
  title: "Sari-sari store inventory: a weekly count",
  description:
    "Do a sari-sari store inventory count without closing for a day: what to count each week, how to find missing stock, and when to reorder.",
  category: "Inventory",
  keywords: ["sari-sari store inventory", "how to do inventory in a store", "stock count", "inventory shrinkage", "reorder point"],
  published: "2026-09-27",
  readingMinutes: 5,
  industries: ["sari-sari-store", "grocery"],
  faqs: [
    {
      q: "How often should a sari-sari store count its inventory?",
      a: "Count fast-selling and high-value items every week, and the rest of the store once a month, one section at a time.",
    },
    {
      q: "How do I know if stock is missing?",
      a: "Work out what should be on the shelf (last count + deliveries − sales − recorded waste) and compare it with what you count. The difference is stock you can't account for.",
    },
  ],
  Body,
};

export default post;
