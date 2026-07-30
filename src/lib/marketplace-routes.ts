/**
 * Marketplace browse surface that signed-out visitors may open.
 * Remix unlock and checkout stay auth-gated (Clerk + Convex).
 *
 * Keep this in sync with Clerk `createRouteMatcher` patterns in `proxy.ts`.
 */

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** True for `/marketplace` and `/marketplace/:slug` only (listing preview). */
export function isMarketplaceBrowsePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === "/marketplace") return true;
  if (!path.startsWith("/marketplace/")) return false;
  const rest = path.slice("/marketplace/".length);
  // One segment = listing slug. Nested paths are remix/checkout (or unknown).
  return rest.length > 0 && !rest.includes("/");
}

/**
 * Post-purchase surfaces that must not bounce incomplete-onboarding users
 * away after Stripe returns (Clerk still requires sign-in).
 */
export function isMarketplaceFulfillmentPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path.startsWith("/marketplace/checkout/")) return true;
  // /marketplace/:slug/remix
  return /^\/marketplace\/[^/]+\/remix$/.test(path);
}

/**
 * Clerk public-route patterns for the same browse surface.
 * Prefer `:slug` over `/marketplace(.*)` so `/remix` and `/checkout` stay protected.
 */
export const MARKETPLACE_PUBLIC_ROUTE_PATTERNS = [
  "/marketplace",
  "/marketplace/:slug",
] as const;
