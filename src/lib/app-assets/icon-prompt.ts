const ICON_VARIANTS = [
  "Variant A — Bold premium store icon: rich multi-stop gradient field, soft 3D depth, gentle rim light, mascot as a confident hero mark with polished consumer-app energy.",
  "Variant B — Soft luminous icon: airy glow, subtle vignette, glassy highlights, mascot as a warm friendly emblem with delightful product feel.",
  "Variant C — Graphic brand-mark icon: stronger silhouette, cleaner shapes, slightly simplified detailing for tiny-size clarity while keeping signature colors and face — distinctive badge energy.",
] as const;

/**
 * Prompt for creative, store-ready app icons generated FROM the mascot reference
 * (identity + style), not a screenshot pasted on a background.
 */
export function buildIconPrompt(args: {
  mascotName: string;
  tagline?: string;
  product?: string;
  accent?: string;
  styleDescription?: string;
  kinds: string[];
  variantIndex?: number;
}): string {
  const variant =
    ICON_VARIANTS[
      Math.max(0, Math.min(ICON_VARIANTS.length - 1, args.variantIndex ?? 0))
    ]!;

  const styleNotes = args.styleDescription?.trim();

  return [
    `Create a production APP ICON artwork for "${args.mascotName}" using the attached mascot as the character reference.`,
    "CRITICAL QUALITY BAR: this must look like an A++ shipped App Store / Play Store icon — creative, beautiful, and designed — NOT a screenshot, photo crop, or raw paste of the reference onto a flat background.",
    "Use the reference for identity only: same character species/type, face, signature colors, and distinctive details. Re-compose and re-light the character as a tight icon mark with intentional composition, depth, and polish.",
    "Composition: square 1:1, full-bleed artwork, character centered and large in the safe zone (fills most of the icon), balanced negative space, no tiny floating figure in empty canvas.",
    "Clarity: instantly recognizable at 48px and still readable at 16px — strong silhouette, high contrast vs background, avoid noisy micro-detail and thin lines that vanish when small.",
    "Hard bans: no text, no letters, no watermark, no UI chrome, no phone/frame mockup, no baked-in rounded-corner mask, no borders that look like an iOS squircle already applied.",
    args.product?.trim() ? `Product context: ${args.product.trim()}.` : null,
    args.tagline?.trim() ? `Brand vibe: ${args.tagline.trim()}.` : null,
    args.accent?.trim()
      ? `Brand accent color to echo in lighting/background accents: ${args.accent.trim()}.`
      : null,
    styleNotes ? `Creator direction: ${styleNotes}` : null,
    `Downstream assets will include: ${args.kinds.join(", ")}.`,
    variant,
    "Finish with store-ready lighting, color harmony, and craftsmanship.",
  ]
    .filter(Boolean)
    .join(" ");
}
