import { stripSharedCss, type ExamplePose } from "@/lib/example-poses/types";
import type { GeneratedGesture, GeneratedMascot } from "@/lib/types";
import { indexPosePack } from "@/lib/remix/cross-pose";
import { collectPalette } from "@/lib/remix/palette";

/** Client-safe remix index prep (avoids server-only example pose loaders). */
export function prepareRemixIndex(
  pack: { css: string; poses: ExamplePose[] },
  selectedKeys: string[]
) {
  const { indexed, sharedManifest, variantManifests } = indexPosePack(
    pack.poses,
    pack.css,
    selectedKeys
  );
  const paletteEntries = collectPalette(indexed.map((p) => p.svg));
  return { indexed, sharedManifest, variantManifests, paletteEntries };
}

/** Turn a library/marketplace pack into the pose index remix expects. */
export function packToRemixSource(pack: GeneratedMascot): {
  name: string;
  poses: ExamplePose[];
  css: string;
} {
  let css = "";
  const poses: ExamplePose[] = pack.gestures.map((g, index) => {
    const stripped = stripSharedCss(g.svg);
    if (index === 0) css = stripped.css;
    // Prefer hoisted CSS when every pose shares it; otherwise keep inline styles.
    const svg =
      css && stripped.css === css ? stripped.svg : g.svg;
    return {
      key: g.key,
      label: g.label,
      cat: g.cat,
      tip: g.tip,
      use: g.use,
      track: Boolean(g.track),
      signal: typeof g.signal === "number" ? g.signal : 50,
      svg,
    };
  });

  // If styles weren't uniform, don't hoist — each pose keeps its own <style>.
  const uniform = pack.gestures.every((g) => stripSharedCss(g.svg).css === css);
  return {
    name: pack.name,
    poses: uniform
      ? poses
      : pack.gestures.map((g) => gestureToPose(g)),
    css: uniform ? css : "",
  };
}

function gestureToPose(g: GeneratedGesture): ExamplePose {
  return {
    key: g.key,
    label: g.label,
    cat: g.cat,
    tip: g.tip,
    use: g.use,
    track: Boolean(g.track),
    signal: typeof g.signal === "number" ? g.signal : 50,
    svg: g.svg,
  };
}

export function preparePackRemixIndex(
  pack: GeneratedMascot,
  selectedKeys: string[]
) {
  const source = packToRemixSource(pack);
  return {
    ...prepareRemixIndex(
      { css: source.css, poses: source.poses },
      selectedKeys
    ),
    source,
  };
}
