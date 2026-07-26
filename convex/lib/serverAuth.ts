import { ConvexError } from "convex/values";

/**
 * Shared secret proving a call came from our Next.js generation routes rather
 * than from a browser.
 *
 * `reserve` and `settle` are public mutations authenticated with the end
 * user's own Clerk token, the same credential the browser holds. Without this
 * check, the only thing stopping someone settling their own reservation for
 * zero (a free generation) is that they never learn the reservation id. That
 * is true today but is one stray log line away from being false.
 *
 * Unset means unenforced, so an existing deployment keeps working; set
 * `GENERATION_SERVER_SECRET` in both the Convex dashboard and `.env.local` to
 * turn it on. The warning is there so "unset" cannot be mistaken for "secure".
 */
let warned = false;

export function assertServerCaller(secret: string | undefined): void {
  const expected = process.env.GENERATION_SERVER_SECRET;
  if (!expected) {
    if (!warned) {
      warned = true;
      console.warn(
        "[tokens] GENERATION_SERVER_SECRET is unset. Token mutations are reachable with a user token alone"
      );
    }
    return;
  }
  if (secret !== expected) {
    throw new ConvexError({ code: "FORBIDDEN" });
  }
}
