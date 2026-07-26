import type { MascotSlug } from "@/lib/mascots";
import type { GeneratedMascot } from "@/lib/types";

/** One paintable SVG element indexed for surgical remix edits. */
export type IndexedElement = {
  /** Stable content hash: the edit key across all poses. */
  id: string;
  /** Index into the token array for the element's opening tag. */
  tokenIndex: number;
  tag: string;
  fill?: string;
  stroke?: string;
  /** Geometry signature used for bbox drift checks. */
  geom: string;
  /** Space-separated ancestor class names, root → leaf. */
  ancestorClasses: string;
  /** True when this hash appears in every selected pose. */
  shared: boolean;
};

export type PoseElements = {
  key: string;
  svg: string;
  elements: IndexedElement[];
};

/** Compact row sent to the model: no raw SVG, just what it may edit. */
export type ManifestRow = {
  id: string;
  tag: string;
  fill?: string;
  stroke?: string;
  /** First 120 chars of path d or geometry attrs. */
  geom?: string;
  role?: string;
};

/** A single attribute edit the model returns. */
export type RemixEdit = {
  id: string;
  fill?: string;
  stroke?: string;
  d?: string;
  /** Optional part role for data-ms-part stamping. */
  part?: string;
};

export type RemixIdentityResult = {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  instrument: GeneratedMascot["instrument"];
  themes: GeneratedMascot["themes"];
  /** oldHex → newHex, applied deterministically before shape edits. */
  palette: Record<string, string>;
  edits: RemixEdit[];
  parts?: GeneratedMascot["parts"];
};

export type RemixPoseResult = {
  key: string;
  edits: RemixEdit[];
  track?: boolean;
  delight?: boolean;
  signal?: number;
};

export type ExampleRemixConfig = {
  slug: MascotSlug;
  /** Regex matching the example's eye group class. */
  eyesClass: RegExp;
  /** Regex matching the glow halo element class. */
  haloClass: RegExp;
  /** Optional regex for the live instrument fan group (Lyra tail). */
  instrumentClass?: RegExp;
};
