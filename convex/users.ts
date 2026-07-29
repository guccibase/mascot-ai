import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import { isPublicExampleSlug } from "./lib/publicExamples";
import { validators } from "./schema";

const userProfile = v.object({
  _id: v.id("users"),
  name: v.string(),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  clerkId: v.string(),
  onboardingCompletedAt: v.optional(v.number()),
  onboarding: v.optional(validators.onboarding),
});

export const me = query({
  args: {},
  returns: v.union(userProfile, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      clerkId: user.clerkId,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboarding: user.onboarding,
    };
  },
});

/** Call once after sign-in so the Convex users row exists. */
export const ensure = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const user = await ensureCurrentUser(ctx);
    return user._id;
  },
});

/** Trim and length-cap a free-text answer; empty becomes undefined. */
function answer(value: string | undefined, max: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Only persist favorites from the public example allowlist. */
function publicFavoriteExample(value: string | undefined) {
  const trimmed = answer(value, 64);
  if (!trimmed || !isPublicExampleSlug(trimmed)) return undefined;
  return trimmed;
}

export const completeOnboarding = mutation({
  args: {
    useCase: v.string(),
    stack: v.optional(v.string()),
    referral: v.optional(v.string()),
    paidBefore: v.optional(v.string()),
    favoriteExample: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const useCase = args.useCase.trim();
    if (useCase.length < 1 || useCase.length > 64) {
      throw new Error("Pick what you're building");
    }

    const user = await ensureCurrentUser(ctx);
    const now = Date.now();
    await ctx.db.patch(user._id, {
      onboardingCompletedAt: now,
      onboarding: {
        useCase,
        // Preserve answers from the earlier onboarding rather than dropping them.
        goals: user.onboarding?.goals,
        stack: answer(args.stack, 120),
        referral: answer(args.referral, 64),
        paidBefore: answer(args.paidBefore, 32),
        favoriteExample: publicFavoriteExample(args.favoriteExample),
      },
      updatedAt: now,
    });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const name = args.name.trim();
    if (name.length < 1 || name.length > 80) {
      throw new Error("Name must be 1 to 80 characters");
    }
    await ctx.db.patch(user._id, {
      name,
      updatedAt: Date.now(),
    });
    return null;
  },
});
