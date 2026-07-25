import Link from "next/link";
import { notFound } from "next/navigation";
import { getMascot, type MascotSlug } from "@/lib/mascots";
import { StudioClient } from "./studio-client";

const SLUGS: MascotSlug[] = ["lyra", "sol", "bud", "fanous"];

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mascot = getMascot(slug);
  if (!mascot) return { title: "Studio" };
  return {
    title: `${mascot.name} studio · MascotAI`,
    description: mascot.blurb,
  };
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
      <div className="absolute left-4 top-4 z-50 flex gap-2 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
        >
          ← Home
        </Link>
        <Link
          href="/create"
          className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
        >
          Create yours
        </Link>
      </div>
      <StudioClient slug={mascot.slug} />
    </div>
  );
}
