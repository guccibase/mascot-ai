import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildPageMetadata({
    title: "Marketplace listing",
    description:
      "Preview this ready-made animated SVG mascot pack — themes, gestures, and parts.",
    path: `/marketplace/${slug}`,
  });
}

export default function MarketplaceListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
