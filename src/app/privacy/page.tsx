import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  legalLinkClass,
  type LegalSection,
} from "@/components/legal-page";
import { buildPageMetadata } from "@/lib/seo";

const EFFECTIVE_DATE = "July 28, 2026";
const PRIVACY_EMAIL = "privacy@mascotai.app";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "How MascotAI collects, uses, stores, and shares account data, creative briefs, reference images, generated mascot assets, and billing information.",
  path: "/privacy",
});

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope and our role",
    content: (
      <>
        <p>
          This Privacy Policy explains how MascotAI (&ldquo;MascotAI,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) handles
          personal information when you visit or use our website, SaaS
          application, animated SVG mascot generator, library, remix tools,
          app-asset tools, marketplace, and related services (collectively, the
          &ldquo;Service&rdquo;).
        </p>
        <p>
          The Service is a creative production tool for people and teams
          building web and mobile products. It is not intended for use with
          regulated or highly sensitive personal information. Please do not put
          passwords, government identifiers, financial account details,
          medical information, or other sensitive personal data into a mascot
          brief, edit request, custom gesture, or reference image.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account information.</strong> Your name, email address,
            profile image, authentication identifiers, and account status. Our
            authentication service providers handle sign-in credentials and
            authentication methods on our behalf.
          </li>
          <li>
            <strong>Onboarding and profile information.</strong> Your stated
            use case, technology stack, referral source, prior purchasing
            experience, favorite example, and other answers you choose to
            provide.
          </li>
          <li>
            <strong>Creative content.</strong> Mascot names, product context,
            visual and personality briefs, custom gesture descriptions, edit
            instructions, conversation history included with an edit, uploaded
            reference images, selected AI model, and the SVGs, previews, icon
            files, favicons, PWA assets, logos, and other outputs created
            through the Service.
          </li>
          <li>
            <strong>Library and marketplace records.</strong> Saved mascot
            packs, themes, poses, parts, source listing, download activity, and
            marketplace orders, licenses, reservations, and fulfillment
            records.
          </li>
          <li>
            <strong>Billing information.</strong> Plan, entitlement, renewal
            and expiry status, token balances and ledger entries, product
            identifiers, checkout and payment status, transaction amounts,
            currency, and provider transaction identifiers. We do not receive
            or store your full payment-card number; payment details are handled
            by our checkout and billing providers.
          </li>
          <li>
            <strong>Usage and technical information.</strong> Pages and
            features used, coarse product events, model selection, generation
            success or failure, token usage, download type, IP address and
            request information used for security and rate limiting, browser or
            device information, and diagnostic logs.
          </li>
        </ul>
        <p>
          We collect information from you, automatically from your device and
          use of the Service, and from service providers when they confirm
          account or transaction events.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information",
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>
            create and secure accounts, synchronize profiles, and provide
            customer support;
          </li>
          <li>
            generate concept samples, animated SVG mascot packs, new gestures,
            refinements, remixes, and app-brand assets;
          </li>
          <li>
            save your work, support downloads, maintain version and ownership
            records, and fulfill marketplace purchases;
          </li>
          <li>
            show live prices, process purchases, administer subscriptions,
            refill and deduct tokens, prevent double spending, and handle
            refunds or payment disputes;
          </li>
          <li>
            operate, debug, secure, monitor, and improve the Service, including
            preventing abuse and measuring which product flows work;
          </li>
          <li>
            communicate about the Service, transactions, security, policy
            changes, and account administration; and
          </li>
          <li>
            comply with law, enforce our{" "}
            <Link href="/terms" className={legalLinkClass}>
              Terms of Service
            </Link>
            , and protect users, MascotAI, and others.
          </li>
        </ul>
        <p>
          We do not use your private creative content to train a MascotAI model.
          We also configure our product analytics so that names, email
          addresses, mascot briefs, prompts, and other free-text customer
          content are not included in custom analytics events.
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "AI processing",
    content: (
      <>
        <p>
          MascotAI lets you choose between models provided by OpenAI and
          Anthropic. To perform a generation, we send the selected provider the
          information needed for that request. Depending on the feature, this
          may include your brief, product context, mascot SVG or compact mascot
          pack, selected sample, edit history, custom gesture, and reference
          image.
        </p>
        <p>
          The provider returns generated text, structured data, SVG, or image
          output to MascotAI. Those providers process this information on our
          behalf or as otherwise described in the terms and privacy
          documentation applicable to their services. Provider practices,
          including abuse monitoring and retention, may vary by provider and
          our configuration. Do not submit content you are not authorized to
          share with the selected provider.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How we disclose information",
    content: (
      <>
        <p>We disclose information only as needed for these purposes:</p>
        <ul>
          <li>
            <strong>Service operations:</strong> Companies that help us host
            the Service, store data, secure accounts, provide authentication,
            monitor reliability, understand product usage, support customers,
            and process billing and payments. They receive only the information
            reasonably needed to perform those services.
          </li>
          <li>
            <strong>AI generation:</strong> OpenAI or Anthropic, based on the
            model you select, and OpenAI for an image feature when that feature
            is enabled.
          </li>
          <li>
            <strong>Legal and safety:</strong> Authorities, advisors, or other
            parties when reasonably necessary to comply with law, protect
            rights and safety, investigate fraud, or enforce agreements.
          </li>
          <li>
            <strong>Business transfers:</strong> A buyer, investor, lender, or
            successor in connection with due diligence or a merger,
            financing, reorganization, or sale of assets, subject to appropriate
            confidentiality protections.
          </li>
        </ul>
        <p>
          We do not sell personal information for money. We do not use personal
          information for third-party targeted advertising, and we do not share
          private library mascots or private creative briefs with other
          customers.
        </p>
        <p>
          Marketplace listing previews and public example studios are public.
          Your own saved mascots do not become marketplace listings merely
          because you create or save them.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention and deletion",
    content: (
      <>
        <ul>
          <li>
            <strong>Reference images</strong> are session-scoped and scheduled
            for automatic deletion within 24 hours of upload. Removing a
            reference in the product requests deletion sooner.
          </li>
          <li>
            <strong>Saved mascot packs and completed app-asset packs</strong>{" "}
            remain in your library until you delete them or close your account,
            subject to backup and legal-retention exceptions.
          </li>
          <li>
            <strong>Incomplete app-asset samples and temporary uploads</strong>{" "}
            are periodically purged when they become stale or are not attached
            to a completed pack.
          </li>
          <li>
            <strong>Account, billing, token-ledger, marketplace order, fraud,
            and security records</strong> are retained for as long as needed to
            operate the account, honor purchases and licenses, resolve disputes,
            maintain financial records, prevent abuse, and comply with law.
          </li>
          <li>
            <strong>Temporary operational records</strong> are retained only
            as long as needed for reliability, security, and preventing
            duplicate charges.
          </li>
        </ul>
        <p>
          When you delete your account, we begin deleting or de-identifying
          account-linked content from active systems. We may retain limited
          transaction, license, dispute, security, and backup information where
          required or reasonably necessary. Backup copies are removed on their
          normal rotation.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <p>
        We use administrative, technical, and organizational measures designed
        to protect information, including access controls, account security,
        monitoring, safeguards for payments and stored assets, and limited
        retention for temporary uploads. No system is completely secure, and
        we cannot guarantee that unauthorized access, loss, or misuse will
        never occur. You are responsible for protecting your sign-in methods
        and for notifying us if you believe your account has been compromised.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your choices and privacy rights",
    content: (
      <>
        <p>
          You can review and update certain account details through your
          account controls, remove saved mascots and app-asset packs in the
          product, remove a current reference upload, cancel a subscription
          through the checkout or account-management flow made available by the
          billing provider, and delete your account where that option is
          available.
        </p>
        <p>
          Depending on where you live, you may have rights to request access,
          correction, deletion, portability, restriction, or objection
          concerning personal information, or to appeal a decision about a
          request. You may also have a right not to receive discriminatory
          treatment for exercising privacy rights. To make a request, email{" "}
          <a className={legalLinkClass} href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          . We may need to verify your identity and may retain information
          permitted by law.
        </p>
        <p>
          Browser privacy signals vary in meaning. Because MascotAI does not
          sell personal information or use it for cross-context behavioral
          advertising, we do not currently treat such signals as a request to
          opt out of those activities.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International users",
    content: (
      <p>
        MascotAI and its service providers may process information in the
        United States and other countries where they operate. Those countries
        may have different data-protection laws from your home country. Where
        required, we use appropriate contractual or other safeguards for
        cross-border transfers.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        The Service is built for product creators and businesses and is not
        directed to children under 13. We do not knowingly collect personal
        information from children under 13. If you believe a child has provided
        personal information to us, contact us so we can investigate and
        delete it. You must be old enough to enter into the{" "}
        <Link href="/terms" className={legalLinkClass}>
          Terms of Service
        </Link>{" "}
        to hold an account.
      </p>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    content: (
      <>
        <p>
          We may update this Privacy Policy as the Service or law changes. We
          will post the revised version here, update the date above, and provide
          additional notice when required. Material changes apply prospectively
          unless law permits otherwise.
        </p>
        <p>
          For privacy questions or requests, contact MascotAI at{" "}
          <a className={legalLinkClass} href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your work stays yours"
      title="Privacy Policy"
      summary="This policy describes the data behind a MascotAI account—from a creative brief and temporary reference image to a saved SVG pack, token balance, and marketplace order."
      effectiveDate={EFFECTIVE_DATE}
      sections={sections}
    />
  );
}
