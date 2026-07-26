import { getMascot } from "@/lib/mascots";
import { loadPosePack } from "@/lib/example-poses";
import { annotateStudioContract } from "@/lib/remix/contract";
import { indexPosePack } from "@/lib/remix/cross-pose";
import { applyPaletteMap, collectPalette, sanitizePalette } from "@/lib/remix/palette";
import { applyEdits, mergeEdits, preservationGate } from "@/lib/remix/patch";
import type { GestureRequest, GeneratedGesture } from "@/lib/types";
import type { MascotSlug } from "@/lib/mascots";
import type { PoseElements } from "./types";

export type RemixBuildResult = {
  gestures: GeneratedGesture[];
  warnings: string[];
  skippedGestures: string[];
};

/**
 * Apply identity + per-pose remix results to indexed SVGs, run the
 * preservation gate, and stamp the ms- studio contract.
 */
export function buildRemixGestures(args: {
  slug: MascotSlug;
  indexed: PoseElements[];
  gestureRequests: GestureRequest[];
  sharedEdits: import("./types").RemixEdit[];
  palette: Record<string, string>;
  poseResults: Map<
    string,
    { edits: import("./types").RemixEdit[]; track?: boolean; delight?: boolean; signal?: number }
  >;
  originalPoses: Array<{ key: string; track: boolean; signal: number }>;
}): RemixBuildResult {
  const warnings: string[] = [];
  const skippedGestures: string[] = [];
  const gestures: GeneratedGesture[] = [];
  const reqByKey = new Map(args.gestureRequests.map((g) => [g.key, g]));

  for (const pose of args.indexed) {
    const req = reqByKey.get(pose.key);
    if (!req) continue;

    const poseResult = args.poseResults.get(pose.key);
    const merged = mergeEdits(args.sharedEdits, poseResult?.edits ?? []);

    let svg = applyPaletteMap(pose.svg, args.palette);
    const before = svg;

    const patched = applyEdits(svg, merged);
    svg = patched.svg;
    warnings.push(...patched.skipped.map((s) => `${pose.key}: ${s}`));

    if (!preservationGate(before, svg)) {
      warnings.push(`${pose.key}: preservation gate failed; pose skipped`);
      skippedGestures.push(pose.key);
      continue;
    }

    svg = annotateStudioContract(svg, args.slug);

    const orig = args.originalPoses.find((p) => p.key === pose.key);
    gestures.push({
      key: req.key,
      label: req.label,
      cat: req.cat,
      tip: req.tip,
      use: req.use,
      svg,
      track: poseResult?.track ?? orig?.track,
      delight: poseResult?.delight,
      signal: poseResult?.signal ?? orig?.signal,
    });
  }

  return { gestures, warnings, skippedGestures };
}

export async function loadRemixSource(slug: MascotSlug) {
  const meta = getMascot(slug);
  if (!meta) return null;
  const pack = await loadPosePack(slug);
  return { meta, pack };
}

export function measureRemixPayload(args: {
  sharedManifest: unknown[];
  variantManifests: Record<string, unknown[]>;
  briefChars: number;
}): number {
  let chars = args.briefChars;
  chars += JSON.stringify(args.sharedManifest).length;
  for (const rows of Object.values(args.variantManifests)) {
    chars += JSON.stringify(rows).length;
  }
  return chars;
}

export function prepareRemixIndex(
  pack: Awaited<ReturnType<typeof loadPosePack>>,
  selectedKeys: string[]
) {
  const { indexed, sharedManifest, variantManifests } = indexPosePack(
    pack.poses,
    pack.css,
    selectedKeys
  );
  const paletteEntries = collectPalette(
    indexed.map((p) => p.svg)
  );
  return { indexed, sharedManifest, variantManifests, paletteEntries };
}
