import { describe, expect, it } from "vitest";
import {
  mergeUserBillingFields,
  pickPreferredUser,
  shouldGrantSubscriptionFromSync,
} from "../userMerge";

type Entitlement = {
  planId: string;
  productId: string;
  status: "active" | "grace" | "expired";
  expiresAt: number;
  willRenew: boolean;
  updatedAt: number;
};

function user(partial: {
  tokenIdentifier: string;
  subscriptionTokens?: number;
  topupTokens?: number;
  tokenCycleEnd?: number;
  openHoldTotal?: number;
  entitlement?: Entitlement;
  onboardingCompletedAt?: number;
}) {
  return {
    email: "a@b.com",
    name: "A",
    ...partial,
  };
}

describe("pickPreferredUser", () => {
  it("prefers a real JWT row over pending", () => {
    const pending = user({ tokenIdentifier: "pending:user_1" });
    const real = user({ tokenIdentifier: "https://clerk|user_1" });
    expect(pickPreferredUser([pending, real])).toBe(real);
    expect(pickPreferredUser([real, pending])).toBe(real);
  });

  it("falls back to the first row when all are pending", () => {
    const a = user({ tokenIdentifier: "pending:user_1" });
    const b = user({ tokenIdentifier: "pending:user_1b" });
    expect(pickPreferredUser([a, b])).toBe(a);
  });
});

describe("mergeUserBillingFields", () => {
  it("keeps the larger token balances from either row", () => {
    const preferred = user({
      tokenIdentifier: "jwt",
      subscriptionTokens: 10,
      topupTokens: 50,
    });
    const dup = user({
      tokenIdentifier: "pending:x",
      subscriptionTokens: 240_000,
      topupTokens: 5,
      entitlement: {
        planId: "weekly",
        productId: "mascotai_weekly",
        status: "active",
        expiresAt: 9_000,
        willRenew: true,
        updatedAt: 1,
      },
      tokenCycleEnd: 9_000,
    });

    const merged = mergeUserBillingFields(preferred, dup);
    expect(merged.subscriptionTokens).toBe(240_000);
    expect(merged.topupTokens).toBe(50);
    expect(merged.entitlement?.planId).toBe("weekly");
    expect(merged.tokenCycleEnd).toBe(9_000);
  });

  it("prefers active entitlement over expired even if preferred has expired", () => {
    const preferred = user({
      tokenIdentifier: "jwt",
      entitlement: {
        planId: "weekly",
        productId: "mascotai_weekly",
        status: "expired",
        expiresAt: 100,
        willRenew: false,
        updatedAt: 1,
      },
    });
    const dup = user({
      tokenIdentifier: "pending:x",
      entitlement: {
        planId: "monthly",
        productId: "mascotai_monthly",
        status: "active",
        expiresAt: 500,
        willRenew: true,
        updatedAt: 2,
      },
    });
    expect(mergeUserBillingFields(preferred, dup).entitlement?.planId).toBe(
      "monthly"
    );
  });
});

describe("shouldGrantSubscriptionFromSync", () => {
  it("grants when the user has no active entitlement", () => {
    expect(
      shouldGrantSubscriptionFromSync(
        { entitlement: undefined, subscriptionTokens: 0 },
        "weekly",
        1_000
      )
    ).toBe(true);
  });

  it("skips grant when the same plan period is already active", () => {
    expect(
      shouldGrantSubscriptionFromSync(
        {
          entitlement: {
            planId: "weekly",
            status: "active",
            expiresAt: 1_000,
          },
          subscriptionTokens: 200_000,
        },
        "weekly",
        1_000
      )
    ).toBe(false);
  });

  it("grants on plan change or meaningful extension", () => {
    const current = {
      entitlement: {
        planId: "weekly",
        status: "active" as const,
        expiresAt: 1_000,
      },
      subscriptionTokens: 100,
    };
    expect(shouldGrantSubscriptionFromSync(current, "monthly", 1_000)).toBe(
      true
    );
    expect(shouldGrantSubscriptionFromSync(current, "weekly", 1_000 + 120_000)).toBe(
      true
    );
  });
});
