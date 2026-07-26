/** Allowed output paths per asset kind (mirrors src/lib/app-assets/catalog.ts). */
const PATHS_BY_KIND: Record<string, readonly string[]> = {
  app_icon: [
    ...[1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20].map(
      (s) => `ios/AppIcon-${s}.png`
    ),
    "android/play-store-icon-512.png",
    "android/ic_launcher-xxxhdpi-192.png",
    "android/ic_launcher_adaptive_foreground-432.png",
    "android/ic_launcher_adaptive_background-432.png",
    "ios/Contents.json",
  ],
  favicon: [
    "web/favicon-16.png",
    "web/favicon-32.png",
    "web/favicon-48.png",
    "web/apple-touch-icon-180.png",
  ],
  pwa: [
    "pwa/icon-192.png",
    "pwa/icon-512.png",
    "pwa/icon-maskable-512.png",
    "pwa/site.webmanifest",
  ],
  logo: ["logo/logo-512.png", "logo/logo-1024.png", "logo/logo.svg"],
};

const README = "README.txt";

export function expectedPathsForKinds(kinds: readonly string[]): Set<string> {
  const paths = new Set<string>([README]);
  for (const kind of kinds) {
    const list = PATHS_BY_KIND[kind];
    if (!list) continue;
    for (const path of list) paths.add(path);
  }
  return paths;
}

export const MAX_PACK_FILES = 40;
export const MAX_FILE_BYTES = 5_000_000;
export const MAX_STYLE_CHARS = 800;
export const MAX_IMAGE_MODEL_CHARS = 80;
export const MAX_PACKS_LIST = 50;
export const MAX_PACKS_PER_MASCOT = 25;
export const ORPHAN_UPLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SWEEP_BATCH = 100;
