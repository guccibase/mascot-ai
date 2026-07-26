/** Shared vision prompt blocks for reference-guided generation. */

export function referenceImageBlock(): string {
  return [
    "REFERENCE IMAGE (attached): This is the user's canonical design.",
    "Match silhouette, proportions, face, palette, and distinctive motifs as closely as possible in SVG vector form.",
    "Output SVG paths only — never embed raster <image> tags.",
    "For sketches: interpret line art faithfully; infer fills from the brief when the sketch is monochrome.",
    "Keep SVG-friendly: clean contours, limited palette, strong silhouette at 48px.",
  ].join(" ");
}

export function samplesReferenceBlock(): string {
  return [
    "When a reference image is provided, all 3 samples must be faithful variations of that design:",
    "same character with subtle direction shifts (pose tint, palette shift, accessory), not unrelated characters.",
  ].join(" ");
}

export function remixReferenceBlock(): string {
  return [
    "REFERENCE IMAGE (attached): When it conflicts with the example mascot, prioritize matching the reference",
    "for palette, silhouette, and distinctive features while preserving animation structure from the example poses.",
  ].join(" ");
}

export function refineReferenceBlock(): string {
  return [
    "REFERENCE IMAGE (attached): Use it to guide what to add, change, or remove.",
    "When the user wants something removed, do NOT reproduce that element from the reference.",
    "When the user wants something added or changed, match the reference for shape, color, and style.",
    "Keep all gestures consistent with the edit. Output SVG paths only — no raster <image> tags.",
  ].join(" ");
}

export function gestureReferenceBlock(): string {
  return [
    "REFERENCE IMAGE (attached): Match character identity from the reference when drawing the new pose.",
    "Apply pose/prop/energy from the gesture brief while preserving reference silhouette and palette.",
  ].join(" ");
}
