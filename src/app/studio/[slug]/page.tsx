import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isAdminUser } from "@/lib/admin";
import {
  getMascot,
  isPublicExampleSlug,
  PUBLIC_EXAMPLE_SLUGS,
  type MascotSlug,
} from "@/lib/mascots";
import { loadExampleMarketplacePack } from "@/lib/marketplace/example-packs";
import { studioMetadata, studioSoftwareJsonLd } from "@/lib/seo";
import { normalizeGeneratedMascot } from "@/lib/studio-utils";
import { StudioClient } from "./studio-client";

const GENERATED_STUDIO_SLUGS = new Set<MascotSlug>([
  "granary",
  "nox",
  "zest",
  "quill",
  "pip",
  "bolt",
  "relay",
  "orbit",
  "brew",
  "shade",
  "watt",
  "arc",
  "aura",
  "glint",
  "trove",
  "zephyr",
]);

/** Admin-only slugs are not prebuilt; resolve on demand after the auth gate. */
export const dynamicParams = true;

export function generateStaticParams() {
  return PUBLIC_EXAMPLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mascot = getMascot(slug);
  if (!mascot) return { title: "Studio" };
  if (!isPublicExampleSlug(slug)) {
    if (!(await isAdminUser())) {
      return { title: "Studio", robots: { index: false, follow: false } };
    }
    return {
      ...studioMetadata(mascot),
      robots: { index: false, follow: false },
    };
  }
  return studioMetadata(mascot);
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mascot = getMascot(slug);
  if (!mascot) notFound();

  const isPublic = isPublicExampleSlug(mascot.slug);
  if (!isPublic && !(await isAdminUser())) {
    notFound();
  }

  const isGeneratedStudio = GENERATED_STUDIO_SLUGS.has(mascot.slug);
  const examplePack = isGeneratedStudio
    ? await loadExampleMarketplacePack(mascot.slug)
    : undefined;
  const initialMascot = examplePack
    ? normalizeGeneratedMascot(examplePack, examplePack.gestures)
    : undefined;

  return (
    <div className="relative min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      {isPublic ? <JsonLd data={studioSoftwareJsonLd(mascot)} /> : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[820px] bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.16),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.12),transparent_50%)]" />
      <div className="relative">
        <SiteHeader />
        <noscript>
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-12">
            <p className="text-2xl font-semibold">
              {mascot.name} studio — {mascot.tagline}
            </p>
            <p className="mt-3 max-w-xl text-[var(--brand-muted)]">
              {mascot.blurb}
            </p>
            <p className="mt-2 text-sm text-white/50">
              Built for {mascot.product}. {mascot.poseCount} interactive
              gestures. Enable JavaScript to explore the live studio.
            </p>
          </div>
        </noscript>
        <main>
          <StudioClient slug={mascot.slug} initialMascot={initialMascot} />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
