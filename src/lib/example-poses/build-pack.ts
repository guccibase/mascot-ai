/**
 * Build-time only. Renders mascot poses to static markup so remix and
 * marketplace import edit the real SVG — every coordinate, SMIL element and
 * keyframe exactly as the studio draws it.
 *
 * Pose components must be pure functions of their props with no randomness or
 * time source so output is deterministic.
 *
 * Never import this from application code; it pulls studio bundles in.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { POSE_SOURCE as LYRA } from "@/components/mascots/lyra-mascot";
import { POSE_SOURCE as SOL } from "@/components/mascots/sol-mascot";
import { POSE_SOURCE as BUD } from "@/components/mascots/bud-mascot";
import { POSE_SOURCE as FANOUS } from "@/components/mascots/fanous-mascot";
import { POSE_SOURCE as GRANARY } from "@/components/mascots/granary-mascot";
import { POSE_SOURCE as BYTE } from "@/components/mascots/byte-mascot";
import { POSE_SOURCE as NUMI } from "@/components/mascots/numi-mascot";
import { POSE_SOURCE as LEXA } from "@/components/mascots/lexa-mascot";
import { POSE_SOURCE as CODA } from "@/components/mascots/coda-mascot";
import { POSE_SOURCE as KELP } from "@/components/mascots/kelp-mascot";
import { POSE_SOURCE as NORI } from "@/components/mascots/nori-mascot";
import { POSE_SOURCE as HAY } from "@/components/mascots/hay-mascot";
import { POSE_SOURCE as NOX } from "@/components/mascots/nox-mascot";
import { POSE_SOURCE as ZEST } from "@/components/mascots/zest-mascot";
import { POSE_SOURCE as QUILL } from "@/components/mascots/quill-mascot";
import { POSE_SOURCE as PIP } from "@/components/mascots/pip-mascot";
import { POSE_SOURCE as BOLT } from "@/components/mascots/bolt-mascot";
import { POSE_SOURCE as RELAY } from "@/components/mascots/relay-mascot";
import { POSE_SOURCE as ORBIT } from "@/components/mascots/orbit-mascot";
import { POSE_SOURCE as BREW } from "@/components/mascots/brew-mascot";
import { POSE_SOURCE as SHADE } from "@/components/mascots/shade-mascot";
import { POSE_SOURCE as WATT } from "@/components/mascots/watt-mascot";
import { POSE_SOURCE as ARC } from "@/components/mascots/arc-mascot";
import { POSE_SOURCE as AURA } from "@/components/mascots/aura-mascot";
import { POSE_SOURCE as GLINT } from "@/components/mascots/glint-mascot";
import { POSE_SOURCE as TROVE } from "@/components/mascots/trove-mascot";
import { POSE_SOURCE as ZEPHYR } from "@/components/mascots/zephyr-mascot";
import type { MascotSlug } from "@/lib/mascots";

import {
  stripSharedCss,
  type ExamplePose,
  type PosePack,
  type PosePackMeta,
} from "./types";

type PoseMeta = Omit<ExamplePose, "svg">;

/** Shape exported from every `*-mascot.jsx` studio file. */
export type PoseSource = {
  slug: string;
  poses: PoseMeta[];
  renderPose: (key: string) => ReactElement;
  meta?: PosePackMeta;
};

const SOURCES: Record<MascotSlug, PoseSource> = {
  lyra: LYRA as PoseSource,
  sol: SOL as PoseSource,
  bud: BUD as PoseSource,
  fanous: FANOUS as PoseSource,
  granary: GRANARY as PoseSource,
  byte: BYTE as PoseSource,
  numi: NUMI as PoseSource,
  lexa: LEXA as PoseSource,
  coda: CODA as PoseSource,
  kelp: KELP as PoseSource,
  nori: NORI as PoseSource,
  hay: HAY as PoseSource,
  nox: NOX as PoseSource,
  zest: ZEST as PoseSource,
  quill: QUILL as PoseSource,
  pip: PIP as PoseSource,
  bolt: BOLT as PoseSource,
  relay: RELAY as PoseSource,
  orbit: ORBIT as PoseSource,
  brew: BREW as PoseSource,
  shade: SHADE as PoseSource,
  watt: WATT as PoseSource,
  arc: ARC as PoseSource,
  aura: AURA as PoseSource,
  glint: GLINT as PoseSource,
  trove: TROVE as PoseSource,
  zephyr: ZEPHYR as PoseSource,
};


