import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  canHardDeleteDeferredHold,
  isDeferredReservation,
} from "./spendCapacity";
import { addCycle, planById, type Plan } from "./plans";

/** Fail closed if a user somehow accumulates more concurrent holds than this. */
const OPEN_HOLD_SCAN_LIMIT = 100;

/** Upper bound on cycle rolls in one pass. ~20 years of monthly refills. */
const MAX_CYCLE_ROLLS = 240;

export type Balances = {
  subscriptionTokens: number;
  topupTokens: number;
  total: number;
};

/**
 * The plan a user can currently spend against. A `grace` entitlement still
 * counts until it expires so a temporary billing issue does not lock someone
 * out mid-project.
 */
export function activePlan(user: Doc<"users">, now: number): Plan | null {
  const entitlement = user.entitlement;
  if (!entitlement) return null;
  if (entitlement.status === "expired") return null;
  if (entitlement.expiresAt <= now) return null;
  return planById(entitlement.planId);
}

/**
 * Balances as of `now`, applying any refill that has come due. Pure, so
 * queries can report the same numbers a mutation would persist.
 */
export function projectBalances(
  user: Doc<"users">,
  now: number
): Balances & { cycleEnd: number | null; refilled: boolean } {
  const plan = activePlan(user, now);
  const topupTokens = Math.max(0, user.topupTokens ?? 0);

  if (!plan) {
    return {
      subscriptionTokens: 0,
      topupTokens,
      total: topupTokens,
      cycleEnd: null,
      refilled: false,
    };
  }

  let cycleEnd = user.tokenCycleEnd ?? null;
  let subscriptionTokens = Math.max(0, user.subscriptionTokens ?? 0);
  let refilled = false;

  if (cycleEnd == null) {
    cycleEnd = addCycle(now, plan.cycle);
    subscriptionTokens = plan.tokensPerCycle;
    refilled = true;
  } else if (now >= cycleEnd) {
    let end = cycleEnd;
    for (let i = 0; i < MAX_CYCLE_ROLLS && end <= now; i++) {
      end = addCycle(end, plan.cycle);
    }
    // Guard against pathological data leaving the cycle in the past.
    cycleEnd = end > now ? end : addCycle(now, plan.cycle);
    subscriptionTokens = plan.tokensPerCycle;
    refilled = true;
  }

  return {
    subscriptionTokens,
    topupTokens,
    total: subscriptionTokens + topupTokens,
    cycleEnd,
    refilled,
  };
}

export async function recordLedger(
  ctx: MutationCtx,
  entry: {
    userId: Id<"users">;
    kind: "grant" | "charge" | "refund" | "revoke" | "writeoff";
    bucket: "subscription" | "topup";
    amount: number;
    balanceAfter: number;
    reason: string;
    model?: string;
    eventId?: string;
  }
): Promise<void> {
  if (entry.amount === 0) return;
  await ctx.db.insert("tokenLedger", { ...entry, createdAt: Date.now() });
}

/**
 * Persist a due refill before spending. Returns the balances now in the
 * database so callers do not have to re-read the user document.
 */
export async function applyRefill(
  ctx: MutationCtx,
  user: Doc<"users">,
  now: number
): Promise<Balances> {
  const projected = projectBalances(user, now);

  if (projected.refilled) {
    const previous = Math.max(0, user.subscriptionTokens ?? 0);
    await ctx.db.patch(user._id, {
      subscriptionTokens: projected.subscriptionTokens,
      tokenCycleEnd: projected.cycleEnd ?? undefined,
      updatedAt: now,
    });
    // A refill resets rather than stacks, so the ledger records the *net*
    // change. Booking the full allowance would leave the trail unable to
    // explain an unspent remainder that the reset discarded.
    await recordLedger(ctx, {
      userId: user._id,
      kind: "grant",
      bucket: "subscription",
      amount: projected.subscriptionTokens - previous,
      balanceAfter: projected.subscriptionTokens,
      reason: "cycle_refill",
    });
  }

  return {
    subscriptionTokens: projected.subscriptionTokens,
    topupTokens: projected.topupTokens,
    total: projected.total,
  };
}

