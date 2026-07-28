import type { StudioInstrument, ThemeSwatch } from "@/lib/types";

/**
 * What a studio tells the marketplace about itself. Every field is optional so
 * built-in mascots can declare only what the catalog does not already know,
 * while a studio authored outside the app can describe itself completely.
 *
 * `themes` and `instrument` are the fidelity contract: a pose pack is a
 * snapshot rendered with one palette and, for most studios, no signal slider.
 * Declaring both keeps the imported pack showing the same palette and the same
 * controls as the studio it came from.
 */
export type PosePackMeta = {
  name?: string;
  tagline?: string;
  product?: string;
  accent?: string;
  stage?: string;
  glowLabel?: string;
  /** The palette the snapshot was rendered with, keyed like the studio's own. */
  themes?: Record<string, ThemeSwatch>;
  /** The studio's real signal control, or `null` when it has none. */
  instrument?: StudioInstrument | null;
};

/** One snapshotted pose: the example's real markup, animations intact. */
export type ExamplePose = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
  /** Eyes follow the cursor in this pose. */
  track: boolean;
  /** Where this pose parks the instrument slider. */
  signal: number;
  /**
   * Full SVG for the pose with its `<style>` element emptied. The stylesheet
   * is identical across an example's poses and lives once on the pack.
   */
  svg: string;
};

export type PosePack = {
  /** Stable id for the mascot (matches POSE_SOURCE.slug). */
  slug: string;
  /** The stylesheet hoisted out of every pose in this pack. */
  css: string;
  poses: ExamplePose[];
  /** Optional display metadata for marketplace import. */
  meta?: PosePackMeta;
};

const STYLE_RE = /(<style[^>]*>)([\s\S]*?)(<\/style>)/;

/** Split a pose's stylesheet out of its markup, leaving the element in place. */
export function stripSharedCss(svg: string): { svg: string; css: string } {
  const match = svg.match(STYLE_RE);
  if (!match) return { svg, css: "" };
  return {
    svg: svg.replace(STYLE_RE, `$1$3`),
    css: match[2] ?? "",
  };
}

/**
 * Put a pack's stylesheet back into a pose. Applied after remixing, so edits
 * never have to reason about, or be able to damage, the animation rules.
 */
export function restoreSharedCss(svg: string, css: string): string {
  if (!css) return svg;
  return svg.replace(STYLE_RE, (_full, open: string, _body, close: string) =>
    `${open}${css}${close}`
  );
}
