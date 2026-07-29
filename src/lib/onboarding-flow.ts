import { isPublicExampleSlug } from "./mascots";

/** Bump when step order or required screens change. */
export const ONBOARDING_FLOW_VERSION = 2;

export const ONBOARDING_STEPS = [
  "pitch",
  "old-way",
  "building",
  "context",
  "proof",
  "examples",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const OLD_WAY_POINTS = [
  {
    label: "Hundreds — sometimes thousands",
    detail:
      "Hiring a designer or studio usually runs hundreds of dollars, sometimes into the thousands, for a character and a handful of poses.",
  },
  {
    label: "Weeks to months",
    detail:
      "Turnaround is commonly weeks to months — and every revision loop starts the clock again.",
  },
  {
    label: "Still unfinished for product",
    detail:
      "You get static art, maybe a few expressions, then still have to figure out animation, exports, and how it lives in the app.",
  },
] as const;

export type OnboardingDraft = {
  step: OnboardingStep;
  useCase: string | null;
  stack: string;
  referral: string | null;
  paidBefore: string | null;
  favorite: string | null;
};

type StoredOnboardingDraft = OnboardingDraft & {
  version?: number;
};

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return (
    typeof value === "string" &&
    (ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

/** v1 drafts saved mid-flow never saw `old-way`; route them there once. */
export function resolveDraftStep(
  step: OnboardingStep,
  draftVersion: number | undefined
): OnboardingStep {
  if (step === "pitch" || step === "old-way") return step;
  if ((draftVersion ?? 1) < ONBOARDING_FLOW_VERSION) return "old-way";
  return step;
}

/** Only public example slugs may be stored as onboarding favorites. */
export function sanitizeOnboardingFavorite(
  favorite: string | null | undefined
): string | null {
  if (!favorite || !isPublicExampleSlug(favorite)) return null;
  return favorite;
}

export function parseOnboardingDraft(raw: string): OnboardingDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredOnboardingDraft>;
    if (!isOnboardingStep(parsed.step)) return null;

    return {
      step: resolveDraftStep(parsed.step, parsed.version),
      useCase: typeof parsed.useCase === "string" ? parsed.useCase : null,
      stack: typeof parsed.stack === "string" ? parsed.stack : "",
      referral: typeof parsed.referral === "string" ? parsed.referral : null,
      paidBefore:
        typeof parsed.paidBefore === "string" ? parsed.paidBefore : null,
      favorite: sanitizeOnboardingFavorite(
        typeof parsed.favorite === "string" ? parsed.favorite : null
      ),
    };
  } catch {
    return null;
  }
}

export function serializeOnboardingDraft(draft: OnboardingDraft): string {
  const stored: StoredOnboardingDraft = {
    ...draft,
    version: ONBOARDING_FLOW_VERSION,
  };
  return JSON.stringify(stored);
}
