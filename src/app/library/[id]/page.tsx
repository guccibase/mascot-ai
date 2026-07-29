"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { GeneratedStudio } from "@/components/generated-studio";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StudioPageSkeleton } from "@/components/skeletons";
import { useMascotPersistence } from "@/hooks/use-mascot-persistence";
import { toGeneratedMascot } from "@/lib/mascot-pack";
import { ownedStudioCapabilitiesForSource } from "@/lib/studio-capabilities";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { GeneratedMascot, MascotModelId } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default function LibraryMascotPage({ params }: Props) {
  const { id } = use(params);
  const mascotId = id as Id<"mascots">;
  const saved = useQuery(api.mascots.getMine, { mascotId });
  const { saving, setMeta, persistSafe, bindId } = useMascotPersistence(mascotId);
  const [pack, setPack] = useState<GeneratedMascot | null>(null);
  const [hydrateFailed, setHydrateFailed] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    bindId(mascotId);
  }, [mascotId, bindId]);

  useEffect(() => {
    hydratedFor.current = null;
    setPack(null);
    setHydrateFailed(false);
  }, [mascotId]);

  useEffect(() => {
    if (!saved) return;
    setMeta({
      look: saved.look,
      productContext: saved.productContext,
      personality: saved.personality,
      model: saved.model,
    });
  }, [saved, setMeta]);

  // Hydrate local pack once per mascot id. Never clobber in-flight edits
  // when the reactive query refreshes after our own save.
  useEffect(() => {
    if (saved === undefined || saved === null) return;
    if (!saved.pack) {
      setHydrateFailed(true);
      return;
    }
    if (hydratedFor.current === mascotId) return;
    try {
      setPack(toGeneratedMascot(saved.pack));
      hydratedFor.current = mascotId;
      setHydrateFailed(false);
    } catch (err) {
      console.error(err);
      setPack(null);
      setHydrateFailed(true);
    }
  }, [saved, mascotId]);

  if (saved === undefined || (saved !== null && !pack && !hydrateFailed)) {
    return <StudioPageSkeleton variant="site-header" />;
  }

  if (saved === null || !pack || hydrateFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0e18] text-white">
        <p>Mascot not found</p>
        <Link href="/library" className="text-[var(--brand-accent)] underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <SiteHeader />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
        <Link
          href="/library"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          ← Library
        </Link>
        <Link
          href={`/library/${mascotId}/remix`}
          className="rounded-full border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/20"
        >
          Remix
        </Link>
        {saving && (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-muted)]">
            <Loader2 className="size-3 animate-spin" />
            Saving…
          </span>
        )}
      </div>
      <GeneratedStudio
        mascot={pack}
        look={saved.look}
        model={(saved.model as MascotModelId | undefined) ?? undefined}
        mascotId={mascotId}
        capabilities={ownedStudioCapabilitiesForSource(saved.source)}
        onMascotChange={(next) => {
          setPack(next);
          persistSafe(next);
        }}
        fullPage
      />
      <SiteFooter />
    </div>
  );
}
