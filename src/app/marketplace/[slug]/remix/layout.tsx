import { Suspense } from "react";
import { PageShellSkeleton } from "@/components/skeletons";

export default function MarketplaceRemixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>{children}</Suspense>
  );
}
