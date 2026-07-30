import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type Entitlement = NonNullable<Doc<"users">["entitlement"]>;

const STATUS_RANK: Record<Entitlement["status"], number> = {
  expired: 0,
  grace: 1,
  active: 2,
};

/** Prefer a JWT-backed row over a Clerk-webhook `pending:` placeholder. */
export function pickPreferredUser<T extends { tokenIdentifier: string }>(
  matches: readonly T[]
): T {
  if (matches.length === 0) {
    throw new Error("pickPreferredUser requires at least one user");
  }
  return (
    matches.find((u) => !u.tokenIdentifier.startsWith("pending:")) ?? matches[0]!
  );
}

function betterEntitlement(
  a: Entitlement | undefined,
  b: Entitlement | undefined
): Entitlement | undefined {
  if (!a) return b;
  if (!b) return a;
  const rankDiff = STATUS_RANK[b.status] - STATUS_RANK[a.status];
  if (rankDiff !== 0) return rankDiff > 0 ? b : a;
  if (b.expiresAt !== a.expiresAt) return b.expiresAt > a.expiresAt ? b : a;
  return (b.updatedAt ?? 0) >= (a.updatedAt ?? 0) ? b : a;
}

export type MergableBillingUser = {
  subscriptionTokens?: number;
  topupTokens?: number;
  tokenCycleEnd?: number;
  openHoldTotal?: number;
  entitlement?: Entitlement;
  onboardingCompletedAt?: number;
  onboarding?: Doc<"users">["onboarding"];
  email?: string;
  name?: string;
  imageUrl?: string;
};

/**
 * Merge billing/profile fields from a duplicate onto the preferred survivor.
 * Token balances take the max so a grant on either row is preserved.
 */
export function mergeUserBillingFields(
  preferred: MergableBillingUser,
  dup: MergableBillingUser
): MergableBillingUser {
  const entitlement = betterEntitlement(preferred.entitlement, dup.entitlement);
  const entitlementFromDup = entitlement === dup.entitlement;

  return {
    subscriptionTokens: Math.max(
      preferred.subscriptionTokens ?? 0,
      dup.subscriptionTokens ?? 0
    ),
    topupTokens: Math.max(preferred.topupTokens ?? 0, dup.topupTokens ?? 0),
    openHoldTotal:
      (preferred.openHoldTotal ?? 0) + (dup.openHoldTotal ?? 0) || undefined,
    entitlement,
    tokenCycleEnd: entitlementFromDup
      ? (dup.tokenCycleEnd ?? preferred.tokenCycleEnd)
      : (preferred.tokenCycleEnd ?? dup.tokenCycleEnd),
    onboardingCompletedAt:
      preferred.onboardingCompletedAt ?? dup.onboardingCompletedAt,
    onboarding: preferred.onboarding ?? dup.onboarding,
    email: preferred.email || dup.email,
    name: preferred.name || dup.name,
    imageUrl: preferred.imageUrl ?? dup.imageUrl,
  };
}

/**
 * Sync catch-up must not re-run `activate` (which resets the cycle allowance)
 * when the webhook already granted the same plan period.
 */
export function shouldGrantSubscriptionFromSync(
  user: {
    entitlement?: Pick<Entitlement, "planId" | "status" | "expiresAt">;
    subscriptionTokens?: number;
  },
  planId: string,
  expiresAtMs: number
): boolean {
  const entitlement = user.entitlement;
  if (!entitlement || entitlement.status === "expired") return true;
  if (entitlement.planId !== planId) return true;
  // Meaningful extension (e.g. renewal already applied with a later expiry).
  if (expiresAtMs > entitlement.expiresAt + 60_000) return true;
  return false;
}

const REASSIGN_BATCH = 100;

async function reassignUserOwnedRows(
  ctx: MutationCtx,
  fromUserId: Id<"users">,
  toUserId: Id<"users">
): Promise<void> {
  const mascots = await ctx.db
    .query("mascots")
    .withIndex("by_user_updated", (q) => q.eq("userId", fromUserId))
    .take(REASSIGN_BATCH);
  for (const row of mascots) {
    await ctx.db.patch(row._id, { userId: toUserId });
  }

  const ledger = await ctx.db
    .query("tokenLedger")
    .withIndex("by_user_created", (q) => q.eq("userId", fromUserId))
    .take(REASSIGN_BATCH);
  for (const row of ledger) {
    await ctx.db.patch(row._id, { userId: toUserId });
  }

  const holds = await ctx.db
    .query("tokenReservations")
    .withIndex("by_user_expires", (q) => q.eq("userId", fromUserId))
    .take(REASSIGN_BATCH);
  for (const row of holds) {
    await ctx.db.patch(row._id, { userId: toUserId });
  }

  const refs = await ctx.db
    .query("referenceAssets")
    .withIndex("by_user", (q) => q.eq("userId", fromUserId))
    .take(REASSIGN_BATCH);
  for (const row of refs) {
    await ctx.db.patch(row._id, { userId: toUserId });
  }
}

/**
 * Collapse duplicate `users` rows for one Clerk id. Merges balances/entitlement
 * onto the preferred row, reassigns owned rows, then deletes the duplicate.
 */
export async function resolveUsersByClerkId(
  ctx: MutationCtx,
  clerkId: string
): Promise<Doc<"users"> | null> {
  const matches = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
    .take(2);
  if (matches.length === 0) return null;

  const preferred = pickPreferredUser(matches);
  for (const dup of matches) {
    if (dup._id === preferred._id) continue;
    const merged = mergeUserBillingFields(preferred, dup);
    await ctx.db.patch(preferred._id, {
      ...merged,
      updatedAt: Date.now(),
    });
    await reassignUserOwnedRows(ctx, dup._id, preferred._id);
    await ctx.db.delete(dup._id);
  }

  const refreshed = await ctx.db.get(preferred._id);
  if (!refreshed) throw new Error("User missing after merge");
  return refreshed;
}
