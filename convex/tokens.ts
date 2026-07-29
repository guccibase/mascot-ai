import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import { assertServerCaller } from "./lib/serverAuth";
import { MAX_TOKEN_RESERVATION } from "./lib/plans";
import {
  deferredCaptureCeiling,
  isDeferredReservation,
  settleEventId,
  spendableTokens,
} from "./lib/spendCapacity";
import { refundTokenHold, splitTokenHold } from "./lib/spendSplit";
import {
  activePlan,
  applyRefill,
  projectBalances,
  recordLedger,
  releaseExpiredReservations,
  sumOpenHoldAmount,
  syncOpenHoldTotal,
  type Balances,
} from "./lib/tokens";

/**
 * Hold must outlive the longest metered route. Refine runs up to 300s; keep
 * several minutes of margin so settle never races expiry sweeps.
 */
const RESERVATION_TTL_MS = 10 * 60 * 1000;

const balanceShape = v.object({
  subscriptionTokens: v.number(),
  topupTokens: v.number(),
  /** Wallet total (not reduced by open deferred holds). */
  total: v.number(),
  /** Sum of open reservation amounts (capacity earmarked, not yet charged). */
  held: v.number(),
  /** Capacity left for a new reserve: total − held. */
  available: v.number(),
  cycleEnd: v.union(v.number(), v.null()),
  planId: v.union(v.string(), v.null()),
  planName: v.union(v.string(), v.null()),
  tokensPerCycle: v.union(v.number(), v.null()),
  status: v.union(v.string(), v.null()),
  willRenew: v.boolean(),
  /** When the current plan entitlement ends (ms). */
  expiresAt: v.union(v.number(), v.null()),
  hasAccess: v.boolean(),
});

/**
 * Spendable balance for the signed-in user. Reports the refill that is due
 * rather than writing it, so reading a balance stays a pure query.
 */
export const balance = query({
  args: {
    /**
     * Caller's clock, coarsened by `balanceClock()`. Passed in rather than read
     * here so the query stays deterministic: `Date.now()` inside a query would
     * be cached against a timestamp that never matches the next read.
     * Hold capacity uses denormalized `openHoldTotal` (mutation-maintained),
     * so a skewed client clock cannot hide open authorizations.
     */
    now: v.number(),
  },
  returns: v.union(balanceShape, v.null()),
  handler: async (ctx, { now }) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const plan = activePlan(user, now);
    const projected = projectBalances(user, now);
    const held = Math.max(0, user.openHoldTotal ?? 0);
    const available = spendableTokens(projected.total, held);

    return {
      subscriptionTokens: projected.subscriptionTokens,
      topupTokens: projected.topupTokens,
      total: projected.total,
      held,
      available,
      cycleEnd: projected.cycleEnd,
      planId: plan?.id ?? null,
      planName: plan?.name ?? null,
      tokensPerCycle: plan?.tokensPerCycle ?? null,
      status: user.entitlement?.status ?? null,
      willRenew: user.entitlement?.willRenew ?? false,
      expiresAt: user.entitlement?.expiresAt ?? null,
      hasAccess: plan !== null || projected.topupTokens > 0,
    };
  },
});

/**
 * Authorize the worst-case cost of a generation without charging the wallet.
 * Settle captures actual usage (auth/capture). Concurrent reserves cannot
 * together overspend because capacity is wallet − open holds.
 *
 * The returned id is a capability: it is only ever handed to our own server
 * routes and must never be exposed to a browser.
 */
