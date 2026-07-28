"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { SiteHeader } from "@/components/site-header";
import { CheckoutConfirmSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function MarketplaceCheckoutSuccessPage() {
  const params = useSearchParams();
  const orderId = params.get("orderId") as Id<"marketplaceOrders"> | null;
  const confirm = useAction(api.marketplaceStripe.confirmOrder);
  const order = useQuery(
    api.marketplace.getMyOrder,
    orderId ? { orderId } : "skip"
  );
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setConfirmError("Missing order id");
      setConfirming(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const run = async () => {
      try {
        const result = await confirm({ orderId });
        if (cancelled) return;
        if (result.status === "fulfilled") {
          setConfirming(false);
          return;
        }
        attempts += 1;
        if (attempts < 8) {
          window.setTimeout(() => {
            void run();
          }, 1500);
        } else {
          setConfirming(false);
        }
      } catch (err) {
        if (!cancelled) {
          setConfirmError(
            err instanceof Error ? err.message : "Confirm failed"
          );
          setConfirming(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [confirm, orderId]);

  const status = order?.status;
  const fulfilled = status === "fulfilled";
  // Confirm can finish before the reactive order query arrives — keep the
  // skeleton up so the main column never goes blank.
  const loading =
    !confirmError &&
    !fulfilled &&
    Boolean(orderId) &&
    (confirming || order === undefined);

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-5 py-20 text-center">
        {loading && <CheckoutConfirmSkeleton />}

        {(confirmError || !orderId) && (
          <>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              Something went wrong
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              {confirmError ?? "Missing order"}
            </p>
            <Link
              href="/marketplace"
              className={cn(
                buttonVariants(),
                "mt-8 bg-[var(--brand-accent)] text-[#12141c]"
              )}
            >
              Back to marketplace
            </Link>
          </>
        )}

        {fulfilled && order?.sku === "buy_to_own" && (
          <>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              It&apos;s yours
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              The mascot was added to your library. Download, edit, and remix
              anytime.
            </p>
            <Link
              href={
                order.buyerMascotId
                  ? `/library/${order.buyerMascotId}`
                  : "/library"
              }
              className={cn(
                buttonVariants(),
                "mt-8 bg-[var(--brand-accent)] text-[#12141c]"
              )}
            >
              Open in library
            </Link>
          </>
        )}

        {fulfilled && order?.sku === "remix" && (
          <>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              Remix unlocked
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              You have 24 hours to run the remix flow. Generation still uses
              your plan tokens.
            </p>
            <Link
              href={
                order.listingSlug
                  ? `/marketplace/${order.listingSlug}/remix?orderId=${orderId}`
                  : "/marketplace"
              }
              className={cn(
                buttonVariants(),
                "mt-8 bg-[var(--brand-accent)] text-[#12141c]"
              )}
            >
              Start remix
            </Link>
          </>
        )}

        {!loading && !confirmError && orderId && status && !fulfilled && (
          <>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              Payment processing
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              Status: {status}. Refresh in a moment if this doesn&apos;t
              update.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
