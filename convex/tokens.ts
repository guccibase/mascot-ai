import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import { assertServerCaller } from "./lib/serverAuth";
import { MAX_TOKEN_RESERVATION } from "./lib/plans";
import {
  activePlan,
  applyRefill,
  projectBalances,
  recordLedger,
  releaseExpiredReservations,
} from "./lib/tokens";

/** A hold outlives the longest generation route (180s) with room to spare. */
const RESERVATION_TTL_MS = 5 * 60 * 1000;

const balanceShape = v.object({
  subscriptionTokens: v.number(),
  topupTokens: v.number(),
  total: v.number(),
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
     */
    now: v.number(),
  },
  returns: v.union(balanceShape, v.null()),
  handler: async (ctx, { now }) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const plan = activePlan(user, now);
    const projected = projectBalances(user, now);

    return {
      subscriptionTokens: projected.subscriptionTokens,
      topupTokens: projected.topupTokens,
      total: projected.total,
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
 * Hold the worst-case cost of a generation before it runs, so concurrent
 * requests cannot together overspend a balance. Always paired with `settle`,
 * which refunds whatever the run did not use.
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
    const user = await ctx.db.get(found._id);
    if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

    const plan = activePlan(user, now);
    const balances = await applyRefill(ctx, user, now);

    if (!plan && balances.topupTokens <= 0) {
      throw new ConvexError({ code: "NO_SUBSCRIPTION" });
    }
    if (balances.total < amount) {
      throw new ConvexError({
        code: "INSUFFICIENT_TOKENS",
        required: amount,
        available: balances.total,
      });
    }

    // Spend the plan allowance first so purchased top-ups keep rolling over.
    const fromSubscription = Math.min(balances.subscriptionTokens, amount);
    const fromTopup = amount - fromSubscription;

    await ctx.db.patch(user._id, {
      subscriptionTokens: balances.subscriptionTokens - fromSubscription,
      topupTokens: balances.topupTokens - fromTopup,
      updatedAt: now,
    });

    const reservationId = await ctx.db.insert("tokenReservations", {
      userId: user._id,
      amount,
      fromSubscription,
      fromTopup,
      action: args.action,
      model: args.model,
      createdAt: now,
      expiresAt: now + RESERVATION_TTL_MS,
    });

    return { reservationId, fromSubscription, fromTopup };
  },
});

/**
 * Close a hold against metered usage. Refunds the unused remainder, or debits
 * the difference when a provider fallback made the run cost more than quoted.
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
    // One clock for the whole transaction: two `Date.now()` calls could
    // straddle a cycle boundary and disagree with each other.
    const now = Date.now();
    const user = await getCurrentUser(ctx);
    const reservation = await ctx.db.get(args.reservationId);

    // Already settled (or swept as expired). The balance is correct as-is.
    if (!reservation) {
      const projected = projectBalances(user, now);
      return { charged: 0, balance: projected.total };
    }
    if (reservation.userId !== user._id) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    const charged = Math.max(
      0,
      Math.min(Math.ceil(args.actualTokens || 0), MAX_TOKEN_RESERVATION)
    );
    const model = args.model ?? reservation.model;

    await ctx.db.delete(args.reservationId);

    // A cycle can roll while a generation is in flight. Bank the refill first
    // so the refund below is measured against the allowance that now applies,
    // and so the balance handed back to the caller is the real one.
    const balances = await applyRefill(ctx, user, now);

    let subscriptionTokens = balances.subscriptionTokens;
    let topupTokens = balances.topupTokens;
    // Net spend per bucket, so the ledger reconciles exactly against balances.
    let spentSubscription = reservation.fromSubscription;
    let spentTopup = reservation.fromTopup;
    /** Refund the new cycle's cap would not let us return. */
    let discarded = 0;

    if (charged <= reservation.amount) {
      // Return the unused hold, topping the purchased bucket up first since
      // the plan allowance was drawn down before it.
      const refund = reservation.amount - charged;
      const topupBack = Math.min(refund, reservation.fromTopup);
      const subscriptionBack = refund - topupBack;

      topupTokens += topupBack;
      subscriptionTokens += subscriptionBack;
      spentSubscription -= subscriptionBack;
      spentTopup -= topupBack;

      // A refill may have landed mid-run; never let a refund exceed the cap.
      const plan = activePlan(user, now);
      if (plan && subscriptionTokens > plan.tokensPerCycle) {
        discarded = subscriptionTokens - plan.tokensPerCycle;
        subscriptionTokens = plan.tokensPerCycle;
      }

      await ctx.db.patch(user._id, {
        subscriptionTokens,
        topupTokens,
        updatedAt: now,
      });
    } else {
      // Overrun: the hold was too small, which after payload-aware pricing can
      // only really happen when a provider falls back to a costlier model. Take
      // the extra from what is left; a balance is never allowed to go negative.
      let extra = charged - reservation.amount;
      const extraSubscription = Math.min(subscriptionTokens, extra);
      subscriptionTokens -= extraSubscription;
      extra -= extraSubscription;
      const extraTopup = Math.min(topupTokens, extra);
      topupTokens -= extraTopup;
      extra -= extraTopup;

      spentSubscription += extraSubscription;
      spentTopup += extraTopup;

      await ctx.db.patch(user._id, {
        subscriptionTokens,
        topupTokens,
        updatedAt: now,
      });

      // Whatever the balance could not cover is ours to eat. Record it so the
      // loss is auditable and alertable instead of disappearing.
      if (extra > 0) {
        console.warn(
          `[tokens] wrote off ${extra} tokens for ${reservation.action} on ${model}`
        );
        await recordLedger(ctx, {
          userId: user._id,
          kind: "writeoff",
          bucket: "subscription",
          amount: -extra,
          balanceAfter: subscriptionTokens,
          reason: `${reservation.action}_uncovered`,
          model,
        });
      }
    }

    await recordLedger(ctx, {
      userId: user._id,
      kind: "charge",
      bucket: "subscription",
      amount: -spentSubscription,
      balanceAfter: subscriptionTokens,
      reason: reservation.action,
      model,
    });
    await recordLedger(ctx, {
      userId: user._id,
      kind: "charge",
      bucket: "topup",
      amount: -spentTopup,
      balanceAfter: topupTokens,
      reason: reservation.action,
      model,
    });
    // Booked explicitly, so the ledger still sums to the balance after the cap
    // swallowed part of a refund.
    await recordLedger(ctx, {
      userId: user._id,
      kind: "revoke",
      bucket: "subscription",
      amount: -discarded,
      balanceAfter: subscriptionTokens,
      reason: "refund_capped",
      model,
    });

    return {
      charged: spentSubscription + spentTopup,
      balance: subscriptionTokens + topupTokens,
    };
  },
});
