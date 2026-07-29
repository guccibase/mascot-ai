import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  addCycle,
  normalizeProductId,
  planById,
  planByProductId,
  topupByProductId,
  type Plan,
} from "./lib/plans";
import {
  isStaleBillingEvent,
  shouldIgnoreSandboxBilling,
} from "./lib/billingPolicy";
import { resolveSubscriptionExpiry } from "./lib/billingExpiry";
import { recordLedger } from "./lib/tokens";

/**
 * Cancellations RevenueCat attributes to an actual refund. `DEVELOPER_INITIATED`
 * is deliberately excluded: the store uses it for plain developer-initiated
 * cancellations too, and revoking a balance nobody was refunded for is worse
 * than leaving tokens with a churned customer.
 */
const REFUND_REASONS = new Set(["CUSTOMER_SUPPORT"]);

/** Event types whose ordering matters, so a stale replay cannot undo them. */
const ORDERED_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "BILLING_ISSUE",
  "CANCELLATION",
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
  "SUBSCRIPTION_EXTENDED",
  "TRANSFER",
]);

type Outcome = { handled: boolean; reason: string };

/**
 * `app_user_id` comes from the client SDK, so only the Clerk id is trusted.
 * Matching on email would let a caller aim a revoke at somebody else's row,
 * and `by_email` is not unique.
 */
async function findUser(
  ctx: MutationCtx,
  appUserId: string
): Promise<Doc<"users"> | null> {
  const matches = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", appUserId))
    .take(2);
  if (matches.length === 0) return null;

  const preferred =
    matches.find((u) => !u.tokenIdentifier.startsWith("pending:")) ??
    matches[0]!;

  for (const dup of matches) {
    if (dup._id !== preferred._id) {
      await ctx.db.delete(dup._id);
    }
  }
  return preferred;
}

/**
 * When the plan allowance next refills. Anchored to the subscription period
 * rather than to webhook processing time: a delayed webhook would otherwise
 * push the refill past `expiresAt`, where it can never fire.
 */
function nextCycleEnd(plan: Plan, purchasedAt: number, expiresAt: number) {
  // Weekly and monthly refill exactly once per term, so the term end is it.
  if (plan.cyclesPerTerm === 1) return expiresAt;
  return Math.min(addCycle(purchasedAt, plan.cycle), expiresAt);
}

async function activate(
  ctx: MutationCtx,
  user: Doc<"users">,
  plan: Plan,
  args: {
    eventId: string;
    eventAt: number;
    productId: string;
    purchasedAt: number;
    expiresAt: number;
    store?: string;
    environment?: string;
  }
): Promise<void> {
  const now = Date.now();
  const current = Math.max(0, user.subscriptionTokens ?? 0);
  const subscriptionTokens = plan.tokensPerCycle;

  await ctx.db.patch(user._id, {
    entitlement: {
      planId: plan.id,
      productId: args.productId,
      status: "active",
      expiresAt: args.expiresAt,
      willRenew: true,
      store: args.store,
      environment: args.environment,
      lastEventAt: args.eventAt,
      updatedAt: now,
    },
    subscriptionTokens,
    tokenCycleEnd: nextCycleEnd(plan, args.purchasedAt, args.expiresAt),
    updatedAt: now,
  });

  // Net the grant against whatever was left, so the ledger still sums to the
  // balance after a reset discards an unspent remainder.
  await recordLedger(ctx, {
    userId: user._id,
    kind: "grant",
    bucket: "subscription",
    amount: subscriptionTokens - current,
    balanceAfter: subscriptionTokens,
    reason: `plan:${plan.id}`,
    eventId: args.eventId,
  });
}

async function setEntitlementStatus(
  ctx: MutationCtx,
  user: Doc<"users">,
  patch: {
    status?: "active" | "grace" | "expired";
    willRenew?: boolean;
    expiresAt?: number;
    eventAt?: number;
  }
): Promise<void> {
  if (!user.entitlement) return;
  const now = Date.now();
  await ctx.db.patch(user._id, {
    entitlement: {
      ...user.entitlement,
      status: patch.status ?? user.entitlement.status,
      willRenew: patch.willRenew ?? user.entitlement.willRenew,
      expiresAt: patch.expiresAt ?? user.entitlement.expiresAt,
      lastEventAt: patch.eventAt ?? user.entitlement.lastEventAt,
      updatedAt: now,
    },
    updatedAt: now,
  });
}

