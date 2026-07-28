/** App asset kinds users can select when building a pack. */
export type AppAssetKind = "app_icon" | "favicon" | "pwa" | "logo";

export type AppAssetFileSpec = {
  /** Path inside the zip, e.g. ios/AppIcon-1024.png */
  path: string;
  label: string;
  width: number;
  height: number;
  /** Opaque PNG required for iOS store icons. */
  opaque?: boolean;
  /** PWA maskable safe zone (80% center). */
  maskable?: boolean;
};

export type AppAssetKindMeta = {
  id: AppAssetKind;
  label: string;
  description: string;
  files: AppAssetFileSpec[];
};

const IOS_ICON_SIZES = [
  1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20,
] as const;

function iosIconFiles(): AppAssetFileSpec[] {
  return IOS_ICON_SIZES.map((size) => ({
    path: `ios/AppIcon-${size}.png`,
    label: `iOS App Icon ${size}×${size}`,
    width: size,
    height: size,
    opaque: true,
  }));
}

export const APP_ASSET_KINDS: readonly AppAssetKindMeta[] = [
  {
    id: "app_icon",
    label: "App icon",
    description: "iOS App Store + home screen sizes and Android Play Store 512",
    files: [
      ...iosIconFiles(),
      {
        path: "android/play-store-icon-512.png",
        label: "Google Play Store icon 512×512",
        width: 512,
        height: 512,
        opaque: true,
      },
      {
        path: "android/ic_launcher-xxxhdpi-192.png",
        label: "Android launcher 192×192",
        width: 192,
        height: 192,
        opaque: true,
      },
      {
        path: "android/ic_launcher_adaptive_foreground-432.png",
        label: "Android adaptive foreground 432×432",
        width: 432,
        height: 432,
      },
      {
        path: "android/ic_launcher_adaptive_background-432.png",
        label: "Android adaptive background 432×432",
        width: 432,
        height: 432,
        opaque: true,
      },
    ],
  },
  {
    id: "favicon",
    label: "Favicon",
    description: "Browser tab icons for web apps",
    files: [
      { path: "web/favicon-16.png", label: "Favicon 16×16", width: 16, height: 16 },
      { path: "web/favicon-32.png", label: "Favicon 32×32", width: 32, height: 32 },
      { path: "web/favicon-48.png", label: "Favicon 48×48", width: 48, height: 48 },
      {
        path: "web/apple-touch-icon-180.png",
        label: "Apple touch icon 180×180",
        width: 180,
        height: 180,
      },
    ],
  },
  {
    id: "pwa",
    label: "PWA / Web manifest",
    description: "Installable web app icons + site.webmanifest",
    files: [
      {
        path: "pwa/icon-192.png",
        label: "PWA icon 192×192",
        width: 192,
        height: 192,
      },
      {
        path: "pwa/icon-512.png",
        label: "PWA icon 512×512",
        width: 512,
        height: 512,
      },
      {
        path: "pwa/icon-maskable-512.png",
        label: "PWA maskable icon 512×512",
        width: 512,
        height: 512,
        maskable: true,
      },
    ],
  },
  {
    id: "logo",
    label: "Logo exports",
    description: "Transparent brand marks for marketing and headers",
    files: [
      {
        path: "logo/logo-512.png",
        label: "Logo 512×512",
        width: 512,
        height: 512,
      },
      {
        path: "logo/logo-1024.png",
        label: "Logo 1024×1024",
        width: 1024,
        height: 1024,
      },
      {
        path: "logo/logo.svg",
        label: "Logo SVG (from mascot idle pose)",
        width: 1024,
        height: 1024,
      },
    ],
  },
] as const;

export function kindMeta(id: AppAssetKind): AppAssetKindMeta {
  const found = APP_ASSET_KINDS.find((k) => k.id === id);
  if (!found) throw new Error(`Unknown asset kind: ${id}`);
  return found;
}

/** Unique file specs for a set of selected kinds (deduped by path). */
export function filesForKinds(kinds: AppAssetKind[]): AppAssetFileSpec[] {
  const byPath = new Map<string, AppAssetFileSpec>();
  for (const kind of kinds) {
    for (const file of kindMeta(kind).files) {
      byPath.set(file.path, file);
    }
  }
  return [...byPath.values()];
}

/**
 * Output file count for a pack build (mirrors pack-builder extras + README).
 * Used for infra token estimates so UI and server quote the same number.
 */
export function packOutputFileCount(kinds: readonly AppAssetKind[]): number {
  if (kinds.length === 0) return 0;
  let count = filesForKinds([...kinds]).length + 1; // README.txt
  if (kinds.includes("app_icon")) count += 1; // ios/Contents.json
  if (kinds.includes("pwa")) count += 1; // pwa/site.webmanifest
  return count;
}

export function isAppAssetKind(value: string): value is AppAssetKind {
  return APP_ASSET_KINDS.some((k) => k.id === value);
}

export function buildWebManifest(args: {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
}): string {
  return JSON.stringify(
    {
      name: args.name,
      short_name: args.shortName.slice(0, 12),
      icons: [
        { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        {
          src: "/pwa/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      theme_color: args.themeColor,
      background_color: args.backgroundColor,
      display: "standalone",
    },
    null,
    2
  );
}

export function buildIosContentsJson(): string {
  const images = IOS_ICON_SIZES.flatMap((size) => {
    const entries: Array<{ size: string; idiom: string; filename: string; scale: string }> = [];
    if (size === 1024) {
      entries.push({
        idiom: "ios-marketing",
        size: "1024x1024",
        filename: `AppIcon-${size}.png`,
        scale: "1x",
      });
      return entries;
    }
    const pt = size <= 60 ? size / 3 : size <= 80 ? size / 2 : size / 2;
    const scale = size <= 60 ? "3x" : "2x";
    entries.push({
      idiom: "iphone",
      size: `${pt}x${pt}`,
      filename: `AppIcon-${size}.png`,
      scale,
    });
    return entries;
  });
  return JSON.stringify({ images, info: { version: 1, author: "MascotAI" } }, null, 2);
}
