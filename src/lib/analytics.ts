"use client";

import { track } from "@vercel/analytics";

/** Vercel keeps this many property keys per event on Pro; the rest are lost. */
const MAX_PROPERTIES = 2;

/** What each generation route is doing, used across the generate events. */
export type GenerateAction =
  | "samples"
  | "studio"
  | "gesture"
  | "refine"
  | "remix"
  | "appAssetSamples"
  | "appAssetPack";

/**
 * Every event the app emits, with its exact properties.
 *
 * Two rules govern this map. Each event carries at most `MAX_PROPERTIES` keys,
 * because Vercel's collector silently drops the rest. When a third dimension
 * is genuinely needed, emit a second event instead of widening one, the way
 * `onboarding_profile` extends `onboarding_completed`. And every value stays
 * low-cardinality and free of anything a person typed: names, briefs, prompts
 * and email addresses never belong in here.
 */
type Events = {
  /** Fired on entering each onboarding step, to show where people drop out. */
  onboarding_step: { step: string };
  onboarding_completed: { useCase: string; referral: string };
  /** The second half of `onboarding_completed`, split to fit the key budget. */
  onboarding_profile: { stack: string; paidBefore: string };

  checkout_started: { product: string; kind: "plan" | "topup" };
  /** Closing the payment sheet: the common, non-error way a purchase ends. */
  checkout_cancelled: { product: string };
  checkout_failed: { product: string; errorCode: number };
  /** Tokens actually landed, which the RevenueCat webhook drives. */
  checkout_completed: { kind: "plan" | "topup"; plan: string };
  billing_portal_opened: { plan: string };

  model_selected: { model: string; provider: string };

  generate_started: { action: GenerateAction; model: string };
  generate_completed: { action: GenerateAction; model: string };
  generate_failed: { action: GenerateAction; reason: string };
  /** A 402 from the metering layer: out of tokens, or never had a plan. */
  paywall_hit: { action: GenerateAction; code: string };

  /** The moment a customer takes real value out of the product. */
  mascot_downloaded: { kind: "pose" | "pack"; gestures: number };

  /** App icon / favicon / PWA asset exports. */
  app_assets_downloaded: { kind: "single" | "pack" };
};

/**
 * Send one analytics event. A no-op unless the Vercel script is live, so it is
 * safe to call locally and in tests.
 */
export function trackEvent<K extends keyof Events>(
  name: K,
  properties: Events[K]
): void {
  const entries = Object.entries(properties);

  if (
    entries.length > MAX_PROPERTIES &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      `[analytics] "${name}" has ${entries.length} properties; Vercel keeps ${MAX_PROPERTIES}`
    );
  }

  track(name, Object.fromEntries(entries.slice(0, MAX_PROPERTIES)));
}

const PAYWALL_CODES = ["NO_SUBSCRIPTION", "INSUFFICIENT_TOKENS"];

/**
 * Split a failed generation into "they ran out of money" and "it broke", which
 * are the two very different things a failure can mean here.
 *
 * Only the error code travels. Messages from the generate routes can quote the
 * customer's own brief, which has no place in analytics.
 */
export function trackGenerationFailure(
  action: GenerateAction,
  code?: string
): void {
  if (code && PAYWALL_CODES.includes(code)) {
    trackEvent("paywall_hit", { action, code });
    return;
  }
  trackEvent("generate_failed", { action, reason: code ?? "error" });
}

/**
 * Collapse an optional answer to something countable. An unanswered question
 * is a real signal, so it gets its own bucket rather than being dropped.
 */
export function answered(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "skipped";
}

/**
 * Keep a free-text answer out of analytics. Anything the customer typed that
 * is not one of our own suggestions becomes "other", so the dimension stays
 * bounded and carries nothing personal.
 */
export function oneOf(
  value: string | null | undefined,
  allowed: readonly string[]
): string {
  const trimmed = value?.trim();
  if (!trimmed) return "skipped";
  return allowed.includes(trimmed) ? trimmed : "other";
}
