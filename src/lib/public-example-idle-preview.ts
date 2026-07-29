import {
  PUBLIC_EXAMPLE_SLUGS,
  type PublicExampleSlug,
} from "@/lib/mascots";
import { restoreSharedCss } from "@/lib/example-poses/types";

export type { PublicExampleSlug };

type IdlePreviewPack = {
  slug: string;
  css: string;
  svg: string;
};

/**
 * Slim idle-only packs (~10–14KB each) derived from the full pose JSON.
 * Kept in sync by the pose-pack snapshot test under idle-previews/.
 */
const IDLE_LOADERS: Record<
  PublicExampleSlug,
  () => Promise<{ default: IdlePreviewPack }>
> = {
  lyra: () => import("@/lib/example-poses/idle-previews/lyra.json"),
  sol: () => import("@/lib/example-poses/idle-previews/sol.json"),
  bud: () => import("@/lib/example-poses/idle-previews/bud.json"),
  fanous: () => import("@/lib/example-poses/idle-previews/fanous.json"),
};

/** Idle pose SVG with shared CSS restored — for lightweight public previews. */
export async function loadPublicExampleIdlePreview(
  slug: PublicExampleSlug
): Promise<string | null> {
  const mod = await IDLE_LOADERS[slug]();
  const pack = mod.default;
  if (!pack?.svg) return null;
  return restoreSharedCss(pack.svg, pack.css ?? "");
}

export const PUBLIC_IDLE_PREVIEW_SLUGS = PUBLIC_EXAMPLE_SLUGS;
