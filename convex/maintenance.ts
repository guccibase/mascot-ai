import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { releaseReservation } from "./lib/tokens";

/** Bounded per run so a mutation never risks a transaction timeout. */
const SWEEP_BATCH = 100;

/**
 * How long a processed webhook id is worth remembering. RevenueCat gives up
 * retrying long before this, so anything older can no longer be a duplicate.
 */
const EVENT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Return holds abandoned by a crashed or timed-out request.
 *
 * `reserve` also sweeps, but only for the caller. Without this a user whose
 * settle failed on their last generation would have those tokens locked away
 * until they happened to start another one, and reading a balance is a query,
 * so it can never heal itself.
 */
export const sweepExpiredReservations = internalMutation({
  args: {},
  returns: v.object({ released: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("tokenReservations")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(SWEEP_BATCH);

    let released = 0;
    for (const reservation of stale) {
      const user = await ctx.db.get(reservation.userId);
      if (!user) {
        await ctx.db.delete(reservation._id);
        continue;
      }
      await releaseReservation(ctx, user, reservation, now);
      released++;
    }

    if (released > 0) {
      console.warn(`[tokens] swept ${released} expired reservation(s)`);
    }
    return { released };
  },
});

/** Drop webhook ids that are past any possible retry. */
export const pruneBillingEvents = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - EVENT_RETENTION_MS;
    const old = await ctx.db
      .query("billingEvents")
      .withIndex("by_processed", (q) => q.lt("processedAt", cutoff))
      .take(SWEEP_BATCH);

    for (const row of old) await ctx.db.delete(row._id);
    return { deleted: old.length };
  },
});
