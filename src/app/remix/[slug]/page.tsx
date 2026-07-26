import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { briefForSlug } from "@/lib/create-field-placeholders";
import { loadPosePack } from "@/lib/example-poses";
import { restoreSharedCss } from "@/lib/example-poses/types";
import { indexPosePack } from "@/lib/remix/cross-pose";
import { stripAnimationsForThumbnail } from "@/lib/remix/contract";
import { getMascot, type MascotSlug } from "@/lib/mascots";
import { buildPageMetadata } from "@/lib/seo";
import { RemixClient } from "./remix-client";

const SLUGS: MascotSlug[] = ["lyra", "sol", "bud", "fanous"];

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mascot = getMascot(slug);
  if (!mascot) return { title: "Remix" };
  return buildPageMetadata({
    title: `Remix ${mascot.name}`,
    description: `Start from the ${mascot.name} example and reshape it into your own mascot.`,
    path: `/remix/${mascot.slug}`,
    index: false,
  });
}

export default async function RemixPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getMascot(slug);
  if (!meta || !SLUGS.includes(slug as MascotSlug)) notFound();

  const pack = await loadPosePack(slug as MascotSlug);
  const allKeys = pack.poses.map((pose) => pose.key);
  const { sharedManifest, variantManifests } = indexPosePack(
    pack.poses,
    pack.css,
    allKeys
  );
  const payloadHint = {
    sharedManifestChars: JSON.stringify(sharedManifest).length,
    perPoseChars: Object.fromEntries(
      allKeys.map((key) => [
        key,
        JSON.stringify(variantManifests[key] ?? []).length,
      ])
    ) as Record<string, number>,
    /** Proxy for post-remix `/api/generate/gesture` metering. */
    gesturePayloadChars:
      pack.poses.reduce((sum, pose) => sum + pose.svg.length, 0) +
      pack.css.length +
      4_000,
  };

  const poses = pack.poses.map((pose) => ({
    key: pose.key,
    label: pose.label,
    cat: pose.cat,
    tip: pose.tip,
    use: pose.use,
    track: pose.track,
    thumb: stripAnimationsForThumbnail(restoreSharedCss(pose.svg, pack.css)),
  }));

  const brief = briefForSlug(slug as MascotSlug);

  return (
    <RemixClient
      slug={slug as MascotSlug}
      exampleName={meta.name}
      poses={poses}
      brief={brief ?? null}
      payloadHint={payloadHint}
    />
  );
}