export const reserve = mutation({
  args: {
    amount: v.number(),
    action: v.string(),
    model: v.string(),
    serverSecret: v.optional(v.string()),
  },
  returns: v.object({
    reservationId: v.id("tokenReservations"),
    fromSubscription: v.number(),
    fromTopup: v.number(),
  }),
  handler: async (ctx, args) => {
    assertServerCaller(args.serverSecret);
    const amount = Math.ceil(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ConvexError({ code: "INVALID_AMOUNT" });
    }
    if (amount > MAX_TOKEN_RESERVATION) {
      throw new ConvexError({
        code: "RESERVATION_TOO_LARGE",
        required: amount,
        max: MAX_TOKEN_RESERVATION,
      });
    }

    const now = Date.now();
    const found = await getCurrentUser(ctx);

    await releaseExpiredReservations(ctx, found, now);
    let user = await ctx.db.get(found._id);
    if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

    const plan = activePlan(user, now);
    const balances = await applyRefill(ctx, user, now);

    if (!plan && balances.topupTokens <= 0) {
      throw new ConvexError({ code: "NO_SUBSCRIPTION" });
    }

    // OCC so concurrent reserves re-read capacity after the other commits.
    await ctx.db.patch(user._id, { updatedAt: now });
    const refreshed = await ctx.db.get(user._id);
    if (!refreshed) throw new ConvexError({ code: "USER_NOT_FOUND" });
    user = refreshed;

    const openHolds = await sumOpenHoldAmount(ctx, user._id, now);
    if (openHolds.truncated) {
      throw new ConvexError({
        code: "TOO_MANY_HOLDS",
        max: 100,
      });
    }
    const available = spendableTokens(balances.total, openHolds.total);
    if (available < amount) {
      throw new ConvexError({
        code: "INSUFFICIENT_TOKENS",
        required: amount,
        available,
      });
    }

    // Planned bucket split for observability / legacy compat (wallet untouched).
    const split = splitTokenHold(
      amount,
      balances.subscriptionTokens,
      balances.topupTokens
    );
    const { fromSubscription, fromTopup } = split;

    const reservationId = await ctx.db.insert("tokenReservations", {
      userId: user._id,
      amount,
      fromSubscription,
      fromTopup,
      action: args.action,
      model: args.model,
      createdAt: now,
      expiresAt: now + RESERVATION_TTL_MS,
      deferred: true,
    });

    await syncOpenHoldTotal(ctx, user._id, now);

    return { reservationId, fromSubscription, fromTopup };
  },
});

/**
 * Close a hold against metered usage.
 *
 * Deferred (auth/capture): debit only when actualTokens > 0; a zero settle
 * releases capacity with no wallet change.
 * Legacy: refund unused remainder of a hold that already debited at reserve.
 *
 * Missing reservation + actualTokens > 0: idempotent orphan capture (hold was
 * swept after grace) keyed by `token_settle:{reservationId}` on the ledger.
 */
export const settle = mutation({
  args: {
    reservationId: v.id("tokenReservations"),
    actualTokens: v.number(),
    model: v.optional(v.string()),
    serverSecret: v.optional(v.string()),
  },
  returns: v.object({ charged: v.number(), balance: v.number() }),
  handler: async (ctx, args) => {
    assertServerCaller(args.serverSecret);
    const now = Date.now();
    const user = await getCurrentUser(ctx);
    const charged = Math.max(
      0,
      Math.min(Math.ceil(args.actualTokens || 0), MAX_TOKEN_RESERVATION)
    );
    const eventId = settleEventId(args.reservationId);

    // OCC: serialize concurrent settles for this user before idempotency check.
    await ctx.db.patch(user._id, { updatedAt: now });

    if (await findSettleReceipt(ctx, eventId)) {
      const projected = projectBalances(user, now);
      return { charged: 0, balance: projected.total };
    }

    const reservation = await ctx.db.get(args.reservationId);

    if (!reservation) {
      return await settleMissingReservation(ctx, {
        user,
        charged,
        eventId,
        model: args.model ?? "unknown",
        now,
      });
    }
    if (reservation.userId !== user._id) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    const model = args.model ?? reservation.model;

    await ctx.db.delete(args.reservationId);
    const peers = await syncOpenHoldTotal(ctx, user._id, now);
    const balances = await applyRefill(ctx, user, now);

    let result: { charged: number; balance: number };
    if (isDeferredReservation(reservation)) {
      if (charged <= 0) {
        result = {
          charged: 0,
          balance: balances.subscriptionTokens + balances.topupTokens,
        };
      } else {
        result = await settleDeferred(ctx, {
          userId: user._id,
          balances,
          charged,
          otherOpenHolds: peers.truncated ? balances.total : peers.total,
          action: reservation.action,
          model,
          eventId,
          now,
        });
      }
    } else {
      result = await settleLegacy(ctx, {
        userId: user._id,
        user,
        balances,
        reservation: {
          amount: reservation.amount,
          fromSubscription: reservation.fromSubscription,
          fromTopup: reservation.fromTopup,
          action: reservation.action,
        },
        charged,
        model,
        eventId,
        now,
      });
    }

    await markSettleReceipt(ctx, eventId, user._id, now);
    return result;
  },
});

