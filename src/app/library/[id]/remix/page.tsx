"use client";

import { use, useMemo } from "react";
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
import type { Id } from "../../../../../convex/_generated/dataModel";

type Props = { params: Promise<{ id: string }> };

export default function LibraryRemixPage({ params }: Props) {
  const { id } = use(params);
  const mascotId = id as Id<"mascots">;
  const saved = useQuery(api.mascots.getMine, { mascotId });

  const prepared = useMemo(() => {
    if (!saved?.pack) return null;
    const pack = toGeneratedMascot(saved.pack);
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
  }, [saved]);

  if (saved === undefined) {
    return <PageShellSkeleton />;
  }

  if (saved === null || !prepared) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--brand-bg)] text-[var(--brand-ink)]">
        <p>Mascot not found</p>
        <Link href="/library" className="text-[var(--brand-accent)] underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <RemixClient
      source={{ kind: "mascot", mascotId }}
      sourceName={prepared.sourceName}
      poses={prepared.poses}
      brief={null}
      payloadHint={prepared.payloadHint}
    />
  );
}
