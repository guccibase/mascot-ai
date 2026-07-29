import type { MascotSlug } from "@/lib/mascots";
import { MASCOTS } from "@/lib/mascots";
import {
  finalizeMarketplacePack,
  parseMarketplacePackFile,
} from "@/lib/marketplace/parse-pack-file";
import type { GeneratedMascot } from "@/lib/types";

const LOADERS: Record<MascotSlug, () => Promise<{ default: unknown }>> = {
  bud: () => import("@/lib/example-poses/bud.json"),
  lyra: () => import("@/lib/example-poses/lyra.json"),
  sol: () => import("@/lib/example-poses/sol.json"),
  fanous: () => import("@/lib/example-poses/fanous.json"),
  granary: () => import("@/lib/example-poses/granary.json"),
  byte: () => import("@/lib/example-poses/byte.json"),
  numi: () => import("@/lib/example-poses/numi.json"),
  lexa: () => import("@/lib/example-poses/lexa.json"),
  coda: () => import("@/lib/example-poses/coda.json"),
  kelp: () => import("@/lib/example-poses/kelp.json"),
  nori: () => import("@/lib/example-poses/nori.json"),
  hay: () => import("@/lib/example-poses/hay.json"),
  nox: () => import("@/lib/example-poses/nox.json"),
  zest: () => import("@/lib/example-poses/zest.json"),
  quill: () => import("@/lib/example-poses/quill.json"),
  pip: () => import("@/lib/example-poses/pip.json"),
  bolt: () => import("@/lib/example-poses/bolt.json"),
  relay: () => import("@/lib/example-poses/relay.json"),
  orbit: () => import("@/lib/example-poses/orbit.json"),
  brew: () => import("@/lib/example-poses/brew.json"),
  shade: () => import("@/lib/example-poses/shade.json"),
  watt: () => import("@/lib/example-poses/watt.json"),
  arc: () => import("@/lib/example-poses/arc.json"),
  aura: () => import("@/lib/example-poses/aura.json"),
  glint: () => import("@/lib/example-poses/glint.json"),
  trove: () => import("@/lib/example-poses/trove.json"),
  zephyr: () => import("@/lib/example-poses/zephyr.json"),
};


export const EXAMPLE_MARKETPLACE_OPTIONS = MASCOTS.map((m) => ({
  slug: m.slug,
  name: m.name,
}));

/** Load a committed example pose pack as a marketplace GeneratedMascot. */
export async function loadExampleMarketplacePack(
  slug: MascotSlug
): Promise<GeneratedMascot> {
  const mod = await LOADERS[slug]();
  const raw = mod.default ?? mod;
  return finalizeMarketplacePack(
    parseMarketplacePackFile(JSON.stringify(raw))
  );
}

/**
 * Parse an uploaded admin pack file.
 * Studio JSX is rejected — Quick Import loads the committed snapshots.
 */
export async function parseMarketplaceUpload(
  text: string,
  _filename?: string
): Promise<GeneratedMascot> {
  return finalizeMarketplacePack(parseMarketplacePackFile(text));
}
