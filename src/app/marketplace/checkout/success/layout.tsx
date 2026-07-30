import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShellSkeleton } from "@/components/skeletons";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout complete",
  description: "Your marketplace purchase is being confirmed.",
  path: "/marketplace/checkout/success",
  index: false,
});

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>{children}</Suspense>
  );
}