async function findSettleReceipt(
  ctx: MutationCtx,
  eventId: string
): Promise<boolean> {
  const row = await ctx.db
    .query("billingEvents")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .first();
  return row !== null;
}

async function markSettleReceipt(
  ctx: MutationCtx,
  eventId: string,
  userId: Id<"users">,
  now: number
): Promise<void> {
  await ctx.db.insert("billingEvents", {
    eventId,
    type: "token_settle",
    appUserId: String(userId),
    processedAt: now,
  });
}

/**
 * Hold row gone (settled already, or hard-deleted after grace). Zero actual is
 * a no-op; positive actual runs an idempotent orphan capture so successful
 * work is not free after a late settle.
 */
async function settleMissingReservation(
  ctx: MutationCtx,
  args: {
    user: Doc<"users">;
    charged: number;
    eventId: string;
    model: string;
    now: number;
  }
): Promise<{ charged: number; balance: number }> {
  if (args.charged <= 0) {
    await markSettleReceipt(ctx, args.eventId, args.user._id, args.now);
    const projected = projectBalances(args.user, args.now);
    return { charged: 0, balance: projected.total };
  }

  console.warn(
    `[tokens] orphan settle for ${args.eventId} charging ${args.charged}`
  );

  const balances = await applyRefill(ctx, args.user, args.now);
  const peers = await sumOpenHoldAmount(ctx, args.user._id, args.now);
  const result = await settleDeferred(ctx, {
    userId: args.user._id,
    balances,
    charged: args.charged,
    otherOpenHolds: peers.truncated ? balances.total : peers.total,
    action: "orphan_settle",
    model: args.model,
    eventId: args.eventId,
    now: args.now,
  });
  await markSettleReceipt(ctx, args.eventId, args.user._id, args.now);
  return result;
}

async function settleDeferred(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    balances: Balances;
    charged: number;
    otherOpenHolds: number;
    action: string;
    model: string;
    eventId: string;
    now: number;
  }
): Promise<{ charged: number; balance: number }> {
  let subscriptionTokens = args.balances.subscriptionTokens;
  let topupTokens = args.balances.topupTokens;
  const wallet = subscriptionTokens + topupTokens;

  const { toCharge, writeoff: capacityWriteoff } = deferredCaptureCeiling(
    wallet,
    args.otherOpenHolds,
    args.charged
  );

  const spentSubscription = Math.min(subscriptionTokens, toCharge);
  const spentTopup = Math.min(
    topupTokens,
    Math.max(0, toCharge - spentSubscription)
  );
  subscriptionTokens -= spentSubscription;
  topupTokens -= spentTopup;
  const uncovered =
    capacityWriteoff + (toCharge - spentSubscription - spentTopup);

  await ctx.db.patch(args.userId, {
    subscriptionTokens,
    topupTokens,
    updatedAt: args.now,
  });

  if (uncovered > 0) {
    console.warn(
      `[tokens] wrote off ${uncovered} tokens for ${args.action} on ${args.model}`
    );
    await recordLedger(ctx, {
      userId: args.userId,
      kind: "writeoff",
      bucket: "subscription",
      amount: -uncovered,
      balanceAfter: subscriptionTokens,
      reason: `${args.action}_uncovered`,
      model: args.model,
      eventId: args.eventId,
    });
  }

  await recordLedger(ctx, {
    userId: args.userId,
    kind: "charge",
    bucket: "subscription",
    amount: -spentSubscription,
    balanceAfter: subscriptionTokens,
    reason: args.action,
    model: args.model,
    eventId: args.eventId,
  });
  await recordLedger(ctx, {
    userId: args.userId,
    kind: "charge",
    bucket: "topup",
    amount: -spentTopup,
    balanceAfter: topupTokens,
    reason: args.action,
    model: args.model,
    eventId: args.eventId,
  });

  return {
    charged: spentSubscription + spentTopup,
    balance: subscriptionTokens + topupTokens,
  };
}

