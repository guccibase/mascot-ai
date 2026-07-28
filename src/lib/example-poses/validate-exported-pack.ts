import { MAX_PACK_JSON_BYTES } from "../../../convex/lib/marketplace";
import { restoreSharedCss } from "./types";
import type { PosePack } from "./types";

/** Leave room for listing fields + duplicated previewSvg on the Convex doc. */
const LISTING_OVERHEAD_BYTES = 64_000;

export type PackExportReport = {
  slug: string;
  poseCount: number;
  bytes: number;
  restoredBytes: number;
  cssBytes: number;
};

const VIEWBOX_RE = /viewBox\s*=\s*["']0\s+0\s+420\s+520["']/i;

/** Validate an exported pose pack before writing or uploading. */
export function validateExportedPosePack(pack: PosePack): PackExportReport {
  if (!pack.slug?.trim()) {
    throw new Error("Exported pack is missing slug");
  }
  if (!Array.isArray(pack.poses) || pack.poses.length === 0) {
    throw new Error("Exported pack has no poses");
  }

  const keys = new Set<string>();
  for (const pose of pack.poses) {
    if (!pose.key?.trim()) {
      throw new Error("Every pose needs a key");
    }
    if (keys.has(pose.key)) {
      throw new Error(`Duplicate pose key “${pose.key}”`);
    }
    keys.add(pose.key);

    if (!pose.svg?.includes("<svg")) {
      throw new Error(`Pose “${pose.key}” is missing SVG markup`);
    }
    if (!VIEWBOX_RE.test(pose.svg)) {
      throw new Error(
        `Pose “${pose.key}” must use viewBox="0 0 420 520" (studio standard)`
      );
    }
    if (!/<style[^>]*><\/style>/.test(pose.svg)) {
      throw new Error(
        `Pose “${pose.key}” is missing an empty <style></style> placeholder (CSS is hoisted to pack.css)`
      );
    }
  }

  if (!pack.css.includes("@keyframes")) {
    throw new Error(
      "Exported pack.css has no @keyframes — animations will not play after import"
    );
  }

  const bytes = JSON.stringify(pack).length;
  const restoredBytes = estimateRestoredMarketplaceBytes(pack);
  const maxListing = MAX_PACK_JSON_BYTES - LISTING_OVERHEAD_BYTES;

  if (restoredBytes > maxListing) {
    throw new Error(
      `Pack would be ~${Math.round(restoredBytes / 1024)}KB after import ` +
        `(max ~${Math.round(maxListing / 1024)}KB with listing headroom). ` +
        "Simplify SVG or reduce pose count before listing."
    );
  }

  return {
    slug: pack.slug,
    poseCount: pack.poses.length,
    bytes,
    restoredBytes,
    cssBytes: pack.css.length,
  };
}

/**
 * Marketplace stores GeneratedMascot with CSS restored into every gesture SVG.
 * Pose-pack on disk is smaller (CSS once); reject before that blow-up fails upsert.
 */
export function estimateRestoredMarketplaceBytes(pack: PosePack): number {
  let total = 2_500; // name/themes/instrument/parts JSON overhead
  for (const pose of pack.poses) {
    const svg = restoreSharedCss(pose.svg, pack.css);
    total +=
      svg.length +
      pose.key.length +
      (pose.label?.length ?? 0) +
      (pose.cat?.length ?? 0) +
      (pose.tip?.length ?? 0) +
      (pose.use?.length ?? 0) +
      80;
  }
  return total;
}
