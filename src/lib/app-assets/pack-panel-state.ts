import type { AppAssetKind } from "@/lib/app-assets/catalog";

export type PackPanelSample = { id: string; label: string; url: string };

export type PackPanelFile = {
  path: string;
  label: string;
  url: string;
  bytes: number;
  mediaType: string;
};

export type PackPanelSnapshot = {
  samples: PackPanelSample[];
  selectedSampleId: string | null;
  files: PackPanelFile[];
  styleDescription: string;
  kinds: AppAssetKind[];
};

/** Icon preview dialog must only mount while a sample is expanded. */
export function shouldMountIconPreviewDialog(
  expandedSampleId: string | null
): boolean {
  return expandedSampleId != null;
}

/**
 * Decide how to load a previous pack into the panel.
 * - `sync`: same pack already in memory — re-apply without clearing (no empty flash)
 * - `async`: need to wait for/query hydrate after clearing local state
 */
export function resolvePackLoadStrategy(args: {
  targetPackId: string;
  activePackId: string | null | undefined;
}): "sync" | "async" {
  return args.activePackId != null && args.activePackId === args.targetPackId
    ? "sync"
    : "async";
}

export function snapshotFromActivePack(pack: {
  sampleOptions: PackPanelSample[];
  selectedSampleId?: string | null;
  files: PackPanelFile[];
  styleDescription?: string | null;
  kinds: readonly AppAssetKind[] | AppAssetKind[];
}): PackPanelSnapshot {
  return {
    samples: pack.sampleOptions,
    selectedSampleId: pack.selectedSampleId ?? null,
    files: pack.files,
    styleDescription: pack.styleDescription ?? "",
    kinds: [...pack.kinds],
  };
}
