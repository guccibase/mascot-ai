import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { buildPageMetadata } from "@/lib/seo";
import { api } from "../../../../convex/_generated/api";
import { MarketplaceListingPreview } from "./listing-preview";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// Keep the pack out of the initial response. Only the live browser query
// supplies data to the interactive preview.
const getListingSummary = cache(async (slug: string) => {
  const listing = await fetchQuery(api.marketplace.getBySlug, { slug });
  if (listing === null) notFound();

  const { name, gestureCount } = listing;
  const description =
    listing.description.trim() ||
    listing.tagline.trim() ||
    `Preview the themes and animated SVG gestures in the ${name} mascot pack.`;

  return { slug: listing.slug, name, description, gestureCount };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingSummary(slug);
  return buildPageMetadata({
    title: `${listing.name} Animated SVG Mascot Pack`,
    description: listing.description,
    path: `/marketplace/${listing.slug}`,
  });
}

export default async function MarketplaceListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingSummary(slug);
  return <MarketplaceListingPreview {...listing} />;
}
