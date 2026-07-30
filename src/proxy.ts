import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { MARKETPLACE_PUBLIC_ROUTE_PATTERNS } from "@/lib/marketplace-routes";

/**
 * The shop window is open to everyone: the landing page, the example studios,
 * pricing, and marketplace browse/preview. Signing in is only required to
 * create, save, or buy (including marketplace remix/checkout).
 *
 * Crawler entrypoints (robots/sitemap) and static metadata assets are also
 * public so Googlebot never hits an auth redirect.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/studio(.*)",
  ...MARKETPLACE_PUBLIC_ROUTE_PATTERNS,
  "/pricing",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals, static assets, and crawler entrypoints.
    "/((?!_next|robots\\.txt|sitemap\\.xml|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
    "/(api|trpc)(.*)",
  ],
};
