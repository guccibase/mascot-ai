import type { Doc } from "../_generated/dataModel";
import {
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceCategory,
} from "./marketplaceCategories";

export {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
  marketplaceCategoryValidator,
  type MarketplaceCategory,
} from "./marketplaceCategories";

export const MARKETPLACE_SKUS = ["remix", "buy_to_own"] as const;
export type MarketplaceSku = (typeof MARKETPLACE_SKUS)[number];

export const REMIX_PRICE_CENTS = 499;
export const BUY_TO_OWN_PRICE_CENTS = 4999;

/** Buy-to-own checkout holds the listing so two buyers can't both win. */
export const RESERVE_TTL_MS = 45 * 60 * 1000;

/** After paying for remix, the unlock window to run the remix flow. */
export const REMIX_UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

export const MAX_PACK_JSON_BYTES = 900_000;

type PackLike = {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  themes: Record<string, { name: string }>;
  instrument: {
    label: string;
    description: string;
    lowLabel: string;
    midLabel: string;
    highLabel: string;
    ramp: string[];
  };
  gestures: Array<{
    key: string;
    label: string;
    cat: string;
    tip: string;
    use: string;
    svg: string;
  }>;
  parts: Array<{
    key: string;
    label: string;
    category: string;
    description?: string;
  }>;
};

/**
 * Marketplace / library pack pose ceiling.
 * Must stay equal to `MAX_STUDIO_GESTURES` in `src/lib/refine-pack.ts` so
 * Add gesture / Ask AI never succeed then fail on `mascots.save`.
 */
export const MAX_PACK_GESTURES = 64;

export function assertPack(pack: PackLike) {
  if (pack.gestures.length < 1 || pack.gestures.length > MAX_PACK_GESTURES) {
    throw new Error(`Mascot must have 1 to ${MAX_PACK_GESTURES} gestures`);
  }
  if (pack.instrument.ramp.length !== 5) {
    throw new Error("Instrument ramp must have exactly 5 colors");
  }
  const keys = new Set<string>();
  for (const g of pack.gestures) {
    if (!g.key?.trim()) {
      throw new Error("Each gesture needs a key");
    }
    if (keys.has(g.key)) {
      throw new Error(`Duplicate gesture key “${g.key}”`);
    }
    keys.add(g.key);
    if (!g.svg?.includes("<svg")) {
      throw new Error(`Gesture “${g.key}” is missing SVG markup`);
    }
  }
  const bytes = JSON.stringify(pack).length;
  if (bytes > MAX_PACK_JSON_BYTES) {
    throw new Error(
      "Mascot pack is too large to save. Remove a gesture or simplify SVGs."
    );
  }
}

export function previewSvgFromPack(pack: PackLike): string {
  const idle =
    pack.gestures.find((g) => g.key === "idle") ?? pack.gestures[0];
  if (!idle?.svg) throw new Error("Pack has no previewable gesture");
  return idle.svg;
}

/** Denormalized lowercase text so marketplace search hits poses, parts, etc. */
export function buildListingSearchText(args: {
  name: string;
  tagline: string;
  description: string;
  category: MarketplaceCategory;
  pack: PackLike;
}): string {
  const parts: string[] = [
    args.name,
    args.tagline,
    args.description,
    args.category,
    MARKETPLACE_CATEGORY_LABELS[args.category],
    args.pack.name,
    args.pack.tagline,
    args.pack.product ?? "",
    args.pack.glowLabel ?? "",
    args.pack.instrument.label,
    args.pack.instrument.description,
    args.pack.instrument.lowLabel,
    args.pack.instrument.midLabel,
    args.pack.instrument.highLabel,
  ];
  for (const theme of Object.values(args.pack.themes)) {
    parts.push(theme.name);
  }
  for (const g of args.pack.gestures) {
    parts.push(g.key, g.label, g.cat, g.tip, g.use);
  }
  for (const p of args.pack.parts) {
    parts.push(p.key, p.label, p.category, p.description ?? "");
  }
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "mascot";
}

export function amountCentsForSku(sku: MarketplaceSku): number {
  return sku === "remix" ? REMIX_PRICE_CENTS : BUY_TO_OWN_PRICE_CENTS;
}

export function listingIsPurchasable(
  listing: Doc<"marketplaceListings">
): boolean {
  return listing.status === "available";
}

/**
 * Stable fingerprint of gesture SVG payloads so `mascots.save` can reject
 * unpaid copies of marketplace packs (preview may still return full packs).
 */
export function packFingerprint(pack: PackLike): string {
  let hash = 2166136261;
  const push = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  };
  const gestures = [...pack.gestures].sort((a, b) =>
    a.key.localeCompare(b.key)
  );
  for (const g of gestures) {
    push(g.key);
    push("\0");
    push(g.svg);
    push("\n");
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
