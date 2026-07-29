export type RemixBriefInput = {
  sourceName: string;
  tagline: string;
  product?: string;
  description?: string;
  look?: string;
};

export type ResolvedRemixBrief = {
  description: string;
  look: string;
  /** True when the user left description blank and the source default was used. */
  descriptionFromSource: boolean;
  /** True when the user left look blank and the source default was used. */
  lookFromSource: boolean;
};

function defaultDescription(args: RemixBriefInput): string {
  const productLine = args.product?.trim()
    ? ` Product context: ${args.product.trim()}.`
    : "";
  return (
    `Preserve the character direction of "${args.sourceName}"` +
    (args.tagline.trim() ? ` — ${args.tagline.trim()}.` : ".") +
    productLine +
    " Only change personality or product fit if optional user notes say so."
  );
}

function defaultLook(): string {
  return (
    "Use the indexed pose artwork and palette manifest as the canonical visual reference. " +
    "Preserve silhouette, colour system, proportions, and SVG craft quality unless optional user notes specify changes."
  );
}

/** Resolve remix brief text, falling back to source-derived defaults when blank. */
export function resolveRemixBrief(args: RemixBriefInput): ResolvedRemixBrief {
  const userDescription = args.description?.trim() ?? "";
  const userLook = args.look?.trim() ?? "";

  return {
    description: userDescription || defaultDescription(args),
    look: userLook || defaultLook(),
    descriptionFromSource: userDescription.length === 0,
    lookFromSource: userLook.length === 0,
  };
}
