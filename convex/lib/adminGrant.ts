import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { activePlan, applyRefill, recordLedger } from "./tokens";

/** Single admin grant cap — above largest catalog top-up, below abuse territory. */
export const MAX_ADMIN_GRANT = 5_000_000;

export const ADMIN_GRANT_EVENT_TYPE = "ADMIN_GRANT";

/** Client UUID / opaque key length bounds for grant dedupe. */
export const IDEMPOTENCY_KEY_MIN = 8;
export const IDEMPOTENCY_KEY_MAX = 64;

const IDEMPOTENCY_KEY_RE = /^[a-zA-Z0-9_-]+$/;

export type AdminGrantBucket = "topup" | "subscription";

export type AdminGrantResult = {
  bucket: AdminGrantBucket;
  amount: number;
  subscriptionTokens: number;
  topupTokens: number;
  total: number;
  duplicate: boolean;
};

export function isValidIdempotencyKey(key: string): boolean {
  const trimmed = key.trim();
  return (
    trimmed.length >= IDEMPOTENCY_KEY_MIN &&
    trimmed.length <= IDEMPOTENCY_KEY_MAX &&
    IDEMPOTENCY_KEY_RE.test(trimmed)
  );
}

export function normalizeGrantAmount(amount: number): number {
  const normalized = Math.floor(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new ConvexError({
      code: "INVALID_AMOUNT",
      message: "Grant amount must be a positive integer",
    });
  }
  if (normalized > MAX_ADMIN_GRANT) {
    throw new ConvexError({
      code: "AMOUNT_TOO_LARGE",
      message: `Maximum grant is ${MAX_ADMIN_GRANT.toLocaleString()} tokens`,
    });
  }
  return normalized;
}

/**
 * How many subscription tokens can still fit under the plan cycle cap.
 * Pure — used by unit tests and the grant path.
 */
export function subscriptionHeadroom(current: number, cap: number): number {
  return Math.max(0, Math.floor(cap) - Math.max(0, Math.floor(current)));
}

/**
 * Resolve a subscription grant. Fails closed when nothing fits, or when the
 * requested amount would be silently truncated by the plan cap.
 */
export function resolveSubscriptionGrant(
  current: number,
  requested: number,
  cap: number
): { applied: number } {
  const headroom = subscriptionHeadroom(current, cap);
  if (headroom <= 0) {
    throw new ConvexError({
      code: "SUBSCRIPTION_AT_CAP",
      message: "Subscription bucket is already at the plan cap",
    });
  }
  if (requested > headroom) {
    throw new ConvexError({
      code: "SUBSCRIPTION_PARTIAL",
      message: `Only ${headroom.toLocaleString()} of ${requested.toLocaleString()} fits under the plan cap`,
    });
  }
  return { applied: requested };
}

export function buildGrantReason(
  adminUserId: Id<"users">,
  note?: string
): string {
  const trimmed = note?.trim().slice(0, 120);
  return trimmed
    ? `admin_grant:${adminUserId}:${trimmed}`
    : `admin_grant:${adminUserId}`;
}

function adminEventId(idempotencyKey: string): string {
  return `admin_grant:${idempotencyKey.trim()}`;
}

async function existingAdminGrant(
  ctx: MutationCtx,
  eventId: string
): Promise<boolean> {
  const ledgerHit = await ctx.db
    .query("tokenLedger")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .first();
  if (ledgerHit) return true;

  const billingHit = await ctx.db
    .query("billingEvents")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .first();
  return billingHit !== null;
}

async function duplicateGrantResult(
  ctx: MutationCtx,
  target: Doc<"users">,
  bucket: AdminGrantBucket,
  now: number
): Promise<AdminGrantResult> {
  const balances = await applyRefill(ctx, target, now);
  return {
    bucket,
    amount: 0,
    subscriptionTokens: balances.subscriptionTokens,
    topupTokens: balances.topupTokens,
    total: balances.total,
    duplicate: true,
  };
}

/**
 * Credit tokens to a user on behalf of an admin. Defaults to the top-up bucket
 * so credits roll over without touching entitlement state. Deduped via
 * `billingEvents` using a client-supplied idempotency key (same pattern as
 * RevenueCat webhook handling).
 */
export async function grantTokensAsAdmin(
  ctx: MutationCtx,
  args: {
    target: Doc<"users">;
    adminUserId: Id<"users">;
    amount: number;
    idempotencyKey: string;
    bucket?: AdminGrantBucket;
    note?: string;
    now?: number;
  }
): Promise<AdminGrantResult> {
  if (!isValidIdempotencyKey(args.idempotencyKey)) {
    throw new ConvexError({
      code: "INVALID_IDEMPOTENCY_KEY",
      message: "Idempotency key must be 8–64 URL-safe characters",
    });
  }

  const amount = normalizeGrantAmount(args.amount);
  const bucket = args.bucket ?? "topup";
  const now = args.now ?? Date.now();
  const eventId = adminEventId(args.idempotencyKey);
  const reason = buildGrantReason(args.adminUserId, args.note);

  if (await existingAdminGrant(ctx, eventId)) {
    return duplicateGrantResult(ctx, args.target, bucket, now);
  }

  const balances = await applyRefill(ctx, args.target, now);
  let subscriptionTokens = balances.subscriptionTokens;
  let topupTokens = balances.topupTokens;
  let applied = amount;

  if (bucket === "topup") {
    topupTokens += amount;
    await ctx.db.patch(args.target._id, { topupTokens, updatedAt: now });
    await recordLedger(ctx, {
      userId: args.target._id,
      kind: "grant",
      bucket: "topup",
      amount,
      balanceAfter: topupTokens,
      reason,
      eventId,
    });
  } else {
    const plan = activePlan(args.target, now);
    if (!plan) {
      throw new ConvexError({
        code: "NO_ACTIVE_PLAN",
        message: "Subscription grants require an active plan",
      });
    }
    ({ applied } = resolveSubscriptionGrant(
      subscriptionTokens,
      amount,
      plan.tokensPerCycle
    ));
    subscriptionTokens += applied;
    await ctx.db.patch(args.target._id, {
      subscriptionTokens,
      updatedAt: now,
    });
    await recordLedger(ctx, {
      userId: args.target._id,
      kind: "grant",
      bucket: "subscription",
      amount: applied,
      balanceAfter: subscriptionTokens,
      reason,
      eventId,
    });
  }

  await ctx.db.insert("billingEvents", {
    eventId,
    type: ADMIN_GRANT_EVENT_TYPE,
    appUserId: args.target.clerkId,
    processedAt: now,
  });

  return {
    bucket,
    amount: applied,
    subscriptionTokens,
    topupTokens,
    total: subscriptionTokens + topupTokens,
    duplicate: false,
  };
}
