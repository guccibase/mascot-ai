"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { PageShellSkeleton } from "@/components/skeletons";
import { RemixClient } from "@/app/remix/[slug]/remix-client";
import { toGeneratedMascot } from "@/lib/mascot-pack";
import { packToRemixSource } from "@/lib/remix/from-pack";
import { indexPosePack } from "@/lib/remix/cross-pose";
import { stripAnimationsForThumbnail } from "@/lib/remix/contract";
import { restoreSharedCss } from "@/lib/example-poses/types";
import { api } from "../../../../../convex/_generated/api";

type Props = { params: Promise<{ slug: string }> };

export default function MarketplaceRemixPage({ params }: Props) {
  const { slug } = use(params);
  const listing = useQuery(api.marketplace.getBySlug, { slug });

  const [now] = useState(() => Date.now());
  const unlock = useQuery(
    api.marketplace.getActiveRemixUnlock,
    listing?._id ? { listingId: listing._id, now } : "skip"
  );

  const prepared = useMemo(() => {
    if (!listing?.pack) return null;
    const pack = toGeneratedMascot(listing.pack);
    const source = packToRemixSource(pack);
    const allKeys = source.poses.map((p) => p.key);
    const { sharedManifest, variantManifests } = indexPosePack(
      source.poses,
      source.css,
      allKeys
    );
    return {
      sourceName: pack.name,
      poses: source.poses.map((pose) => ({
        key: pose.key,
        label: pose.label,
        cat: pose.cat,
        tip: pose.tip,
        use: pose.use,
        track: pose.track,
        thumb: stripAnimationsForThumbnail(
          restoreSharedCss(pose.svg, source.css)
        ),
      })),
      payloadHint: {
        sharedManifestChars: JSON.stringify(sharedManifest).length,
        perPoseChars: Object.fromEntries(
          allKeys.map((key) => [
            key,
            JSON.stringify(variantManifests[key] ?? []).length,
          ])
        ),
        gesturePayloadChars:
          source.poses.reduce((sum, pose) => sum + pose.svg.length, 0) +
          source.css.length +
          4_000,
      },
    };
  }, [listing]);

  if (listing === undefined || unlock === undefined) {
    return <PageShellSkeleton />;
  }

  if (!listing || !prepared) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--brand-bg)] text-[var(--brand-ink)]">
        <p>Listing unavailable</p>
        <Link
          href={`/marketplace/${slug}`}
          className="text-[var(--brand-accent)] underline"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  // Convex unlock query is the source of truth (ignores forged ?orderId=).
  const verifiedOrderId = unlock?.orderId ?? null;
  if (!verifiedOrderId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--brand-bg)] text-[var(--brand-ink)]">
        <p>Remix unlock required</p>
        <p className="max-w-md text-center text-sm text-[var(--brand-muted)]">
          Purchase a $4.99 remix license for this listing, then return here.
        </p>
        <Link
          href={`/marketplace/${slug}`}
          className="text-[var(--brand-accent)] underline"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <RemixClient
      source={{
        kind: "listing",
        listingId: listing._id,
        remixOrderId: verifiedOrderId,
      }}
      sourceName={prepared.sourceName}
      poses={prepared.poses}
      brief={null}
      payloadHint={prepared.payloadHint}
    />
  );
}
