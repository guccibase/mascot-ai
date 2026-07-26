"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { GeneratedStudio } from "@/components/generated-studio";
import { useMascotPersistence } from "@/hooks/use-mascot-persistence";
import { toGeneratedMascot } from "@/lib/mascot-pack";
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
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    bindId(mascotId);
  }, [mascotId, bindId]);

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
    if (!saved?.pack) return;
    if (hydratedFor.current === mascotId) return;
    try {
      setPack(toGeneratedMascot(saved.pack));
      hydratedFor.current = mascotId;
    } catch (err) {
      console.error(err);
      setPack(null);
    }
  }, [saved, mascotId]);

  if (saved === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e18] text-white/70">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (saved === null || !pack) {
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
    <div className="relative min-h-screen bg-[#0a0e18]">
      <div className="absolute left-4 top-4 z-50 flex gap-2 sm:left-6 sm:top-6">
        <Link
          href="/library"
          className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
        >
          ← Library
        </Link>
        {saving && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
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
        onMascotChange={(next) => {
          setPack(next);
          persistSafe(next);
        }}
        fullPage
      />
    </div>
  );
}
