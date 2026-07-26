/**
 * Build-time only. Renders each example mascot's poses to static markup so the
 * remix pipeline can edit the real thing: every coordinate, SMIL element and
 * keyframe exactly as the studio draws it.
 *
 * The four SVG components are pure functions of their props with no randomness
 * or time source, so this is fully deterministic: the same commit always
 * produces the same bytes, which is what makes the snapshot test a drift gate.
 *
 * Never import this from application code; it pulls the whole studio bundle in.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { POSE_SOURCE as LYRA } from "@/components/mascots/lyra-mascot";
import { POSE_SOURCE as SOL } from "@/components/mascots/sol-mascot";
import { POSE_SOURCE as BUD } from "@/components/mascots/bud-mascot";
import { POSE_SOURCE as FANOUS } from "@/components/mascots/fanous-mascot";
import type { MascotSlug } from "@/lib/mascots";
import { stripSharedCss, type ExamplePose, type PosePack } from "./types";

type PoseMeta = Omit<ExamplePose, "svg">;

type PoseSource = {
  slug: MascotSlug;
  poses: PoseMeta[];
  renderPose: (key: string) => ReactElement;
};

const SOURCES: Record<MascotSlug, PoseSource> = {
  lyra: LYRA as PoseSource,
  sol: SOL as PoseSource,
  bud: BUD as PoseSource,
  fanous: FANOUS as PoseSource,
};

export const POSE_PACK_SLUGS = Object.keys(SOURCES) as MascotSlug[];

export function buildPosePack(slug: MascotSlug): PosePack {
  const source = SOURCES[slug];
  const poses: ExamplePose[] = [];
  let shared: string | null = null;

  for (const meta of source.poses) {
    const markup = renderToStaticMarkup(source.renderPose(meta.key));
    const { svg, css } = stripSharedCss(markup);

    // Hoisting only holds while every pose ships the same stylesheet. If that
    // ever stops being true the pack would silently lose animation rules, so
    // fail the build instead.
    if (shared === null) shared = css;
    else if (css !== shared) {
      throw new Error(
        `${slug}/${meta.key} has a different <style> block than its siblings`
      );
    }

    poses.push({ ...meta, svg });
  }

  return { slug, css: shared ?? "", poses };
}
