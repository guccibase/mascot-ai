import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShellSkeleton } from "@/components/skeletons";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildPageMetadata({
    title: "Remix marketplace mascot",
    description: "Remix a marketplace mascot you unlocked.",
    path: `/marketplace/${slug}/remix`,
    index: false,
  });
}

export default function MarketplaceRemixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>{children}</Suspense>
  );
}
