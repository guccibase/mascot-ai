import { Suspense } from "react";
import { PageShellSkeleton } from "@/components/skeletons";

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageShellSkeleton />}>{children}</Suspense>
  );
}
