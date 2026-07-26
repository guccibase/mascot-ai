import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";
import { PLANS } from "../../../convex/lib/plans";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "MascotAI plans and token top-ups. Every plan includes OpenAI and Anthropic models. Pay only for what you generate.",
  path: "/pricing",
});

function pricingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: SITE_NAME,
    description:
      "Animated SVG mascot generation with token-based plans for web and mobile apps.",
    brand: { "@type": "Brand", name: SITE_NAME },
    url: absoluteUrl("/pricing"),
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      url: absoluteUrl("/pricing"),
      availability: "https://schema.org/InStock",
      description: `${plan.tokensPerCycle.toLocaleString()} tokens per ${plan.cycle}. Price shown at checkout.`,
    })),
  };
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={pricingJsonLd()} />
      {children}
    </>
  );
}
