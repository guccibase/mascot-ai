import { describe, expect, it } from "vitest";
import {
  PLANS,
  TOPUPS,
  normalizeProductId,
  planByProductId,
  topupByProductId,
  tokensPerTerm,
} from "../plans";

describe("billing catalog", () => {
  it("maps RevenueCat subscription product ids", () => {
    expect(planByProductId("mascotai_weekly")?.id).toBe("weekly");
    expect(planByProductId("mascotai_monthly")?.id).toBe("monthly");
    expect(planByProductId("mascotai_yearly")?.id).toBe("yearly");
    expect(planByProductId("MASCOTAI_MONTHLY:monthly-base-plan")?.id).toBe(
      "monthly"
    );
  });

  it("maps top-up product ids", () => {
    expect(topupByProductId("mascotai_topup_starter")?.id).toBe(
      "topup_starter"
    );
    expect(topupByProductId("mascotai_topup_studio")?.tokens).toBe(600_000);
    expect(topupByProductId("mascotai_topup_pro")?.tokens).toBe(1_650_000);
  });

  it("matches docs/comprehensive-qa token grants", () => {
    expect(planByProductId("mascotai_weekly")?.tokensPerCycle).toBe(240_000);
    expect(planByProductId("mascotai_monthly")?.tokensPerCycle).toBe(
      1_250_000
    );
    expect(tokensPerTerm(planByProductId("mascotai_yearly")!)).toBe(
      1_250_000 * 12
    );
    expect(TOPUPS.find((t) => t.id === "topup_studio")?.tokens).toBe(600_000);
  });

  it("normalizes store-specific product id suffixes", () => {
    expect(normalizeProductId("  MascotAI_Monthly:base  ")).toBe(
      "mascotai_monthly"
    );
  });

  it("returns null for unknown products", () => {
    expect(planByProductId("unknown_sku")).toBeNull();
    expect(topupByProductId("unknown_topup")).toBeNull();
  });

  it("keeps unique plan and top-up ids", () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
    expect(new Set(TOPUPS.map((t) => t.id)).size).toBe(TOPUPS.length);
  });
});
