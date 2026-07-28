import { ConvexError } from "convex/values";

/**
 * Shared secret proving a call came from our Next.js generation routes rather
 * than from a browser.
 *
 * `reserve` / `settle`, remix unlock claim/restore, and app-asset saves are
 * public mutations that also accept the end user's Clerk token. Without this
 * check, a browser client can call them directly and bypass metering.
 *
 * Fail closed when unset — set `GENERATION_SERVER_SECRET` in both the Convex
 * dashboard and Next.js (`.env.local` / Vercel) to the same value.
 */
export function assertServerCaller(secret: string | undefined): void {
  const expected = process.env.GENERATION_SERVER_SECRET;
  if (!expected) {
    throw new ConvexError({
      code: "MISCONFIGURED",
      message: "GENERATION_SERVER_SECRET is not configured",
    });
  }
  if (secret !== expected) {
    throw new ConvexError({ code: "FORBIDDEN" });
  }
}