/** Zero the plan allowance and mark the entitlement finished. */
async function revokeSubscription(
  ctx: MutationCtx,
  user: Doc<"users">,
  args: { eventId: string; eventAt: number; reason: string; expiresAt?: number }
): Promise<void> {
  const revoked = Math.max(0, user.subscriptionTokens ?? 0);
  await ctx.db.patch(user._id, {
    subscriptionTokens: 0,
    updatedAt: Date.now(),
  });
  await setEntitlementStatus(ctx, user, {
    status: "expired",
    willRenew: false,
    expiresAt: args.expiresAt,
    eventAt: args.eventAt,
  });
  await recordLedger(ctx, {
    userId: user._id,
    kind: "revoke",
    bucket: "subscription",
    amount: -revoked,
    balanceAfter: 0,
    reason: args.reason,
    eventId: args.eventId,
  });
}

/**
 * Apply one RevenueCat webhook event. Idempotent by event id, since RevenueCat
 * delivers at least once and retries on any non-2xx response.
 *
 * Anything this cannot apply is left *unclaimed* and reported as unhandled so
 * the caller can ask for a retry. Claiming an event we did not act on would
 * take the customer's money and silently grant nothing.
 */
export const applyRevenueCatEvent = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    appUserId: v.string(),
    eventAtMs: v.optional(v.number()),
    productId: v.optional(v.string()),
    purchasedAtMs: v.optional(v.number()),
    expiresAtMs: v.optional(v.number()),
    store: v.optional(v.string()),
    environment: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
  },
  returns: v.object({ handled: v.boolean(), reason: v.string() }),
  handler: async (ctx, args): Promise<Outcome> => {
    const seen = await ctx.db
      .query("billingEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
    if (seen) return { handled: false, reason: "duplicate" };

    // Look the user up before claiming the event id. A purchase can land
    // before the Clerk webhook has created the row; leaving the id unclaimed
    // lets RevenueCat's retry apply it instead of dropping it as a duplicate.
    const user = await findUser(ctx, args.appUserId);
    if (!user) return { handled: false, reason: "unknown_user" };

    const outcome = await route(ctx, user, args);

    // Only a decision we actually reached gets recorded. Unhandled events stay
    // unclaimed so a retry can still apply them once the cause is fixed.
    if (outcome.handled) {
      await ctx.db.insert("billingEvents", {
        eventId: args.eventId,
        type: args.type,
        appUserId: args.appUserId,
        processedAt: Date.now(),
      });
    }
    return outcome;
  },
});

