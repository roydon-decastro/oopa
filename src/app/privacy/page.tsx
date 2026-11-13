import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata = { title: `Privacy Policy · ${SITE_NAME}`, description: `How ${SITE_NAME} collects, uses and protects your personal data under the Data Privacy Act of 2012.` };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>
        {SITE_NAME} (&quot;we&quot;, &quot;us&quot;) runs a website where property owners list rentals and renters search and apply for them.
        We respect your privacy and process personal data in line with the Data Privacy Act of 2012 (Republic Act No. 10173),
        its Implementing Rules and Regulations, and issuances of the National Privacy Commission (NPC).
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> name, email address, mobile number (optional), password (stored only as a secure hash), and whether you are an owner or a renter.</li>
        <li><strong>Listing details (owners):</strong> property and building information, address, photos, rent and terms, utility rates, and meter readings you record.</li>
        <li><strong>Application details (renters):</strong> preferred move-in date, lease length, number of occupants, monthly income (optional), work or school, and your message to the owner.</li>
        <li><strong>Technical data:</strong> IP address, browser type and log-in session cookies needed to keep you signed in and to protect the site from abuse.</li>
      </ul>
      <p>We do not ask for government ID numbers, bank details or sensitive personal information through the site.</p>

      <h2>2. Why we use it (purpose and legal basis)</h2>
      <ul>
        <li>To create and secure your account and provide the service you signed up for (contract).</li>
        <li>To show owners&apos; listings to the public, and to pass a renter&apos;s application to the owner of the property they applied to (contract and consent).</li>
        <li>To send service emails, such as a new application or an application decision (contract and legitimate interest).</li>
        <li>To prevent fraud and misuse and to comply with the law (legal obligation and legitimate interest).</li>
      </ul>
      <p>We do not sell your personal data and we do not use it for third-party advertising.</p>

      <h2>3. Who can see your data</h2>
      <ul>
        <li><strong>The public</strong> sees published listings, including the owner&apos;s display name, but not the owner&apos;s email or phone number.</li>
        <li><strong>An owner</strong> sees the applications sent to their own properties. A renter&apos;s email and mobile number are only shown once the owner reviews or approves the application.</li>
        <li><strong>Service providers</strong> that host and run the site for us, under data processing terms: Vercel (web hosting and photo storage), Neon (database), Cloudflare (a bot check on the sign-up page, which sees your IP address and browser details) and our email provider. Some of these store data outside the Philippines; we use providers with appropriate safeguards as required by the Data Privacy Act.</li>
        <li><strong>Authorities</strong>, when required by law or a lawful order.</li>
      </ul>

      <h2>4. How long we keep it</h2>
      <p>
        We keep your account data while your account is active. If you delete your account, we delete or anonymise your personal data within
        30 days, except records we must keep longer by law. Owners are responsible for the tenant records (such as meter readings and statements)
        they choose to keep for their own business.
      </p>

      <h2>5. How we protect it</h2>
      <p>
        Data is encrypted in transit (HTTPS), passwords are hashed, and access is limited to what each user is allowed to see. No system is perfectly secure;
        if a personal data breach is likely to put you at risk, we will notify you and the NPC as the law requires.
      </p>

      <h2>6. Your rights</h2>
      <p>Under the Data Privacy Act you have the right to be informed, to access, to object, to erasure or blocking, to rectification, to data portability, to damages, and to file a complaint with the National Privacy Commission.</p>
      <p>To use any of these rights, email us at <strong>{CONTACT_EMAIL}</strong>. We will reply within 15 working days.</p>

      <h2>7. Cookies</h2>
      <p>We only use cookies that are needed to keep you signed in and secure. We do not use advertising or tracking cookies.</p>

      <h2>8. Changes</h2>
      <p>If we change this policy in a meaningful way we will update the date above and, for significant changes, tell you by email.</p>

      <h2>9. Contact</h2>
      <p>
        Data Protection Officer, {SITE_NAME}: <strong>{CONTACT_EMAIL}</strong>. See also our <Link className="text-emerald-700 underline" href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
