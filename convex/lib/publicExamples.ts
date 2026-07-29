/**
 * Keep in sync with `PUBLIC_EXAMPLE_SLUGS` in `src/lib/mascots.ts`.
 * Convex cannot import app source, so the allowlist is mirrored here.
 */
export const PUBLIC_EXAMPLE_SLUGS = [
  "lyra",
  "sol",
  "bud",
  "fanous",
] as const;

const PUBLIC_EXAMPLE_SLUG_SET = new Set<string>(PUBLIC_EXAMPLE_SLUGS);

export function isPublicExampleSlug(slug: string): boolean {
  return PUBLIC_EXAMPLE_SLUG_SET.has(slug);
}
