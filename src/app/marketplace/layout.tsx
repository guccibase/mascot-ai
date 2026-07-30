import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Marketplace",
  description:
    "Browse ready-made animated SVG mascot packs. Preview themes, gestures, and parts, then remix or buy to own.",
  path: "/marketplace",
});

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