async function settleLegacy(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    user: Doc<"users">;
    balances: Balances;
    reservation: {
      amount: number;
      fromSubscription: number;
      fromTopup: number;
      action: string;
    };
    charged: number;
    model: string;
    eventId: string;
    now: number;
  }
): Promise<{ charged: number; balance: number }> {
  let subscriptionTokens = args.balances.subscriptionTokens;
  let topupTokens = args.balances.topupTokens;
  let spentSubscription = args.reservation.fromSubscription;
  let spentTopup = args.reservation.fromTopup;
  let discarded = 0;

  if (args.charged <= args.reservation.amount) {
    const { topupBack, subscriptionBack } = refundTokenHold(
      args.reservation.amount,
      args.charged,
      args.reservation.fromTopup
    );

    topupTokens += topupBack;
    subscriptionTokens += subscriptionBack;
    spentSubscription -= subscriptionBack;
    spentTopup -= topupBack;

    const plan = activePlan(args.user, args.now);
    if (plan && subscriptionTokens > plan.tokensPerCycle) {
      discarded = subscriptionTokens - plan.tokensPerCycle;
      subscriptionTokens = plan.tokensPerCycle;
    }

    await ctx.db.patch(args.userId, {
      subscriptionTokens,
      topupTokens,
      updatedAt: args.now,
    });
  } else {
    let extra = args.charged - args.reservation.amount;
    const extraSubscription = Math.min(subscriptionTokens, extra);
    subscriptionTokens -= extraSubscription;
    extra -= extraSubscription;
    const extraTopup = Math.min(topupTokens, extra);
    topupTokens -= extraTopup;
    extra -= extraTopup;

    spentSubscription += extraSubscription;
    spentTopup += extraTopup;

    await ctx.db.patch(args.userId, {
      subscriptionTokens,
      topupTokens,
      updatedAt: args.now,
    });

    if (extra > 0) {
      console.warn(
        `[tokens] wrote off ${extra} tokens for ${args.reservation.action} on ${args.model}`
      );
      await recordLedger(ctx, {
        userId: args.userId,
        kind: "writeoff",
        bucket: "subscription",
        amount: -extra,
        balanceAfter: subscriptionTokens,
        reason: `${args.reservation.action}_uncovered`,
        model: args.model,
        eventId: args.eventId,
      });
    }
  }

  await recordLedger(ctx, {
    userId: args.userId,
    kind: "charge",
    bucket: "subscription",
    amount: -spentSubscription,
    balanceAfter: subscriptionTokens,
    reason: args.reservation.action,
    model: args.model,
    eventId: args.eventId,
  });
  await recordLedger(ctx, {
    userId: args.userId,
    kind: "charge",
    bucket: "topup",
    amount: -spentTopup,
    balanceAfter: topupTokens,
    reason: args.reservation.action,
    model: args.model,
    eventId: args.eventId,
  });
  await recordLedger(ctx, {
    userId: args.userId,
    kind: "revoke",
    bucket: "subscription",
    amount: -discarded,
    balanceAfter: subscriptionTokens,
    reason: "refund_capped",
    model: args.model,
    eventId: args.eventId,
  });

  return {
    charged: spentSubscription + spentTopup,
    balance: subscriptionTokens + topupTokens,
  };
}
