import Link from "next/link";
import { Callout, TryPayspace } from "@/components/marketing/article-bits";
import type { BlogPost } from "../types";

function Body() {
  return (
    <>
      <p>
        E-wallet payments are quick at the counter, but they don&rsquo;t land in your cash drawer, so they&rsquo;re easy
        to lose track of. A payment that never arrived, a customer who sent the wrong amount, or a fake screenshot can
        all slip past on a busy day. A simple routine at the counter and at closing time catches them.
      </p>

      <h2 id="at-the-counter">At the counter</h2>
      <ol>
        <li>
          <strong>Check your own phone, not the customer&rsquo;s.</strong> A screenshot or the customer&rsquo;s
          &ldquo;sent&rdquo; screen isn&rsquo;t proof. Wait until the payment shows in your own GCash or Maya transaction
          history before you hand over the order.
        </li>
        <li>
          <strong>Check the amount.</strong> Make sure the amount received matches the total, especially on split bills.
        </li>
        <li>
          <strong>Write down the reference number</strong> with the sale. It&rsquo;s how you&rsquo;ll match the payment
          later, and how the customer and the e-wallet provider will look it up if something goes wrong.
        </li>
      </ol>
      <Callout title="Watch out for fake receipts">
        <p>
          Edited screenshots of payment confirmations are a known scam. The only proof that counts is the money showing
          in your own account.
        </p>
      </Callout>

      <h2 id="closing">At closing time</h2>
      <ol>
        <li>
          <strong>Total your e-wallet sales by method</strong> from your POS or sales notebook: how much should have come
          in through GCash, and how much through Maya.
        </li>
        <li>
          <strong>Open each app&rsquo;s transaction history</strong> for the day and add up what actually arrived.
        </li>
        <li>
          <strong>If the totals don&rsquo;t match, match reference numbers</strong> one by one until you find the
          difference.
        </li>
        <li>
          <strong>Count the cash drawer separately.</strong> Expected cash = opening cash + cash sales − any cash taken
          out during the day. E-wallet and card sales shouldn&rsquo;t be in this number.
        </li>
      </ol>

      <h2 id="mismatches">Common reasons the numbers don&rsquo;t match</h2>
      <ul>
        <li>A payment was recorded as cash, or cash was recorded as GCash</li>
        <li>A customer paid twice, or paid the wrong amount</li>
        <li>A payment was sent to the wrong number or account</li>
        <li>A split bill was recorded as a single payment</li>
        <li>A payment is still pending, or was reversed</li>
      </ul>

      <h2 id="separate">Keep shop money separate</h2>
      <p>
        If you can, receive shop payments in an account used only for the shop. GCash and Maya both offer merchant and
        business options. Mixing shop and personal payments in one wallet makes closing time much harder, and makes your
        records harder to explain.
      </p>

      <h2 id="cards">A note on cards</h2>
      <p>
        If you take cards through a bank terminal, record the card payment in your POS as well, and match the
        terminal&rsquo;s settlement report the same way.
      </p>

      <TryPayspace>
        <p>
          Payspace records cash, GCash, Maya and card on every sale, splits one bill across methods, and keeps each
          e-wallet reference number with the sale. You can attach a photo of the payment screen, which your staff see on
          the receipt, but the customer&rsquo;s receipt link never shows it. The dashboard shows your payment mix for the
          day. Card payments are recorded, not processed. See Payspace for{" "}
          <Link href="/pos/coffee-shop">coffee shops</Link> and{" "}
          <Link href="/pos/sari-sari-store">sari-sari stores</Link>.
        </p>
      </TryPayspace>
    </>
  );
}

const post: BlogPost = {
  slug: "gcash-maya-payments-end-of-day",
  title: "How to reconcile GCash and Maya payments",
  description:
    "Reconcile GCash and Maya payments at closing in a few minutes: what to check at the counter, how to match reference numbers, and how to spot fake receipts.",
  category: "Payments",
  keywords: ["GCash payments for business", "Maya business payments", "GCash reference number", "fake GCash receipt", "end of day cash count"],
  published: "2026-09-27",
  readingMinutes: 4,
  industries: ["coffee-shop", "milk-tea-shop", "sari-sari-store"],
  faqs: [
    {
      q: "How do I confirm a GCash payment is real?",
      a: "Check that the payment shows in your own GCash transaction history before handing over the order. A screenshot on the customer's phone is not proof, because screenshots can be edited.",
    },
    {
      q: "How do I reconcile e-wallet payments at the end of the day?",
      a: "Total your GCash and Maya sales from your POS, compare each total with the day's transaction history in the app, and match reference numbers one by one if they differ.",
    },
  ],
  Body,
};

export default post;
