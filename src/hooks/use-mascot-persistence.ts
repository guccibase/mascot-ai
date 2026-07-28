"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { GeneratedMascot } from "@/lib/types";

export type MascotSaveMeta = {
  look?: string;
  productContext?: string;
  personality?: string;
  model?: string;
  source?: "created" | "purchased" | "remixed";
  sourceListingId?: Id<"marketplaceListings">;
};

/**
 * Serializes mascot saves (latest-wins) and keeps mascotId in a ref so
 * concurrent edits never create duplicate inserts.
 */
export function useMascotPersistence(initialId?: Id<"mascots"> | null) {
  const saveMascot = useMutation(api.mascots.save);
  const removeMascot = useMutation(api.mascots.remove);
  const mascotIdRef = useRef<Id<"mascots"> | null>(initialId ?? null);
  const [mascotId, setMascotId] = useState<Id<"mascots"> | null>(
    initialId ?? null
  );
  const [saving, setSaving] = useState(false);
  const metaRef = useRef<MascotSaveMeta>({});
  const latestPackRef = useRef<GeneratedMascot | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingCountRef = useRef(0);

  const setMeta = useCallback((meta: MascotSaveMeta) => {
    metaRef.current = meta;
  }, []);

  const bindId = useCallback((id: Id<"mascots"> | null) => {
    mascotIdRef.current = id;
    setMascotId(id);
  }, []);

  const persist = useCallback(
    (pack: GeneratedMascot): Promise<Id<"mascots">> => {
      latestPackRef.current = pack;
      pendingCountRef.current += 1;
      setSaving(true);

      const run = chainRef.current.then(async () => {
        const toSave = latestPackRef.current;
        if (!toSave) {
          if (!mascotIdRef.current) {
            throw new Error("Nothing to save");
          }
          return mascotIdRef.current;
        }
        const meta = metaRef.current;
        const id = await saveMascot({
          mascotId: mascotIdRef.current ?? undefined,
          look: meta.look,
          productContext: meta.productContext,
          personality: meta.personality,
          model: meta.model,
          source: mascotIdRef.current ? undefined : meta.source,
          sourceListingId: mascotIdRef.current
            ? undefined
            : meta.sourceListingId,
          pack: toSave,
        });
        mascotIdRef.current = id;
        setMascotId(id);
        return id;
      });

      chainRef.current = run.then(
        () => undefined,
        () => undefined
      );

      return run.finally(() => {
        pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
        if (pendingCountRef.current === 0) setSaving(false);
      });
    },
    [saveMascot]
  );

  const persistSafe = useCallback(
    (pack: GeneratedMascot) => {
      void persist(pack).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn’t save");
      });
    },
    [persist]
  );

  const discard = useCallback(async () => {
    const id = mascotIdRef.current;
    if (!id) return;
    await removeMascot({ mascotId: id });
    bindId(null);
    latestPackRef.current = null;
  }, [bindId, removeMascot]);

  return {
    mascotId,
    saving,
    setMeta,
    bindId,
    persist,
    persistSafe,
    discard,
  };
}
