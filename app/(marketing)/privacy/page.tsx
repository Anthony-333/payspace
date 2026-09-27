import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Payspace POS collects, uses and protects personal information, and your rights under the Philippine Data Privacy Act of 2012.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="September 27, 2026"
      intro={
        <p>
          Payspace is a point of sale for small businesses. This policy explains what personal information we collect when
          you use it, why, who we share it with, and the rights you have under the Philippine Data Privacy Act of 2012
          (Republic Act No. 10173).
        </p>
      }
    >
      <LegalSection id="who-we-are" title="1. Who we are">
        <p>
          &ldquo;Payspace&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean the operator of the Payspace point of sale
          at payspace.shop. For the personal information of account holders, we are the personal information controller.
          You can reach us about anything in this policy at <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection id="shops-and-customers" title="2. Shops, and the people they serve">
        <p>
          Businesses (&ldquo;shops&rdquo;) use Payspace to record their own sales, stock, suppliers and staff. For the
          personal information a shop puts into Payspace about its own customers, staff or suppliers, <strong>the shop is
          the personal information controller</strong> and we process that information on the shop&rsquo;s behalf, only
          to run the service for it.
        </p>
        <p>
          If you bought something from a shop that uses Payspace and have a question about your information, please
          contact that shop first. We will help the shop answer you.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="3. What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and password. We store only a secure hash of
            your password, never the password itself.
          </li>
          <li>
            <strong>Shop details:</strong> your shop&rsquo;s name and web address, timezone, currency and tax settings,
            and the people who have access to it and their roles.
          </li>
          <li>
            <strong>Business records you enter:</strong> products, recipes, prices and costs, stock and stock movements,
            suppliers (which may include a contact phone number), sales, receipts and reports.
          </li>
          <li>
            <strong>Payment records:</strong> the payment method, amount and, for e-wallets such as GCash or Maya, the
            reference number. Payspace does not process payments and does not collect card numbers.
          </li>
          <li>
            <strong>Photos you upload:</strong> product photos, and payment photos a cashier chooses to attach to a sale.
            A payment photo, such as an e-wallet screenshot, may show a customer&rsquo;s name or mobile number.
          </li>
          <li>
            <strong>Technical information:</strong> your IP address, used to limit repeated sign-in attempts, and the
            session cookies that keep you signed in.
          </li>
          <li>
            <strong>Usage statistics:</strong> privacy-friendly, aggregated page-view and performance measurements from
            Vercel Analytics and Speed Insights. These do not use cookies or build a profile of you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use-it" title="4. How we use it, and why we may">
        <ul>
          <li>
            To provide the service you signed up for: sign you in, run checkout, keep stock and costs, and show your
            reports. This is necessary to perform our agreement with you.
          </li>
          <li>
            To keep Payspace secure: preventing password guessing, abuse and fraud. This is our legitimate interest in
            protecting the service and its users.
          </li>
          <li>
            To send service messages such as account verification, password resets and staff invitations. These are
            part of the service; we do not send marketing email without your consent.
          </li>
          <li>To understand, in aggregate, how Payspace is used so we can make it faster and better.</li>
          <li>To meet legal obligations and respond to lawful requests from authorities.</li>
        </ul>
        <p>We do not sell personal information, and we do not use it for advertising.</p>
      </LegalSection>

      <LegalSection id="public-receipts" title="5. Digital receipts">
        <p>
          Each sale can have a digital receipt at a private link that a shop may share with its customer. Anyone with
          that link can view the receipt, so share it only with the customer. Digital receipts never show payment photos.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="6. Who we share it with">
        <p>We use a small number of service providers who process information for us under contract:</p>
        <ul>
          <li>
            <strong>Convex</strong> hosts our database, file storage and server functions.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website and provides the usage statistics described above.
          </li>
          <li>
            <strong>An email delivery provider</strong> sends account and service emails, once those emails are
            switched on.
          </li>
        </ul>
        <p>
          These providers may store and process information on servers outside the Philippines, including in the United
          States. We choose providers that protect information to a standard comparable to Philippine law, and we remain
          accountable for it. We may also disclose information when the law requires it, or to protect the rights and
          safety of our users or the public.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep it">
        <ul>
          <li>Account and shop records are kept for as long as your account is open.</li>
          <li>
            Sales, receipts, payment records and payment photos are kept with the sale, because a shop needs its sales
            history for its own records and tax obligations.
          </li>
          <li>Photos uploaded but never used are deleted automatically after about a day.</li>
          <li>Sign-in rate-limit records are kept only briefly, then deleted.</li>
        </ul>
        <p>
          When you close your account, we delete or anonymize your personal information within a reasonable period,
          except what we must keep to meet a legal obligation or settle a dispute.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. How we protect it">
        <p>
          Information is encrypted in transit, passwords are hashed, and every request is checked so a shop can only
          ever reach its own records. Staff access is based on their role, and a removed staff member loses access
          immediately. No system is perfectly secure; if a breach affects your personal information, we will notify you
          and the National Privacy Commission as the law requires.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="9. Your rights">
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>be informed about how your personal information is processed;</li>
          <li>access your personal information and get a copy of it;</li>
          <li>correct inaccurate or incomplete information;</li>
          <li>object to processing, and ask us to suspend, withdraw, block or delete information;</li>
          <li>receive your information in a commonly used electronic format (data portability);</li>
          <li>be compensated for damages caused by unlawful processing; and</li>
          <li>
            file a complaint with the{" "}
            <a href="https://privacy.gov.ph" target="_blank" rel="noreferrer">
              National Privacy Commission
            </a>
            .
          </li>
        </ul>
        <p>
          To use any of these rights, email <ContactLink />. We may need to confirm your identity first, and we aim to
          reply within 15 days.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="10. Cookies">
        <p>
          We use only the cookies needed to keep you signed in and to protect your session. We do not use advertising or
          cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <p>
          Payspace is a business tool for people aged 18 and over. We do not knowingly collect information from
          children. If you believe a child has given us personal information, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to this policy">
        <p>
          We will update this policy as Payspace changes, for example when we add new features or service providers. We
          will change the effective date above, and tell account holders by email or in the app before a significant
          change takes effect. See also our <Link href="/terms">Terms &amp; Conditions</Link>.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact us">
        <p>
          Questions, requests or complaints about privacy: <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