export type OpenHoldSum = {
  /** Deferred auth amounts still within TTL (legacy holds already hit the wallet). */
  total: number;
  /** True when the scan hit the concurrency ceiling — treat capacity as exhausted. */
  truncated: boolean;
};

/**
 * Sum of open deferred hold amounts for capacity checks.
 * Legacy (debit-on-reserve) rows are omitted — their cost is already in the wallet.
 */
export async function sumOpenHoldAmount(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  now: number
): Promise<OpenHoldSum> {
  const open = await ctx.db
    .query("tokenReservations")
    .withIndex("by_user_expires", (q) =>
      q.eq("userId", userId).gte("expiresAt", now)
    )
    .take(OPEN_HOLD_SCAN_LIMIT + 1);

  const truncated = open.length > OPEN_HOLD_SCAN_LIMIT;
  let total = 0;
  const rows = truncated ? open.slice(0, OPEN_HOLD_SCAN_LIMIT) : open;
  for (const reservation of rows) {
    if (isDeferredReservation(reservation)) {
      total += reservation.amount;
    }
  }
  return { total, truncated };
}

/**
 * Recompute denormalized capacity from live deferred holds (server clock).
 * Call after every reserve / settle / expiry mutation.
 */
export async function syncOpenHoldTotal(
  ctx: MutationCtx,
  userId: Id<"users">,
  now: number
): Promise<OpenHoldSum> {
  const openHolds = await sumOpenHoldAmount(ctx, userId, now);
  await ctx.db.patch(userId, {
    openHoldTotal: openHolds.truncated
      ? Number.MAX_SAFE_INTEGER
      : openHolds.total,
    updatedAt: now,
  });
  return openHolds;
}

/**
 * Return one abandoned hold to its buckets and delete it.
 *
 * Deferred holds never debited the wallet. They stay readable through a settle
 * grace window after TTL so a late successful settle can still capture; after
 * grace they are deleted with no refund. Legacy holds refund immediately.
 *
 * No ledger entry on release: holds are authorizations, not settled charges.
 * Wallet ≈ sum(ledger); open deferred holds are tracked separately via
 * `users.openHoldTotal`.
 *
 * @returns true when the reservation row was deleted.
 */
export async function releaseReservation(
  ctx: MutationCtx,
  user: Doc<"users">,
  reservation: Doc<"tokenReservations">,
  now: number
): Promise<boolean> {
  if (isDeferredReservation(reservation)) {
    if (!canHardDeleteDeferredHold(reservation.expiresAt, now)) {
      return false;
    }
    await ctx.db.delete(reservation._id);
    return true;
  }

  await ctx.db.delete(reservation._id);

  const plan = activePlan(user, now);
  const subscriptionTokens = Math.min(
    Math.max(0, user.subscriptionTokens ?? 0) + reservation.fromSubscription,
    plan?.tokensPerCycle ?? Number.MAX_SAFE_INTEGER
  );
  const topupTokens = Math.max(0, user.topupTokens ?? 0) + reservation.fromTopup;

  await ctx.db.patch(user._id, {
    subscriptionTokens,
    topupTokens,
    updatedAt: now,
  });
  return true;
}

/**
 * Release this user's abandoned holds. A cron sweeps everyone on a cadence;
 * this keeps the caller's own balance correct without waiting for it.
 */
export async function releaseExpiredReservations(
  ctx: MutationCtx,
  user: Doc<"users">,
  now: number
): Promise<void> {
  const stale = await ctx.db
    .query("tokenReservations")
    .withIndex("by_user_expires", (q) =>
      q.eq("userId", user._id).lt("expiresAt", now)
    )
    .take(20);

  let current = user;
  for (const reservation of stale) {
    await releaseReservation(ctx, current, reservation, now);
    const refreshed = await ctx.db.get(user._id);
    if (refreshed) current = refreshed;
  }

  // Drop capacity for holds past TTL even when still in settle grace.
  await syncOpenHoldTotal(ctx, user._id, now);
}
