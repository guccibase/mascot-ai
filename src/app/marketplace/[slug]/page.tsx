"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { StudioPageSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { GeneratedStudio } from "@/components/generated-studio";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { toGeneratedMascot } from "@/lib/mascot-pack";
import { formatUsdCents } from "@/lib/marketplace/format";
import { api } from "../../../../convex/_generated/api";

type Props = { params: Promise<{ slug: string }> };

export default function MarketplaceListingPage({ params }: Props) {
  const { slug } = use(params);
  const { isSignedIn } = useAuth();
  const listing = useQuery(api.marketplace.getBySlug, { slug });
  const ensureUser = useMutation(api.users.ensure);
  const createCheckout = useAction(api.marketplaceStripe.createCheckoutSession);
  const [busy, setBusy] = useState<"remix" | "buy" | null>(null);
  // Coarse clock so unlock expiry stays deterministic in the query.
  const [now] = useState(() => Date.now());

  /**
   * The preview plays the exact pack a remix or a purchase delivers. Rendering
   * anything else here (an example's own studio component, say) would show
   * themes and controls the buyer's copy does not have.
   */
  const pack = useMemo(() => {
    if (!listing?.pack) return null;
    try {
      return toGeneratedMascot(listing.pack);
    } catch {
      return null;
    }
  }, [listing]);

  const unlock = useQuery(
    api.marketplace.getActiveRemixUnlock,
    listing?._id ? { listingId: listing._id, now } : "skip"
  );

  const startCheckout = async (sku: "remix" | "buy_to_own") => {
    if (!listing) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(`/marketplace/${slug}`)}`;
      return;
    }
    setBusy(sku === "remix" ? "remix" : "buy");
    try {
      await ensureUser({});
      const { url } = await createCheckout({
        listingId: listing._id,
        sku,
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBusy(null);
    }
  };

  // Wait for unlock so the CTA doesn't flash "Remix $…" → "Continue remix".
  if (listing === undefined || (listing && unlock === undefined)) {
    return <StudioPageSkeleton variant="site-header" />;
  }

  if (listing === null || !pack) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0e18] text-white">
        <p>This mascot is no longer available</p>
        <Link href="/marketplace" className="text-[var(--brand-accent)] underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <SiteHeader />
      {/* Toolbar only — GeneratedStudio owns the title (avoids double headers). */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
        <Link
          href="/marketplace"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ← Marketplace
        </Link>
        {unlock ? (
          <Link
            href={`/marketplace/${slug}/remix?orderId=${unlock.orderId}`}
            className="inline-flex h-8 items-center justify-center rounded-full bg-[var(--brand-accent)] px-3 text-xs font-semibold text-[#12141c] hover:bg-[var(--brand-accent)]/90"
          >
            Continue remix
          </Link>
        ) : (
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={() => void startCheckout("remix")}
            className="h-8 rounded-full bg-[var(--brand-accent)] px-3 text-xs font-semibold text-[#12141c] hover:bg-[var(--brand-accent)]/90"
          >
            {busy === "remix" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              `Remix ${formatUsdCents(listing.remixPriceCents)}`
            )}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null || listing.status !== "available"}
          onClick={() => void startCheckout("buy_to_own")}
          className="h-8 rounded-full border-white/20 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10"
        >
          {busy === "buy" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            `Buy & own ${formatUsdCents(listing.buyToOwnPriceCents)}`
          )}
        </Button>
        {listing.status === "reserved" && (
          <p className="basis-full text-xs text-amber-300/90">
            Someone has a buy-to-own checkout in progress. Remix is still
            available; exclusive buy may reopen if they abandon it.
          </p>
        )}
      </div>
      <GeneratedStudio
        mascot={pack}
        fullPage
        capabilities={{ export: false, edit: false, appAssets: false }}
      />
      <SiteFooter />
    </div>
  );
}