async function route(
  ctx: MutationCtx,
  user: Doc<"users">,
  args: {
    eventId: string;
    type: string;
    eventAtMs?: number;
    productId?: string;
    purchasedAtMs?: number;
    expiresAtMs?: number;
    store?: string;
    environment?: string;
    cancelReason?: string;
  }
): Promise<Outcome> {
  const now = Date.now();
  const eventAt = args.eventAtMs ?? now;

  // Sandbox and test purchases must never mint spendable tokens. Claim the
  // event so RevenueCat stops retrying, but grant nothing.
  if (
    shouldIgnoreSandboxBilling(
      args.environment,
      process.env.ALLOW_SANDBOX_BILLING === "true"
    )
  ) {
    return { handled: true, reason: "sandbox_ignored" };
  }

  // Drop a replay that predates what has already been applied, so a retried
  // EXPIRATION cannot wipe an allowance a later RENEWAL already paid for.
  if (
    isStaleBillingEvent(
      eventAt,
      user.entitlement?.lastEventAt,
      ORDERED_TYPES,
      args.type
    )
  ) {
    return { handled: true, reason: "stale_event" };
  }

  const productId = args.productId ?? "";
  const plan = planByProductId(productId);
  const topup = topupByProductId(productId);

  switch (args.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL": {
      if (!plan) return { handled: false, reason: "unknown_product" };
      const purchasedAt = args.purchasedAtMs ?? now;
      const expiresAt = resolveSubscriptionExpiry(plan, purchasedAt, args.expiresAtMs);
      await activate(ctx, user, plan, {
        eventId: args.eventId,
        eventAt,
        productId,
        purchasedAt,
        expiresAt,
        store: args.store,
        environment: args.environment,
      });
      return { handled: true, reason: "activated" };
    }

    case "PRODUCT_CHANGE": {
      if (!plan) return { handled: false, reason: "unknown_product" };
      const currentPlan = user.entitlement
        ? planById(user.entitlement.planId)
        : null;

      // A downgrade only takes effect at the end of the period the customer
      // already paid for. Switching now would clamp their allowance down to
      // the smaller plan and destroy tokens they own; the RENEWAL that enacts
      // the change resets everything correctly.
      if (currentPlan && plan.tokensPerCycle <= currentPlan.tokensPerCycle) {
        await setEntitlementStatus(ctx, user, { eventAt });
        return { handled: true, reason: "downgrade_deferred" };
      }

      if (!args.expiresAtMs && !user.entitlement) {
        const purchasedAt = args.purchasedAtMs ?? now;
        const expiresAt = resolveSubscriptionExpiry(plan, purchasedAt, args.expiresAtMs);
        await activate(ctx, user, plan, {
          eventId: args.eventId,
          eventAt,
          productId,
          purchasedAt,
          expiresAt,
          store: args.store,
          environment: args.environment,
        });
        return { handled: true, reason: "upgraded" };
      }
      const purchasedAt = args.purchasedAtMs ?? now;
      const expiresAt =
        args.expiresAtMs && args.expiresAtMs > 0
          ? args.expiresAtMs
          : user.entitlement
            ? resolveSubscriptionExpiry(
                plan,
                purchasedAt,
                user.entitlement.expiresAt
              )
            : resolveSubscriptionExpiry(plan, purchasedAt, args.expiresAtMs);
      // An upgrade is charged and effective immediately, so it grants now.
      await activate(ctx, user, plan, {
        eventId: args.eventId,
        eventAt,
        productId,
        purchasedAt,
        expiresAt,
        store: args.store,
        environment: args.environment,
      });
      return { handled: true, reason: "upgraded" };
    }

    case "NON_RENEWING_PURCHASE": {
      if (!topup) return { handled: false, reason: "unknown_product" };
      const topupTokens = Math.max(0, user.topupTokens ?? 0) + topup.tokens;
      await ctx.db.patch(user._id, { topupTokens, updatedAt: now });
      await recordLedger(ctx, {
        userId: user._id,
        kind: "grant",
        bucket: "topup",
        amount: topup.tokens,
        balanceAfter: topupTokens,
        reason: `topup:${topup.id}`,
        eventId: args.eventId,
      });
      return { handled: true, reason: "topup_granted" };
    }

    case "UNCANCELLATION": {
      await setEntitlementStatus(ctx, user, {
        status: "active",
        willRenew: true,
        eventAt,
      });
      return { handled: true, reason: "uncancelled" };
    }

    case "BILLING_ISSUE": {
      // Access continues through the grace window RevenueCat reports.
      await setEntitlementStatus(ctx, user, {
        status: "grace",
        willRenew: false,
        expiresAt: args.expiresAtMs,
        eventAt,
      });
      return { handled: true, reason: "billing_issue" };
    }

    case "SUBSCRIPTION_EXTENDED": {
      const entitlement = user.entitlement;
      const planForUser = entitlement ? planById(entitlement.planId) : null;
      const expiresAt =
        args.expiresAtMs && args.expiresAtMs > 0
          ? args.expiresAtMs
          : planForUser
            ? resolveSubscriptionExpiry(
                planForUser,
                args.purchasedAtMs ?? eventAt,
                entitlement?.expiresAt
              )
            : null;
      if (!expiresAt) return { handled: false, reason: "missing_expiry" };
      await setEntitlementStatus(ctx, user, {
        expiresAt,
        eventAt,
      });
      return { handled: true, reason: "extended" };
    }

    case "CANCELLATION": {
      const refunded = REFUND_REASONS.has(args.cancelReason ?? "");
      if (!refunded) {
        // Churn at period end. They keep what they paid for until then.
        await setEntitlementStatus(ctx, user, { willRenew: false, eventAt });
        return { handled: true, reason: "will_not_renew" };
      }

      if (topup) {
        const topupTokens = Math.max(
          0,
          Math.max(0, user.topupTokens ?? 0) - topup.tokens
        );
        await ctx.db.patch(user._id, { topupTokens, updatedAt: now });
        await recordLedger(ctx, {
          userId: user._id,
          kind: "revoke",
          bucket: "topup",
          amount: -topup.tokens,
          balanceAfter: topupTokens,
          reason: `refund:${topup.id}`,
          eventId: args.eventId,
        });
        return { handled: true, reason: "topup_revoked" };
      }

      await revokeSubscription(ctx, user, {
        eventId: args.eventId,
        eventAt,
        reason: "refund",
        expiresAt: now,
      });
      return { handled: true, reason: "refunded" };
    }

    // The store stopped billing, but the entitlement's expiry stays in the
    // future. Without this the allowance would keep refilling for free.
    case "SUBSCRIPTION_PAUSED":
    case "EXPIRATION": {
      await revokeSubscription(ctx, user, {
        eventId: args.eventId,
        eventAt,
        reason: args.type === "EXPIRATION" ? "expired" : "paused",
        expiresAt: args.type === "SUBSCRIPTION_PAUSED" ? now : undefined,
      });
      return { handled: true, reason: args.type.toLowerCase() };
    }

    // The subscription moved to another app_user_id. Strip it here so the
    // original account stops refilling; the destination gets its own event.
    case "TRANSFER": {
      if (!user.entitlement) return { handled: true, reason: "transfer_noop" };
      await revokeSubscription(ctx, user, {
        eventId: args.eventId,
        eventAt,
        reason: "transferred",
        expiresAt: now,
      });
      return { handled: true, reason: "transferred_away" };
    }

    default:
      // Informational events (TEST, INVOICE_ISSUANCE, …) touch no balance.
      return { handled: true, reason: `ignored:${args.type}` };
  }
}

