import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { grantTokensAsAdmin } from "./lib/adminGrant";
import { requireAdmin, roleFromIdentity } from "./lib/auth";
import { spendableTokens } from "./lib/spendCapacity";
import { activePlan, projectBalances, sumOpenHoldAmount } from "./lib/tokens";

const emptyPage = {
  page: [] as never[],
  isDone: true,
  continueCursor: "",
  splitCursor: null,
  pageStatus: null,
};

/** Cap mascot sampling so detail stays cheap for power users. */
const MASCOT_COUNT_CAP = 100;

const ledgerKind = v.union(
  v.literal("grant"),
  v.literal("charge"),
  v.literal("refund"),
  v.literal("revoke"),
  v.literal("writeoff")
);
const ledgerBucket = v.union(v.literal("subscription"), v.literal("topup"));

const userListRow = v.object({
  _id: v.id("users"),
  name: v.string(),
  email: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  createdAt: v.number(),
  planId: v.union(v.string(), v.null()),
  planStatus: v.union(v.string(), v.null()),
  subscriptionTokens: v.number(),
  topupTokens: v.number(),
  totalTokens: v.number(),
  hasAccess: v.boolean(),
});

const ledgerRow = v.object({
  _id: v.id("tokenLedger"),
  kind: ledgerKind,
  bucket: ledgerBucket,
  amount: v.number(),
  balanceAfter: v.number(),
  reason: v.string(),
  model: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

const userDetail = v.object({
  _id: v.id("users"),
  clerkId: v.string(),
  name: v.string(),
  email: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
  onboardingCompletedAt: v.union(v.number(), v.null()),
  onboarding: v.union(
    v.object({
      useCase: v.string(),
      goals: v.optional(v.array(v.string())),
      favoriteExample: v.optional(v.string()),
      stack: v.optional(v.string()),
      referral: v.optional(v.string()),
      paidBefore: v.optional(v.string()),
    }),
    v.null()
  ),
  planId: v.union(v.string(), v.null()),
  planName: v.union(v.string(), v.null()),
  planStatus: v.union(v.string(), v.null()),
  willRenew: v.boolean(),
  expiresAt: v.union(v.number(), v.null()),
  cycleEnd: v.union(v.number(), v.null()),
  subscriptionTokens: v.number(),
  topupTokens: v.number(),
  totalTokens: v.number(),
  held: v.number(),
  available: v.number(),
  hasAccess: v.boolean(),
  mascotCount: v.number(),
  mascotCountCapped: v.boolean(),
  ledgerSummary: v.object({
    grants: v.number(),
    charges: v.number(),
    net: v.number(),
  }),
});

function summarizeUserRow(user: Doc<"users">, now: number) {
  const plan = activePlan(user, now);
  const projected = projectBalances(user, now);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl ?? null,
    createdAt: user.createdAt,
    planId: plan?.id ?? null,
    planStatus: user.entitlement?.status ?? null,
    subscriptionTokens: projected.subscriptionTokens,
    topupTokens: projected.topupTokens,
    totalTokens: projected.total,
    hasAccess: plan !== null || projected.topupTokens > 0,
  };
}

function isAdminIdentity(identity: { [key: string]: unknown } | null) {
  return roleFromIdentity(identity) === "admin";
}

/** Paginated user directory for admins, newest first. */
export const listUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    /** Exact email match via index; omit to browse all users. */
    email: v.optional(v.string()),
    now: v.number(),
  },
  returns: paginationResultValidator(userListRow),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdminIdentity(identity as { [key: string]: unknown })) {
      return emptyPage;
    }

    const email = args.email?.trim();
    if (email) {
      const byId = new Map<string, Doc<"users">>();
      for (const candidate of [email, email.toLowerCase()]) {
        const hits = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", candidate))
          .take(10);
        for (const hit of hits) byId.set(hit._id, hit);
      }
      const matches = [...byId.values()];
      return {
        page: matches.map((user) => summarizeUserRow(user, args.now)),
        isDone: true,
        continueCursor: "",
        splitCursor: null,
        pageStatus: null,
      };
    }

    const result = await ctx.db
      .query("users")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((user) => summarizeUserRow(user, args.now)),
    };
  },
});

/** Rich profile + token analytics for a single user. */
export const getUserDetail = query({
  args: {
    userId: v.id("users"),
    now: v.number(),
  },
  returns: v.union(userDetail, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdminIdentity(identity as { [key: string]: unknown })) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const plan = activePlan(user, args.now);
    const projected = projectBalances(user, args.now);
    const openHolds = await sumOpenHoldAmount(ctx, user._id, args.now);
    const available = openHolds.truncated
      ? 0
      : spendableTokens(projected.total, openHolds.total);

    const mascotSample = await ctx.db
      .query("mascots")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .take(MASCOT_COUNT_CAP + 1);
    const mascotCountCapped = mascotSample.length > MASCOT_COUNT_CAP;
    const mascotCount = Math.min(mascotSample.length, MASCOT_COUNT_CAP);

    const ledgerSample = await ctx.db
      .query("tokenLedger")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);

    let grants = 0;
    let charges = 0;
    for (const row of ledgerSample) {
      if (row.amount > 0) grants += row.amount;
      else charges += -row.amount;
    }

    return {
      _id: user._id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      onboarding: user.onboarding ?? null,
      planId: plan?.id ?? null,
      planName: plan?.name ?? null,
      planStatus: user.entitlement?.status ?? null,
      willRenew: user.entitlement?.willRenew ?? false,
      expiresAt: user.entitlement?.expiresAt ?? null,
      cycleEnd: projected.cycleEnd,
      subscriptionTokens: projected.subscriptionTokens,
      topupTokens: projected.topupTokens,
      totalTokens: projected.total,
      held: openHolds.total,
      available,
      hasAccess: plan !== null || projected.topupTokens > 0,
      mascotCount,
      mascotCountCapped,
      ledgerSummary: {
        grants,
        charges,
        net: grants - charges,
      },
    };
  },
});

/** Paginated token ledger for admin audit. */
export const userLedger = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(ledgerRow),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdminIdentity(identity as { [key: string]: unknown })) {
      return emptyPage;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) return emptyPage;

    const result = await ctx.db
      .query("tokenLedger")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((row) => ({
        _id: row._id,
        kind: row.kind,
        bucket: row.bucket,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        reason: row.reason,
        model: row.model ?? null,
        createdAt: row.createdAt,
      })),
    };
  },
});

/** Grant tokens to a user. Logged in tokenLedger with admin id in reason. */
export const grantTokens = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    idempotencyKey: v.string(),
    bucket: v.optional(v.union(v.literal("topup"), v.literal("subscription"))),
    note: v.optional(v.string()),
  },
  returns: v.object({
    bucket: v.union(v.literal("topup"), v.literal("subscription")),
    amount: v.number(),
    subscriptionTokens: v.number(),
    topupTokens: v.number(),
    total: v.number(),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { user: admin } = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }

    return await grantTokensAsAdmin(ctx, {
      target,
      adminUserId: admin._id,
      amount: args.amount,
      idempotencyKey: args.idempotencyKey,
      bucket: args.bucket,
      note: args.note,
    });
  },
});
