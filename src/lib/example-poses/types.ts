import type { MascotSlug } from "@/lib/mascots";

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
  slug: MascotSlug;
  /** The stylesheet hoisted out of every pose in this pack. */
  css: string;
  poses: ExamplePose[];
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
