"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { snapshotFromV1Subscriber } from "./lib/revenueCatSubscriber";

/**
 * Pull the caller's RevenueCat subscriber record and apply any missing grants.
 * Complements the webhook so a misconfigured/missing destination cannot leave
 * a paid customer without tokens forever.
 *
 * Requires Convex env: REVENUECAT_SECRET_API_KEY (v1 or v2 secret works for
 * the v1 subscribers endpoint).
 */
export const syncMyPurchases = action({
  args: {},
  returns: v.object({
    synced: v.boolean(),
    reason: v.string(),
  }),
  handler: async (ctx): Promise<{ synced: boolean; reason: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { synced: false, reason: "unauthenticated" };
    }

    const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
    if (!apiKey) {
      console.error("[billingSync] REVENUECAT_SECRET_API_KEY not set");
      return { synced: false, reason: "not_configured" };
    }

    const appUserId = identity.subject;
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[billingSync] RC subscriber fetch failed ${res.status}: ${body.slice(0, 300)}`
      );
      return { synced: false, reason: "revenuecat_error" };
    }

    const payload = (await res.json()) as Parameters<
      typeof snapshotFromV1Subscriber
    >[0];
    const snapshot = snapshotFromV1Subscriber(payload);

    return await ctx.runMutation(internal.billing.applySubscriberSnapshot, {
      appUserId,
      subscriptions: snapshot.subscriptions,
      topups: snapshot.topups,
    });
  },
});
