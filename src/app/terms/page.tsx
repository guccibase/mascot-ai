import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  legalLinkClass,
  type LegalSection,
} from "@/components/legal-page";
import { buildPageMetadata } from "@/lib/seo";

const EFFECTIVE_DATE = "July 28, 2026";
const LEGAL_EMAIL = "legal@mascotai.app";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description:
    "Terms governing MascotAI accounts, AI-generated SVG mascot packs, token plans, downloads, remixes, and marketplace purchases.",
  path: "/terms",
});

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement and eligibility",
    content: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement
          between you and MascotAI (&ldquo;MascotAI,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and
          use of the MascotAI website, SaaS application, AI generation tools,
          libraries, downloads, marketplace, and related services
          (collectively, the &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account, purchasing a plan or marketplace item, or
          using the Service, you agree to these Terms and our{" "}
          <Link href="/privacy" className={legalLinkClass}>
            Privacy Policy
          </Link>
          . If you use the Service for a company or other organization, you
          represent that you have authority to bind it, and
          &ldquo;you&rdquo; includes that organization.
        </p>
        <p>
          You must be at least 18 years old or the age of legal majority where
          you live and capable of entering a contract. The Service is not
          directed to children under 13. If you do not agree to these Terms, do
          not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "What MascotAI provides",
    content: (
      <>
        <p>
          MascotAI helps you design animated SVG mascots for web and mobile
          products. Features may include written briefs, AI-generated concept
          directions, full gesture studios, theme and part controls, custom
          gestures, conversational refinement, reference-guided generation,
          remixing, downloadable SVG packs, app icons, favicons, PWA files,
          logo assets, saved libraries, and a ready-made mascot marketplace.
        </p>
        <p>
          Some features are free to preview. Creating, refining, remixing,
          saving, exporting, or purchasing content may require an account,
          tokens, an active plan, a one-time payment, or a separate marketplace
          license. Features, supported AI models, limits, and formats may change
          over time.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and acceptable use",
    content: (
      <>
        <p>
          You must provide accurate account information, keep your sign-in
          methods secure, and promptly notify us of suspected unauthorized use.
          You are responsible for activity under your account and may not sell,
          transfer, or share access in a way that defeats plan, token, or
          marketplace limits.
        </p>
        <p>You may not use the Service to:</p>
        <ul>
          <li>
            violate law or the rights of others, including intellectual
            property, privacy, publicity, contract, or consumer-protection
            rights;
          </li>
          <li>
            generate or distribute unlawful, fraudulent, deceptive, abusive,
            hateful, sexually exploitative, or malicious content;
          </li>
          <li>
            impersonate a person or brand, create a misleading endorsement, or
            upload a reference image you are not authorized to use;
          </li>
          <li>
            introduce malware, probe or bypass security, scrape at unreasonable
            volume, interfere with the Service, or access another user&apos;s
            account or private content;
          </li>
          <li>
            reverse engineer or extract non-public source code except where
            applicable law expressly allows it;
          </li>
          <li>
            evade rate limits, token metering, marketplace locks, checkout,
            export controls, or other technical restrictions; or
          </li>
          <li>
            use generated assets or the Service to train or benchmark a
            competing generative mascot service without our written permission.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content and permission to process it",
    content: (
      <>
        <p>
          &ldquo;Your Content&rdquo; means the briefs, names, product context,
          instructions, prompts, reference images, existing mascot packs, and
          other material you submit to the Service. Between you and MascotAI,
          you retain your ownership of Your Content.
        </p>
        <p>
          You grant MascotAI a worldwide, non-exclusive, royalty-free license
          to host, copy, transmit, convert, modify, display, and otherwise use
          Your Content solely to operate, secure, support, and improve the
          Service and to generate the outputs you request. This license lasts
          only as long as reasonably necessary for those purposes, subject to
          the retention described in our Privacy Policy.
        </p>
        <p>
          You represent that you have all rights and permissions needed to
          submit Your Content and authorize this processing, including sending
          it to the AI provider you select. You are responsible for deciding
          whether Your Content may contain confidential information and for
          obtaining any permissions required by your employer, clients, users,
          licensors, or other rights holders.
        </p>
      </>
    ),
  },
  {
    id: "generated-output",
    title: "Generated output and commercial use",
    content: (
      <>
        <p>
          Subject to your payment obligations and these Terms, as between you
          and MascotAI, you may use, modify, reproduce, distribute, publish, and
          commercialize mascot packs and app assets generated specifically for
          you through the standard create, refine, gesture, and app-asset
          features. To the extent MascotAI obtains any transferable rights in
          those outputs, we assign those rights to you upon creation.
        </p>
        <p>
          This does not transfer rights in the Service, its code or interface,
          public example studios, underlying templates and production methods,
          pre-existing MascotAI materials, third-party materials, or
          marketplace listings except under the marketplace license below.
          General ideas, techniques, styles, prompts, and functional elements
          are not made exclusive to you.
        </p>
        <p>
          AI output may be inaccurate, incomplete, similar or identical to
          output provided to others, or not eligible for copyright or other
          protection. MascotAI does not promise that an output is unique,
          non-infringing, registrable as a trademark, accessible, or fit for
          your use. You must review outputs before shipping them, test generated
          SVG and animation in your target environment, and conduct appropriate
          rights and trademark clearance for important commercial uses.
        </p>
      </>
    ),
  },
  {
    id: "marketplace",
    title: "Marketplace licenses",
    content: (
      <>
        <p>
          Marketplace previews are for evaluation only. They do not grant a
          right to save, export, copy, or use the underlying pack outside the
          preview. A marketplace checkout grants only the license associated
          with the SKU shown at checkout:
        </p>
        <ul>
          <li>
            <strong>Remix license.</strong> A remix purchase grants one
            authenticated remix session for the identified listing during the
            stated unlock period (currently 24 hours). The listing remains
            available to others. After completing that session, you receive a
            perpetual, worldwide, non-exclusive, royalty-free license to use,
            modify, reproduce, distribute, and commercialize the resulting
            remixed mascot. You may not use the purchase to extract or
            redistribute the unmodified source listing as a standalone asset.
          </li>
          <li>
            <strong>Buy to own.</strong> A buy-to-own purchase removes the
            listing from future sale and, to the extent MascotAI owns and can
            transfer the rights, assigns to you MascotAI&apos;s rights in the
            purchased pack. The exclusivity is prospective: licenses granted to
            prior remix customers and rights in public previews, general
            methods, templates, and third-party materials survive the sale.
          </li>
        </ul>
        <p>
          Marketplace availability can change until payment and fulfillment
          complete. A temporary checkout reservation is not ownership. If a
          paid order cannot be fulfilled because the item became unavailable,
          we may cancel and refund the affected order. Marketplace licenses
          cannot be transferred separately from a business or product using the
          asset without our written consent, except as part of a bona fide sale
          of that business or product.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "Plans, tokens, and payment",
    content: (
      <>
        <p>
          Prices, billing periods, included token allowances, marketplace
          prices, and taxes are shown before purchase. Payments are processed by
          the provider identified in the checkout flow. You authorize that
          provider and MascotAI to charge the selected payment method for the
          displayed amount and applicable taxes.
        </p>
        <ul>
          <li>
            <strong>Subscriptions renew automatically</strong> for the selected
            weekly, monthly, or annual term until canceled. You may cancel
            through the account or billing-provider controls made available to
            you. Cancellation stops future renewal and ordinarily leaves access
            through the paid term, subject to billing-provider rules.
          </li>
          <li>
            <strong>Plan tokens</strong> refill on the cycle shown for your
            plan. Unused plan allowance does not stack into the next refill and
            may be reset or expire with the applicable cycle or entitlement.
            Annual plans may be billed once while their token allowance refills
            monthly.
          </li>
          <li>
            <strong>Top-up tokens</strong> are one-time purchases, are spent
            after plan tokens, roll over, and do not expire while your account
            remains open. A top-up balance can provide generation access even
            without a current subscription, subject to available balance and
            feature limits.
          </li>
          <li>
            <strong>Generation charges</strong> depend on the selected model,
            payload, feature, and actual provider usage. The Service may reserve
            an estimated maximum before generation and return unused tokens
            after settlement. Completed provider work may consume tokens even
            if a later stage fails.
          </li>
        </ul>
        <p>
          Except where required by law or expressly stated at checkout,
          payments and consumed tokens are non-refundable. We may correct
          pricing, catalog, or token errors and may issue credits or refunds at
          our discretion. Chargebacks or reversed payments may result in
          revocation of the related entitlement, tokens, marketplace license,
          or access.
        </p>
      </>
    ),
  },
  {
    id: "service-ip",
    title: "MascotAI intellectual property",
    content: (
      <p>
        The Service, software, site design, brand, documentation, public
        examples, curated marketplace presentation, and all related technology
        and materials are owned by MascotAI or its licensors and are protected
        by intellectual-property laws. Except for the limited rights expressly
        granted in these Terms, no rights are granted to you. If you provide
        feedback, you grant us a perpetual, worldwide, irrevocable,
        royalty-free right to use it without restriction or compensation.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <p>
        The Service depends on third-party services, including Clerk, Convex,
        OpenAI, Anthropic, Vercel, RevenueCat, and Stripe. Their availability,
        output, and separate terms or policies may affect the Service. MascotAI
        is not responsible for third-party services outside our control. Your
        use of a third-party checkout, authentication method, or model may also
        be governed by that provider&apos;s terms.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "Suspension and termination",
    content: (
      <>
        <p>
          You may stop using the Service at any time and may delete your account
          through available account controls. Cancel recurring billing before
          deleting your account to avoid charges that a third-party billing
          provider may otherwise continue to process.
        </p>
        <p>
          We may limit, suspend, or terminate access if you materially breach
          these Terms, create risk or legal exposure, fail to pay, abuse the
          Service, or threaten its security or operation. Where reasonable, we
          will provide notice and an opportunity to cure. We may also
          discontinue the Service or a feature with reasonable notice when
          practicable.
        </p>
        <p>
          Upon termination, your right to use the Service ends. Sections that
          by their nature should survive do survive, including payment
          obligations, licenses already granted for properly purchased
          downloaded outputs, intellectual property, disclaimers, liability
          limits, indemnity, and dispute terms.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: (
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE AND ALL AI OUTPUTS,
        PREVIEWS, MARKETPLACE MATERIALS, AND DOWNLOADS ARE PROVIDED &ldquo;AS
        IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; MASCOTAI DISCLAIMS ALL
        WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR
        A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AVAILABILITY,
        AND RESULTS. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
        SECURE, ERROR-FREE, OR THAT GENERATED CODE OR ASSETS WILL WORK IN EVERY
        BROWSER, FRAMEWORK, DEVICE, OR APP STORE.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MASCOTAI AND ITS AFFILIATES,
          SUPPLIERS, AND PERSONNEL WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST
          PROFITS, REVENUE, DATA, GOODWILL, BUSINESS OPPORTUNITY, OR COST OF
          SUBSTITUTE SERVICES, EVEN IF ADVISED THAT SUCH DAMAGES ARE POSSIBLE.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY ARISING
          OUT OF OR RELATING TO THE SERVICE OR THESE TERMS WILL NOT EXCEED THE
          GREATER OF (A) US$100 OR (B) THE AMOUNT YOU PAID MASCOTAI FOR THE
          SERVICE DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE
          CLAIM. THESE LIMITS APPLY TO THE FULLEST EXTENT PERMITTED AND DO NOT
          EXCLUDE LIABILITY THAT CANNOT LAWFULLY BE LIMITED.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    content: (
      <p>
        If you use the Service on behalf of a business, you will defend,
        indemnify, and hold harmless MascotAI and its affiliates, suppliers, and
        personnel from third-party claims, losses, liabilities, damages, and
        reasonable legal fees arising from Your Content, your products or use
        of outputs, your violation of these Terms, or your infringement or
        violation of another person&apos;s rights. This obligation does not
        apply to the extent a claim results from MascotAI&apos;s own unlawful
        conduct.
      </p>
    ),
  },
  {
    id: "disputes",
    title: "Disputes and general terms",
    content: (
      <>
        <p>
          Before filing a formal claim, you agree to contact us and try in good
          faith to resolve the dispute informally for at least 30 days. Nothing
          here prevents either party from seeking urgent injunctive relief or
          using an eligible small-claims process.
        </p>
        <p>
          These Terms, together with the Privacy Policy and any checkout terms
          presented to you, are the entire agreement about the Service and
          supersede prior discussions on that subject. If a provision is
          unenforceable, it will be modified only as much as necessary and the
          remaining provisions will remain effective. Our failure to enforce a
          provision is not a waiver. You may not assign these Terms without our
          consent; we may assign them in connection with a reorganization,
          financing, or transfer of the Service.
        </p>
      </>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    content: (
      <>
        <p>
          We may update these Terms as the Service changes. We will post the
          revised Terms, update the date above, and provide additional notice
          for material changes when required. Changes apply prospectively. By
          continuing to use the Service after revised Terms take effect, you
          agree to them.
        </p>
        <p>
          Questions, notices, and informal dispute requests may be sent to
          MascotAI at{" "}
          <a className={legalLinkClass} href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          .
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Built for shipping"
      title="Terms of Service"
      summary="These terms cover the complete MascotAI workflow: describing a character, choosing an AI model, spending generation tokens, saving and downloading assets, and licensing a marketplace mascot."
      effectiveDate={EFFECTIVE_DATE}
      sections={sections}
    />
  );
}
