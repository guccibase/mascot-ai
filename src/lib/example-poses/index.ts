import "server-only";
import type { MascotSlug } from "@/lib/mascots";
import type { PosePack } from "./types";

/**
 * Committed snapshots of the example studios, produced by `npm run poses:build`
 * and guarded by the pose-pack drift test.
 *
 * Loaded one at a time so a request only ever pays for the example it is
 * remixing, and `server-only` keeps ~730KB of markup out of the client.
 */
const LOADERS: Record<MascotSlug, () => Promise<{ default: unknown }>> = {
  lyra: () => import("./lyra.json"),
  sol: () => import("./sol.json"),
  bud: () => import("./bud.json"),
  fanous: () => import("./fanous.json"),
};

export async function loadPosePack(slug: MascotSlug): Promise<PosePack> {
  const mod = await LOADERS[slug]();
  return mod.default as PosePack;
}

export type { ExamplePose, PosePack } from "./types";
export { restoreSharedCss, stripSharedCss } from "./types";
