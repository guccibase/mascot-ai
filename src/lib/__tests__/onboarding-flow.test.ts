import { describe, expect, it } from "vitest";
import {
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_STEPS,
  isOnboardingStep,
  parseOnboardingDraft,
  resolveDraftStep,
  sanitizeOnboardingFavorite,
  serializeOnboardingDraft,
} from "../onboarding-flow";

describe("ONBOARDING_STEPS", () => {
  it("includes old-way immediately after pitch", () => {
    expect(ONBOARDING_STEPS).toEqual([
      "pitch",
      "old-way",
      "building",
      "context",
      "proof",
      "examples",
    ]);
  });
});

describe("isOnboardingStep", () => {
  it("accepts known steps and rejects unknown values", () => {
    expect(isOnboardingStep("old-way")).toBe(true);
    expect(isOnboardingStep("proof")).toBe(true);
    expect(isOnboardingStep("legacy-step")).toBe(false);
    expect(isOnboardingStep(null)).toBe(false);
  });
});

describe("resolveDraftStep", () => {
  it("keeps pitch and old-way as-is", () => {
    expect(resolveDraftStep("pitch", 1)).toBe("pitch");
    expect(resolveDraftStep("old-way", 1)).toBe("old-way");
  });

  it("routes v1 mid-flow drafts through old-way once", () => {
    expect(resolveDraftStep("building", 1)).toBe("old-way");
    expect(resolveDraftStep("context", undefined)).toBe("old-way");
    expect(resolveDraftStep("examples", 1)).toBe("old-way");
  });

  it("keeps current-version drafts on their saved step", () => {
    expect(resolveDraftStep("building", ONBOARDING_FLOW_VERSION)).toBe(
      "building"
    );
    expect(resolveDraftStep("proof", ONBOARDING_FLOW_VERSION)).toBe("proof");
  });
});

describe("sanitizeOnboardingFavorite", () => {
  it("keeps public example slugs and clears invalid values", () => {
    expect(sanitizeOnboardingFavorite("lyra")).toBe("lyra");
    expect(sanitizeOnboardingFavorite("zephyr")).toBeNull();
    expect(sanitizeOnboardingFavorite("unknown")).toBeNull();
    expect(sanitizeOnboardingFavorite(null)).toBeNull();
    expect(sanitizeOnboardingFavorite(undefined)).toBeNull();
  });
});

describe("parseOnboardingDraft", () => {
  it("returns null for invalid JSON or unknown steps", () => {
    expect(parseOnboardingDraft("{")).toBeNull();
    expect(parseOnboardingDraft(JSON.stringify({ step: "legacy" }))).toBeNull();
  });

  it("migrates legacy drafts and stamps the current flow version on save", () => {
    const parsed = parseOnboardingDraft(
      JSON.stringify({
        step: "context",
        useCase: "web",
        stack: "Next.js",
        version: 1,
      })
    );

    expect(parsed).toMatchObject({
      step: "old-way",
      useCase: "web",
      stack: "Next.js",
    });

    const roundTrip = parseOnboardingDraft(
      serializeOnboardingDraft(parsed!)
    );
    expect(roundTrip?.step).toBe("old-way");
    expect(JSON.parse(serializeOnboardingDraft(parsed!)).version).toBe(
      ONBOARDING_FLOW_VERSION
    );
  });

  it("drops non-public favorite slugs from stored drafts", () => {
    const parsed = parseOnboardingDraft(
      JSON.stringify({
        step: "examples",
        favorite: "zephyr",
        version: ONBOARDING_FLOW_VERSION,
      })
    );

    expect(parsed?.favorite).toBeNull();
  });
});