export const POSE_PACK_SLUGS = Object.keys(SOURCES) as MascotSlug[];

export function buildPosePackFromSource(source: PoseSource): PosePack {
  if (!source.slug?.trim()) {
    throw new Error("POSE_SOURCE.slug is required");
  }
  if (!Array.isArray(source.poses) || source.poses.length === 0) {
    throw new Error("POSE_SOURCE.poses must be a non-empty array");
  }
  if (typeof source.renderPose !== "function") {
    throw new Error("POSE_SOURCE.renderPose must be a function");
  }

  const slug = source.slug.trim();
  const poses: ExamplePose[] = [];
  const keys = new Set<string>();
  let shared: string | null = null;

  for (const meta of source.poses) {
    if (!meta.key?.trim()) {
      throw new Error("Every POSE_SOURCE.poses entry needs a key");
    }
    if (keys.has(meta.key)) {
      throw new Error(`Duplicate pose key “${meta.key}” in POSE_SOURCE`);
    }
    keys.add(meta.key);

    let markup: string;
    try {
      markup = renderToStaticMarkup(source.renderPose(meta.key));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to render pose “${meta.key}”: ${msg}`);
    }

    const { svg, css } = stripSharedCss(markup);

    if (shared === null) shared = css;
    else if (css !== shared) {
      throw new Error(
        `${slug}/${meta.key} has a different <style> block than its siblings`
      );
    }

    if (!svg.includes("<svg")) {
      throw new Error(`Pose “${meta.key}” did not produce SVG markup`);
    }

    poses.push({ ...meta, svg });
  }

  const meta = normalizePosePackMeta(source.meta);

  return {
    slug,
    css: shared ?? "",
    poses,
    ...(meta ? { meta } : {}),
  };
}

export function buildPosePack(slug: MascotSlug): PosePack {
  const source = SOURCES[slug];
  if (!source) {
    throw new Error(`Unknown built-in mascot slug: ${slug}`);
  }
  return buildPosePackFromSource(source);
}

/**
 * Keep only the fields a studio actually declared. Anything left out falls back
 * to the mascot catalog (built-ins) or to accent-derived defaults on import, so
 * a studio never has to restate what the app already knows.
 */
function normalizePosePackMeta(
  raw: PosePackMeta | undefined
): PosePackMeta | undefined {
  if (!raw) return undefined;

  const meta: PosePackMeta = {};
  if (raw.name?.trim()) meta.name = raw.name.trim();
  if (raw.tagline?.trim()) meta.tagline = raw.tagline.trim();
  if (raw.product?.trim()) meta.product = raw.product.trim();
  if (raw.accent?.trim()) meta.accent = raw.accent.trim();
  if (raw.stage?.trim()) meta.stage = raw.stage.trim();
  if (raw.glowLabel?.trim()) meta.glowLabel = raw.glowLabel.trim();
  if (raw.themes) meta.themes = assertThemes(raw.themes);
  // `null` is a declaration ("this studio has no signal control"), not absence.
  if (raw.instrument !== undefined) {
    meta.instrument = raw.instrument ? assertInstrument(raw.instrument) : null;
  }

  return Object.keys(meta).length > 0 ? meta : undefined;
}

const SWATCH_KEYS = ["name", "top", "mid", "base", "core", "stage"] as const;

function assertThemes(
  themes: NonNullable<PosePackMeta["themes"]>
): NonNullable<PosePackMeta["themes"]> {
  const entries = Object.entries(themes);
  if (entries.length === 0) {
    throw new Error("POSE_SOURCE.meta.themes must declare at least one theme");
  }
  for (const [key, swatch] of entries) {
    for (const field of SWATCH_KEYS) {
      if (typeof swatch?.[field] !== "string" || !swatch[field].trim()) {
        throw new Error(`meta.themes.${key} is missing ${field}`);
      }
    }
  }
  return themes;
}

function assertInstrument(
  instrument: NonNullable<PosePackMeta["instrument"]>
): NonNullable<PosePackMeta["instrument"]> {
  if (!instrument.label?.trim()) {
    throw new Error("meta.instrument needs a label");
  }
  if (instrument.ramp?.length !== 5) {
    throw new Error("meta.instrument.ramp must have exactly 5 colors");
  }
  return instrument;
}
