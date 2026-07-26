import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { getMascot, type MascotSlug } from "@/lib/mascots";
import { studioMetadata, studioSoftwareJsonLd } from "@/lib/seo";
import { StudioClient } from "./studio-client";

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
  if (!mascot) return { title: "Studio" };
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

  return (
    <div className="relative min-h-screen bg-[#0a0e18]">
      <JsonLd data={studioSoftwareJsonLd(mascot)} />
      <nav
        aria-label="Studio"
        className="relative z-50 flex gap-2 px-4 pt-4 sm:px-6 sm:pt-6"
      >
        <Link
          href="/"
          className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
        >
          ← Home
        </Link>
        <Link
          href={`/remix/${mascot.slug}`}
          className="rounded-full border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--brand-accent)] backdrop-blur hover:bg-[var(--brand-accent)]/20"
        >
          Remix this
        </Link>
        <Link
          href="/create"
          className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
        >
          Create yours
        </Link>
      </nav>
      <noscript>
        <div className="px-6 py-10 text-white">
          <p className="text-2xl font-semibold">
            {mascot.name} studio — {mascot.tagline}
          </p>
          <p className="mt-3 max-w-xl text-white/70">{mascot.blurb}</p>
          <p className="mt-2 text-sm text-white/50">
            Built for {mascot.product}. {mascot.poseCount} interactive gestures.
            Enable JavaScript to explore the live studio.
          </p>
        </div>
      </noscript>
      <main>
        <StudioClient slug={mascot.slug} />
      </main>
    </div>
  );
}
