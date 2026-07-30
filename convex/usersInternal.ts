import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { resolveUsersByClerkId } from "./lib/userMerge";

const DELETE_BATCH = 100;

export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Merge-safe dedupe: never delete a pending row that already holds a grant.
    const existing = await resolveUsersByClerkId(ctx, args.clerkId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email || existing.email,
        name: args.name || existing.name,
        imageUrl: args.imageUrl ?? existing.imageUrl,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.insert("users", {
      clerkId: args.clerkId,
      tokenIdentifier: `pending:${args.clerkId}`,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // `.first()`, not `.unique()`: duplicate rows for one Clerk id are a race
    // this codebase already expects, and throwing here would wedge the Clerk
    // webhook into retrying a request that can never succeed.
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return null;

    const mascots = await ctx.db
      .query("mascots")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .take(DELETE_BATCH);

    for (const m of mascots) {
      await ctx.db.delete(m._id);
    }

    if (mascots.length === DELETE_BATCH) {
      // More remain. Schedule another pass (avoids mutation timeouts).
      await ctx.scheduler.runAfter(0, internal.usersInternal.deleteByClerkId, {
        clerkId: args.clerkId,
      });
      return null;
    }

    // Billing rows are owned by the user, so they go too. Otherwise they
    // outlive the account with no way to reach them.
    const ledger = await ctx.db
      .query("tokenLedger")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .take(DELETE_BATCH);
    for (const row of ledger) await ctx.db.delete(row._id);

    const holds = await ctx.db
      .query("tokenReservations")
      .withIndex("by_user_expires", (q) => q.eq("userId", user._id))
      .take(DELETE_BATCH);
    for (const hold of holds) await ctx.db.delete(hold._id);

    if (ledger.length === DELETE_BATCH || holds.length === DELETE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.usersInternal.deleteByClerkId, {
        clerkId: args.clerkId,
      });
      return null;
    }

    await ctx.db.delete(user._id);
    return null;
  },
});
