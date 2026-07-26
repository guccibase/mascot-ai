import type { ExamplePose } from "@/lib/example-poses/types";
import { restoreSharedCss } from "@/lib/example-poses/types";
import { indexSvg, toManifestRows } from "./element-index";
import type { IndexedElement, ManifestRow, PoseElements } from "./types";

/**
 * Index every selected pose and mark elements shared when the same content
 * hash appears in all of them. Those get edited once in the identity call.
 */
export function indexPosePack(
  poses: ExamplePose[],
  css: string,
  selectedKeys: string[]
): {
  indexed: PoseElements[];
  sharedManifest: ManifestRow[];
  variantManifests: Record<string, ManifestRow[]>;
} {
  const selected = poses.filter((p) => selectedKeys.includes(p.key));
  const indexed: PoseElements[] = selected.map((pose) => {
    const full = restoreSharedCss(pose.svg, css);
    const { svg, elements } = indexSvg(full);
    return { key: pose.key, svg, elements };
  });

  const hashCounts = new Map<string, number>();
  for (const pose of indexed) {
    const seen = new Set<string>();
    for (const el of pose.elements) {
      if (!seen.has(el.id)) {
        seen.add(el.id);
        hashCounts.set(el.id, (hashCounts.get(el.id) ?? 0) + 1);
      }
    }
  }

  const poseCount = indexed.length;
  for (const pose of indexed) {
    for (const el of pose.elements) {
      el.shared = (hashCounts.get(el.id) ?? 0) === poseCount;
    }
  }

  const sharedIds = new Set<string>();
  for (const pose of indexed) {
    for (const el of pose.elements) {
      if (el.shared) sharedIds.add(el.id);
    }
  }

  const sharedManifest = toManifestRows(
    indexed[0]?.elements.filter((e) => sharedIds.has(e.id)) ?? []
  );

  const variantManifests: Record<string, ManifestRow[]> = {};
  for (const pose of indexed) {
    variantManifests[pose.key] = toManifestRows(
      pose.elements.filter((e) => !e.shared)
    );
  }

  return { indexed, sharedManifest, variantManifests };
}

/** Dedupe shared manifest rows across poses (same id may differ slightly in paint). */
export function mergeSharedManifest(rows: ManifestRow[]): ManifestRow[] {
  const byId = new Map<string, ManifestRow>();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

export function collectAllElements(indexed: PoseElements[]): IndexedElement[] {
  const out: IndexedElement[] = [];
  const seen = new Set<string>();
  for (const pose of indexed) {
    for (const el of pose.elements) {
      const key = `${pose.key}:${el.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(el);
    }
  }
  return out;
}
