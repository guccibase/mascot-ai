import {
  MAX_REFINE_HISTORY_MESSAGE_CHARS,
  MAX_REFINE_HISTORY_MESSAGES,
  MAX_REFINE_MESSAGE_CHARS,
} from "@/lib/refine-limits";
import type { GeneratedGesture, GeneratedMascot } from "@/lib/types";

export const MAX_REFINE_GESTURES = 24;
export const MAX_REFINE_GESTURES_PER_BATCH = 12;
export const MAX_REFINE_SVG_CHARS_PER_BATCH = 80_000;

type RefineGesture = Pick<GeneratedGesture, "key" | "svg">;

/**
 * Keep each model response comfortably below the 32K-token output ceiling.
 * Count and SVG-size limits are both enforced because generated packs vary
 * substantially in pose complexity.
 */
export function splitRefineGestures<T extends RefineGesture>(
  gestures: readonly T[]
): T[][] {
  const batches: T[][] = [];
  let batch: T[] = [];
  let batchChars = 0;

  for (const gesture of gestures) {
    const wouldOverflow =
      batch.length > 0 &&
      (batch.length >= MAX_REFINE_GESTURES_PER_BATCH ||
        batchChars + gesture.svg.length > MAX_REFINE_SVG_CHARS_PER_BATCH);

    if (wouldOverflow) {
      batches.push(batch);
      batch = [];
      batchChars = 0;
    }

    batch.push(gesture);
    batchChars += gesture.svg.length;
  }

  if (batch.length > 0) batches.push(batch);
  return batches;
}

/** The exact mascot shape embedded in every refinement model request. */
export function compactMascotForRefine(mascot: GeneratedMascot) {
  return {
    name: mascot.name,
    tagline: mascot.tagline,
    product: mascot.product,
    accent: mascot.accent,
    glowLabel: mascot.glowLabel,
    instrument: mascot.instrument,
    themes: mascot.themes,
    parts: mascot.parts,
    gestures: mascot.gestures.map((gesture) => ({
      key: gesture.key,
      label: gesture.label,
      cat: gesture.cat,
      tip: gesture.tip,
      use: gesture.use,
      track: gesture.track,
      delight: gesture.delight,
      signal: gesture.signal,
      svg: gesture.svg,
    })),
  };
}

/** Conservative client quote for the largest allowed message and history. */
export function maxRefinePayloadChars(mascot: GeneratedMascot): number {
  return (
    JSON.stringify(compactMascotForRefine(mascot)).length +
    MAX_REFINE_MESSAGE_CHARS +
    MAX_REFINE_HISTORY_MESSAGES * MAX_REFINE_HISTORY_MESSAGE_CHARS
  );
}

/**
 * Accept SVGs only for the exact assigned keys, then restore the server-owned
 * gesture order and metadata. Throws before any partial pack can be applied.
 */
export function mergeRefinedGestureBatches(
  original: readonly GeneratedGesture[],
  expectedBatches: readonly (readonly RefineGesture[])[],
  returnedBatches: readonly (readonly RefineGesture[])[]
): GeneratedGesture[] {
  if (returnedBatches.length !== expectedBatches.length) {
    throw new Error("Refine returned an incomplete pose set");
  }

  const svgByKey = new Map<string, string>();

  for (let index = 0; index < expectedBatches.length; index += 1) {
    const expected = expectedBatches[index]!;
    const returned = returnedBatches[index]!;
    const expectedKeys = new Set(expected.map((gesture) => gesture.key));
    const returnedKeys = new Set(returned.map((gesture) => gesture.key));

    if (
      returned.length !== expected.length ||
      returnedKeys.size !== returned.length ||
      returnedKeys.size !== expectedKeys.size ||
      [...returnedKeys].some((key) => !expectedKeys.has(key))
    ) {
      throw new Error("Refine returned an incomplete pose batch");
    }

    for (const gesture of returned) {
      if (!gesture.svg.includes("<svg")) {
        throw new Error(`Refine returned invalid SVG for "${gesture.key}"`);
      }
      svgByKey.set(gesture.key, gesture.svg);
    }
  }

  return original.map((gesture) => {
    const svg = svgByKey.get(gesture.key);
    if (!svg) throw new Error(`Refine omitted pose "${gesture.key}"`);
    return { ...gesture, svg };
  });
}
