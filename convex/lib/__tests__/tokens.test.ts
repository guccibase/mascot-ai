import { describe, expect, it } from "vitest";
import type { Doc } from "../../_generated/dataModel";
import { PLANS, addCycle, planById } from "../plans";
import { activePlan, projectBalances } from "../tokens";

const MONTHLY = planById("monthly")!;
const YEARLY = planById("yearly")!;
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

/**
 * A minimal users row. `projectBalances` and `activePlan` only read the
 * balance and entitlement fields, so the rest is filler to satisfy the type.
 */
function user(overrides: Partial<Doc<"users">> = {}): Doc<"users"> {
  return {
    _id: "users:test" as Doc<"users">["_id"],
    _creationTime: NOW,
    clerkId: "user_test",
    tokenIdentifier: "https://clerk|user_test",
    email: "test@example.com",
    name: "Test",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Doc<"users">;
}

function entitled(
  planId: string,
  overrides: Partial<NonNullable<Doc<"users">["entitlement"]>> = {}
): NonNullable<Doc<"users">["entitlement"]> {
  return {
    planId,
    productId: `mascotai_${planId}`,
    status: "active",
    expiresAt: NOW + 30 * DAY,
    willRenew: true,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("activePlan", () => {
  it("is null without an entitlement", () => {
    expect(activePlan(user(), NOW)).toBeNull();
  });

  it("still spends during a billing-issue grace window", () => {
    const grace = user({ entitlement: entitled("monthly", { status: "grace" }) });
    expect(activePlan(grace, NOW)?.id).toBe("monthly");
  });

  it("stops at the expiry, and stays stopped once marked expired", () => {
    const lapsed = user({
      entitlement: entitled("monthly", { expiresAt: NOW - 1 }),
    });
    expect(activePlan(lapsed, NOW)).toBeNull();

    const marked = user({
      entitlement: entitled("monthly", { status: "expired" }),
    });
    expect(activePlan(marked, NOW)).toBeNull();
  });

  it("is null for a plan id no longer in the catalog", () => {
    const retired = user({ entitlement: entitled("legacy_gold") });
    expect(activePlan(retired, NOW)).toBeNull();
  });
});

describe("projectBalances", () => {
  it("leaves the balance alone before the cycle ends", () => {
    const before = user({
      entitlement: entitled("monthly"),
      subscriptionTokens: 400_000,
      topupTokens: 50_000,
      tokenCycleEnd: NOW + DAY,
    });
    const result = projectBalances(before, NOW);
    expect(result.refilled).toBe(false);
    expect(result.subscriptionTokens).toBe(400_000);
    expect(result.total).toBe(450_000);
  });

  it("refills exactly once when the cycle has rolled", () => {
    const rolled = user({
      entitlement: entitled("monthly"),
      subscriptionTokens: 12_000,
      tokenCycleEnd: NOW - DAY,
    });
    const first = projectBalances(rolled, NOW);
    expect(first.refilled).toBe(true);
    expect(first.subscriptionTokens).toBe(MONTHLY.tokensPerCycle);

    // Persisting that result and re-projecting must not grant a second time.
    const persisted = user({
      ...rolled,
      subscriptionTokens: first.subscriptionTokens,
      tokenCycleEnd: first.cycleEnd!,
    });
    expect(projectBalances(persisted, NOW).refilled).toBe(false);
  });

  it("does not stack allowances across several missed cycles", () => {
    const stale = user({
      entitlement: entitled("yearly", { expiresAt: NOW + 300 * DAY }),
      subscriptionTokens: 0,
      tokenCycleEnd: NOW - 100 * DAY,
    });
    const result = projectBalances(stale, NOW);
    expect(result.subscriptionTokens).toBe(YEARLY.tokensPerCycle);
    expect(result.cycleEnd).toBeGreaterThan(NOW);
  });

  it("seeds a first cycle when none is recorded, then holds", () => {
    const fresh = user({ entitlement: entitled("monthly") });
    const seeded = projectBalances(fresh, NOW);
    expect(seeded.refilled).toBe(true);
    expect(seeded.cycleEnd).toBe(addCycle(NOW, "month"));

    const persisted = user({
      ...fresh,
      subscriptionTokens: seeded.subscriptionTokens,
      tokenCycleEnd: seeded.cycleEnd!,
    });
    expect(projectBalances(persisted, NOW).refilled).toBe(false);
  });

  it("keeps top-ups spendable once the plan lapses", () => {
    const lapsed = user({
      entitlement: entitled("monthly", { expiresAt: NOW - DAY }),
      subscriptionTokens: 900_000,
      topupTokens: 120_000,
    });
    const result = projectBalances(lapsed, NOW);
    expect(result.subscriptionTokens).toBe(0);
    expect(result.topupTokens).toBe(120_000);
    expect(result.total).toBe(120_000);
    expect(result.cycleEnd).toBeNull();
  });

  it("never reports a negative balance from corrupt data", () => {
    const corrupt = user({ subscriptionTokens: -50, topupTokens: -10 });
    const result = projectBalances(corrupt, NOW);
    expect(result.total).toBe(0);
  });

  it("always advances the cycle past now, whatever the stored value", () => {
    for (const plan of PLANS) {
      const ancient = user({
        entitlement: entitled(plan.id, { expiresAt: NOW + 400 * DAY }),
        tokenCycleEnd: Date.UTC(1990, 0, 1),
      });
      const result = projectBalances(ancient, NOW);
      expect(result.cycleEnd).toBeGreaterThan(NOW);
    }
  });
});
