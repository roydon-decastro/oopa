import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata = { title: `Terms of Service · ${SITE_NAME}`, description: `The rules for using ${SITE_NAME} as a property owner or renter.` };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <p>
        These terms apply when you use {SITE_NAME}. By creating an account you agree to them and to our{" "}
        <Link className="text-emerald-700 underline" href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the site.
      </p>

      <h2>1. What {SITE_NAME} is</h2>
      <p>
        {SITE_NAME} is a platform that connects property owners with people looking to rent. We are not a real estate broker, we are not a party to any
        lease, and we do not own, inspect or manage the properties listed. Any lease, deposit or payment is an agreement between the owner and the renter.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must be at least 18 years old and give accurate information.</li>
        <li>Keep your password safe. You are responsible for activity on your account.</li>
        <li>One person or business per account. Don&apos;t sign up in someone else&apos;s name.</li>
      </ul>

      <h2>3. Owners</h2>
      <ul>
        <li>Only list properties you own or are authorised to rent out, and keep listings accurate, including rent, advance, deposit and utility charges.</li>
        <li>Mark units as rented or unlist them when they are no longer available.</li>
        <li>Use renters&apos; personal data only to evaluate their application and manage their tenancy, as required by the Data Privacy Act of 2012.</li>
        <li>Follow applicable laws, including the Rent Control Act (RA 9653, as extended) where it applies, and do not discriminate unlawfully.</li>
        <li>Utility charges you bill through sub-meters should reflect actual usage at the rate you disclosed in your listing.</li>
      </ul>

      <h2>4. Renters</h2>
      <ul>
        <li>Give truthful information in applications.</li>
        <li>Visit the property and confirm the owner&apos;s identity before paying anything. Never send money to someone you haven&apos;t verified.</li>
      </ul>

      <h2>5. Not allowed</h2>
      <ul>
        <li>Fake, misleading or duplicate listings, or listings for properties that aren&apos;t available.</li>
        <li>Scams, requests for payment before a viewing, or collecting data for other purposes.</li>
        <li>Harassment, hateful content, or uploading photos you don&apos;t have the right to use.</li>
        <li>Scraping the site, overloading it, or trying to access other users&apos; data.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2>6. Your content</h2>
      <p>You keep ownership of photos and text you post. You allow us to display them on {SITE_NAME} for as long as they are listed.</p>

      <h2>7. Fees</h2>
      <p>Listing and applying are currently free. If we introduce paid features we will tell you before you are charged.</p>

      <h2>8. Disclaimers and liability</h2>
      <p>
        The site is provided &quot;as is&quot;. We don&apos;t guarantee that listings are accurate or that the site will always be available. To the extent the law
        allows, we are not liable for losses arising from dealings between owners and renters.
      </p>

      <h2>9. Changes and ending your account</h2>
      <p>We may update these terms; the date above shows the latest version. You may close your account at any time by emailing {CONTACT_EMAIL}.</p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by the laws of the Republic of the Philippines.</p>

      <h2>11. Contact</h2>
      <p>Questions? Email <strong>{CONTACT_EMAIL}</strong>.</p>
    </LegalPage>
  );
}
