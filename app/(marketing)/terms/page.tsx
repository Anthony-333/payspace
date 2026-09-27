import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you use Payspace POS for your coffee shop, bakery, grocery or store.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      effectiveDate="September 27, 2026"
      intro={
        <p>
          These terms are the agreement between you and Payspace for using the Payspace point of sale at payspace.shop.
          By creating an account or using Payspace, you agree to them. If you do not agree, please do not use the
          service.
        </p>
      }
    >
      <LegalSection id="the-service" title="1. The service">
        <p>
          Payspace is web-based point-of-sale software for small businesses. It records sales and payments, tracks stock,
          works out recipe costs and profit per item, and produces receipts and reports. We are still adding features,
          and some may change, be labelled &ldquo;soon&rdquo;, or be offered to some shops first.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="2. Your account">
        <ul>
          <li>You must be at least 18 years old and able to enter into a binding agreement.</li>
          <li>
            If you set up a shop for a business, you confirm you are allowed to act for that business, and these terms
            bind the business as well as you.
          </li>
          <li>Give accurate information, and keep your password secret. You are responsible for activity on your account.</li>
          <li>
            The shop owner decides who else can use the shop and with what role, and is responsible for what their staff
            do in Payspace.
          </li>
          <li>Tell us straight away at <ContactLink /> if you think someone has used your account without permission.</li>
        </ul>
      </LegalSection>

      <LegalSection id="plans" title="3. Plans and payment">
        <p>
          You can use the Free plan at no cost, within the limits shown on our <Link href="/#pricing">pricing</Link>{" "}
          section. Paid plans are priced per shop. We will show you the price, billing period and what is included
          before you subscribe, and we will never charge you without your agreement.
        </p>
        <p>
          We may change plan limits or prices. For a paid plan, we will tell you at least 30 days before a price increase
          takes effect, and you may cancel before then. If you move to a plan with lower limits, data over the limit is
          kept but some features may become read-only.
        </p>
      </LegalSection>

      <LegalSection id="tax-and-compliance" title="4. Taxes, receipts and compliance">
        <p>
          <strong>You are responsible for your business&rsquo;s legal and tax obligations.</strong> In particular:
        </p>
        <ul>
          <li>
            Payspace is not currently registered with the Bureau of Internal Revenue (BIR) as an accredited POS or
            computerized accounting system. Receipts from Payspace are records of the sale and are{" "}
            <strong>not official receipts or sales invoices</strong> for BIR purposes. Keep issuing BIR-registered
            invoices as the law requires.
          </li>
          <li>
            You are responsible for setting the right tax (VAT) rate and for applying discounts the law requires, such
            as the Senior Citizen and PWD discounts.
          </li>
          <li>
            Payspace <strong>records payments; it does not process them</strong>. Card, GCash, Maya and other payments
            are handled by your own payment providers, and Payspace never holds your money.
          </li>
          <li>
            Profit, cost and stock figures are calculated from the data you enter. Check them before relying on them for
            tax filings or major business decisions.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="your-data" title="5. Your data">
        <p>
          Your business records belong to you. You give us permission to store, process and display them only as needed
          to provide Payspace to you. You can export your records at any time using the export tools as they become
          available on your plan.
        </p>
        <p>
          You are responsible for having the right to enter any personal information you put into Payspace, such as
          details of your customers, staff and suppliers, and for handling it as the Data Privacy Act of 2012 requires.
          How we handle personal information is explained in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="6. Acceptable use">
        <p>When using Payspace, you agree not to:</p>
        <ul>
          <li>break the law, or record sales of goods or services that are illegal to sell;</li>
          <li>try to access another shop&rsquo;s data, or anyone&rsquo;s account without permission;</li>
          <li>probe, scan or test the service for vulnerabilities, or disrupt it, without our written permission;</li>
          <li>upload malware, or content you do not have the right to use; or</li>
          <li>resell or copy the service, or use it to build a competing product.</li>
        </ul>
        <p>If you find a security problem, please report it to <ContactLink /> rather than exploiting it.</p>
      </LegalSection>

      <LegalSection id="availability" title="7. Availability and changes">
        <p>
          We work to keep Payspace available and your data safe, but we cannot promise the service will always be
          uninterrupted or error-free. Payspace needs an internet connection, and outages at our hosting providers, your
          internet provider or your device can stop it working for a while. Keep your own records of anything you cannot
          afford to lose, and use the export tools regularly once they are available on your plan.
        </p>
        <p>
          We may change, add or remove features. If we remove a feature you rely on in a paid plan, we will tell you in
          advance.
        </p>
      </LegalSection>

      <LegalSection id="ending" title="8. Closing your account">
        <p>
          You can stop using Payspace at any time, and ask us to close your account by writing to <ContactLink />. We
          may suspend or close an account that breaks these terms or puts the service or other users at risk. Where it
          is safe and lawful, we will warn you first and give you a chance to export your data.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Disclaimers and liability">
        <p>
          Payspace is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we are
          not liable for indirect or consequential losses, such as lost profits, lost sales or lost data, arising from
          your use of the service. Our total liability for any claim relating to Payspace is limited to the amount you
          paid us in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited under
          Philippine law, or your rights as a consumer.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes to these terms">
        <p>
          We may update these terms. We will change the effective date above, and tell account holders by email or in the
          app before a significant change takes effect. If you keep using Payspace after that, the new terms apply.
        </p>
      </LegalSection>

      <LegalSection id="law" title="11. Governing law">
        <p>
          These terms are governed by the laws of the Republic of the Philippines. We will try to settle any dispute with
          you informally first; if we cannot, it will be decided by the proper courts of the Philippines.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact us">
        <p>
          Questions about these terms: <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
