import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { releaseReservation, syncOpenHoldTotal } from "./lib/tokens";

/** Bounded per run so a mutation never risks a transaction timeout. */
const SWEEP_BATCH = 100;

/**
 * How long a processed webhook id is worth remembering. RevenueCat gives up
 * retrying long before this, so anything older can no longer be a duplicate.
 * Token settle receipts (`token_settle:*`) share this table and retention.
 */
const EVENT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Hard-delete abandoned holds (after deferred settle grace) and refresh
 * denormalized `openHoldTotal` so capacity frees when TTL elapses.
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
    const touchedUsers = new Set<Id<"users">>();

    for (const reservation of stale) {
      const user = await ctx.db.get(reservation.userId);
      if (!user) {
        await ctx.db.delete(reservation._id);
        released++;
        continue;
      }
      const deleted = await releaseReservation(ctx, user, reservation, now);
      if (deleted) released++;
      touchedUsers.add(user._id);
    }

    for (const userId of touchedUsers) {
      await syncOpenHoldTotal(ctx, userId, now);
    }

    if (released > 0) {
      console.warn(`[tokens] swept ${released} expired reservation(s)`);
    }
    return { released };
  },
});

/** Drop webhook / settle ids that are past any possible retry. */
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
