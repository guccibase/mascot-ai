/**
 * Billing catalog: the single source of truth for plans, top-ups, and the
 * token unit. Imported by Convex functions and by the Next.js UI, so this file
 * must stay dependency-free.
 *
 * A "token" here is a billing unit pegged to provider spend, not a raw model
 * token: 1 token = USD_PER_TOKEN of model cost. Every model bills at its own
 * rate (see src/lib/token-pricing.ts), which keeps the margin below identical
 * no matter which model a customer picks.
 */

/** USD of provider spend represented by one billing token. */
export const USD_PER_TOKEN = 0.00001;

/**
 * Hard ceiling for a single `tokens.reserve` hold (and settle clamp).
 * Sized above post-margin Ask AI worst case (Fable × 24 batches × large pack
 * ≈ 16.5M) with headroom; still an abuse backstop, not a plan grant.
 */
export const MAX_TOKEN_RESERVATION = 20_000_000;

/** Payment processing: Stripe 2.9% + $0.30, plus headroom for RevenueCat/tax. */
export const FEE_RATE = 0.039;
export const FEE_FIXED = 0.8;

export type PlanId = "weekly" | "monthly" | "yearly";
export type TokenCycle = "week" | "month";

export type Plan = {
  id: PlanId;
  /** RevenueCat product identifier. */
  productId: string;
  name: string;
  /** How often the customer is charged. */
  term: "week" | "month" | "year";
  /** Tokens granted per refill cycle. */
  tokensPerCycle: number;
  /** How often the token allowance refills. Yearly refills monthly. */
  cycle: TokenCycle;
  /** Refills per billing term. Used for the effective-rate math. */
  cyclesPerTerm: number;
  tagline: string;
  highlights: string[];
};

export const PLANS: readonly Plan[] = [
  {
    id: "weekly",
    productId: "mascotai_weekly",
    name: "Weekly",
    term: "week",
    tokensPerCycle: 240_000,
    cycle: "week",
    cyclesPerTerm: 1,
    tagline: "Ship one mascot this week",
    highlights: [
      "240K tokens per week",
      "All six models",
      "Unlimited saved mascots",
      "Download-ready animated SVGs",
      "Refine and add gestures anytime",
    ],
  },
  {
    id: "monthly",
    productId: "mascotai_monthly",
    name: "Monthly",
    term: "month",
    tokensPerCycle: 1_250_000,
    cycle: "month",
    cyclesPerTerm: 1,
    tagline: "For teams shipping real product",
    highlights: [
      "5.2x the tokens of weekly",
      "All six models",
      "Refine and add gestures anytime",
      "Download-ready animated SVGs",
    ],
  },
  {
    id: "yearly",
    productId: "mascotai_yearly",
    name: "Yearly",
    term: "year",
    tokensPerCycle: 1_250_000,
    cycle: "month",
    cyclesPerTerm: 12,
    tagline: "Best value. About 2.4 months free.",
    highlights: [
      "Same 1.25M tokens every month",
      "Locked-in rate for 12 months",
      "All six models",
      "Download-ready animated SVGs",
      "Refine and add gestures anytime",
    ],
  },
] as const;

export type Topup = {
  id: string;
  productId: string;
  name: string;
  tokens: number;
};

/** One-time token packs. Never expire, spent only after the plan allowance. */
export const TOPUPS: readonly Topup[] = [
  {
    id: "topup_starter",
    productId: "mascotai_topup_starter",
    name: "Starter top-up",
    tokens: 240_000,
  },
  {
    id: "topup_studio",
    productId: "mascotai_topup_studio",
    name: "Studio top-up",
    tokens: 600_000,
  },
  {
    id: "topup_pro",
    productId: "mascotai_topup_pro",
    name: "Pro top-up",
    tokens: 1_650_000,
  },
] as const;

/** RevenueCat entitlement that unlocks generation. */
export const PRO_ENTITLEMENT = "pro";

/**
 * Store identifiers are not returned verbatim. Google Play appends the base
 * plan (`mascotai_monthly:monthly-base-plan`) and casing varies by store, so
 * both sides are normalised before comparison.
 */
export function normalizeProductId(productId: string): string {
  return productId.trim().split(":")[0]!.toLowerCase();
}

export function planByProductId(productId: string): Plan | null {
  const id = normalizeProductId(productId);
  return PLANS.find((p) => normalizeProductId(p.productId) === id) ?? null;
}

export function topupByProductId(productId: string): Topup | null {
  const id = normalizeProductId(productId);
  return TOPUPS.find((t) => normalizeProductId(t.productId) === id) ?? null;
}

export function planById(id: string): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

/** Tokens a plan grants across one full billing term. */
export function tokensPerTerm(plan: Plan): number {
  return plan.tokensPerCycle * plan.cyclesPerTerm;
}

/** Blended cost per 1M tokens from a live store price. */
export function usdPerMillionTokens(plan: Plan, priceUsd: number): number {
  if (priceUsd <= 0) return 0;
  return (priceUsd / tokensPerTerm(plan)) * 1_000_000;
}

/**
 * Percentage saved per token versus a reference plan (weekly is the baseline).
 * Returns a rounded whole number so copy stays stable.
 */
export function savingsVersus(
  plan: Plan,
  baseline: Plan,
  planPriceUsd: number,
  baselinePriceUsd: number
): number {
  const rate = usdPerMillionTokens(plan, planPriceUsd);
  const baseRate = usdPerMillionTokens(baseline, baselinePriceUsd);
  if (baseRate <= 0 || rate <= 0) return 0;
  return Math.round((1 - rate / baseRate) * 100);
}

/** Advance a timestamp by one token cycle, preserving calendar month length. */
export function addCycle(timestamp: number, cycle: TokenCycle): number {
  const date = new Date(timestamp);
  if (cycle === "week") {
    date.setUTCDate(date.getUTCDate() + 7);
    return date.getTime();
  }
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  // Clamp for short months so Jan 31 -> Feb 28 rather than overflowing to March.
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
  date.setUTCDate(Math.min(day, daysInMonth));
  return date.getTime();
}