const subscriptionSnapshot = v.object({
  productId: v.string(),
  purchasedAtMs: v.number(),
  expiresAtMs: v.number(),
  store: v.optional(v.string()),
  environment: v.optional(v.string()),
});

const topupSnapshot = v.object({
  productId: v.string(),
  transactionId: v.string(),
  purchasedAtMs: v.number(),
  store: v.optional(v.string()),
  environment: v.optional(v.string()),
});

/**
 * Pull subscriber state from RevenueCat REST API after checkout when the
 * webhook is delayed or misconfigured. Idempotent via billingEvents.
 */
export const applySubscriberSnapshot = internalMutation({
  args: {
    appUserId: v.string(),
    subscriptions: v.array(subscriptionSnapshot),
    topups: v.array(topupSnapshot),
  },
  returns: v.object({ synced: v.boolean(), reason: v.string() }),
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.appUserId);
    if (!user) return { synced: false, reason: "unknown_user" };

    const now = Date.now();
    let synced = false;

    let best: {
      plan: Plan;
      sub: (typeof args.subscriptions)[number] & { expiresAtMs: number };
    } | null = null;

    for (const sub of args.subscriptions) {
      if (
        shouldIgnoreSandboxBilling(
          sub.environment,
          process.env.ALLOW_SANDBOX_BILLING === "true"
        )
      ) {
        continue;
      }
      const plan = planByProductId(sub.productId);
      if (!plan) continue;
      const expiresAtMs = resolveSubscriptionExpiry(
        plan,
        sub.purchasedAtMs,
        sub.expiresAtMs
      );
      if (expiresAtMs <= now) continue;
      if (!best || expiresAtMs > best.sub.expiresAtMs) {
        best = { plan, sub: { ...sub, expiresAtMs } };
      }
    }

    if (best) {
      const productKey = normalizeProductId(best.sub.productId);
      const eventId = `sync:sub:${args.appUserId}:${productKey}:${best.sub.expiresAtMs}`;
      const seen = await ctx.db
        .query("billingEvents")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .first();
      if (!seen) {
        await activate(ctx, user, best.plan, {
          eventId,
          eventAt: now,
          productId: best.sub.productId,
          purchasedAt: best.sub.purchasedAtMs,
          expiresAt: best.sub.expiresAtMs,
          store: best.sub.store,
          environment: best.sub.environment,
        });
        await ctx.db.insert("billingEvents", {
          eventId,
          type: "SYNC_SUBSCRIPTION",
          appUserId: args.appUserId,
          processedAt: now,
        });
      }
      synced = true;
    }

    for (const topup of args.topups) {
      if (
        shouldIgnoreSandboxBilling(
          topup.environment,
          process.env.ALLOW_SANDBOX_BILLING === "true"
        )
      ) {
        continue;
      }
      const pack = topupByProductId(topup.productId);
      if (!pack) continue;

      const eventId = `sync:topup:${topup.transactionId}`;
      const seen = await ctx.db
        .query("billingEvents")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .first();
      if (seen) {
        synced = true;
        continue;
      }

      const topupTokens = Math.max(0, user.topupTokens ?? 0) + pack.tokens;
      await ctx.db.patch(user._id, { topupTokens, updatedAt: now });
      await recordLedger(ctx, {
        userId: user._id,
        kind: "grant",
        bucket: "topup",
        amount: pack.tokens,
        balanceAfter: topupTokens,
        reason: `topup:${pack.id}`,
        eventId,
      });
      await ctx.db.insert("billingEvents", {
        eventId,
        type: "SYNC_TOPUP",
        appUserId: args.appUserId,
        processedAt: now,
      });
      synced = true;
    }

    return {
      synced,
      reason: synced ? "activated" : "no_active_entitlements",
    };
  },
});
