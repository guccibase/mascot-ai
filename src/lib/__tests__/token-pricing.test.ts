import { describe, expect, it } from "vitest";
import {
  FEE_FIXED,
  FEE_RATE,
  MAX_TOKEN_RESERVATION,
  PLANS,
  TOPUPS,
  USD_PER_TOKEN,
  addCycle,
  planByProductId,
  savingsVersus,
  tokensPerTerm,
  topupByProductId,
} from "../../../convex/lib/plans";
import {
  CLAUDE_MIN_OUTPUT_TOKENS,
  MASCOT_MODEL_OPTIONS,
  mascotModelOption,
} from "../mascot-model-options";
import {
  PHASE_OUTPUT_CEILINGS,
  REFINE_MARGIN_MULTIPLIER,
  billUsageTokens,
  estimateFullCreate,
  estimateRefineReservation,
  estimateTokens,
  formatTokens,
  runsRemaining,
  tokenRate,
  tokensForUsage,
} from "../token-pricing";
import { MAX_REFINE_GESTURES } from "../refine-pack";

/** Worst-case margin: the customer burns every token they were granted. */
function marginFor(price: number, tokens: number): number {
  const cogs = tokens * USD_PER_TOKEN;
  const fees = price * FEE_RATE + FEE_FIXED;
  return (price - cogs - fees) / price;
}

/** Example store prices used only to validate token economics in tests. */
const EXAMPLE_PLAN_PRICES: Record<string, number> = {
  weekly: 9,
  monthly: 29,
  yearly: 279,
};

const EXAMPLE_TOPUP_PRICES: Record<string, number> = {
  topup_starter: 9,
  topup_studio: 19,
  topup_pro: 49,
};

const MIN_PLAN_MARGIN: Record<string, number> = {
  weekly: 0.6,
  monthly: 0.5,
  yearly: 0.4,
};

describe("plan margins", () => {
  for (const plan of PLANS) {
    it(`${plan.id} clears its margin floor when fully consumed`, () => {
      const price = EXAMPLE_PLAN_PRICES[plan.id]!;
      const margin = marginFor(price, tokensPerTerm(plan));
      expect(margin).toBeGreaterThanOrEqual(MIN_PLAN_MARGIN[plan.id]!);
    });
  }

  it("never drops below 40% on any plan", () => {
    for (const plan of PLANS) {
      const price = EXAMPLE_PLAN_PRICES[plan.id]!;
      expect(marginFor(price, tokensPerTerm(plan))).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("gets cheaper per token as the term gets longer", () => {
    const [weekly, monthly, yearly] = PLANS;
    const rate = (p: (typeof PLANS)[number]) =>
      EXAMPLE_PLAN_PRICES[p.id]! / tokensPerTerm(p);
    expect(rate(monthly!)).toBeLessThan(rate(weekly!));
    expect(rate(yearly!)).toBeLessThan(rate(monthly!));
  });

  it("reports positive savings versus weekly", () => {
    const weekly = PLANS.find((p) => p.id === "weekly")!;
    const monthly = PLANS.find((p) => p.id === "monthly")!;
    const yearly = PLANS.find((p) => p.id === "yearly")!;
    expect(
      savingsVersus(
        monthly,
        weekly,
        EXAMPLE_PLAN_PRICES.monthly,
        EXAMPLE_PLAN_PRICES.weekly
      )
    ).toBeGreaterThan(0);
    expect(
      savingsVersus(
        yearly,
        weekly,
        EXAMPLE_PLAN_PRICES.yearly,
        EXAMPLE_PLAN_PRICES.weekly
      )
    ).toBeGreaterThan(0);
  });
});

describe("top-up margins", () => {
  for (const topup of TOPUPS) {
    it(`${topup.id} clears 60%`, () => {
      const price = EXAMPLE_TOPUP_PRICES[topup.id]!;
      expect(marginFor(price, topup.tokens)).toBeGreaterThanOrEqual(0.6);
    });
  }
});

describe("product lookup", () => {
  it("resolves plans and top-ups by RevenueCat product id", () => {
    expect(planByProductId("mascotai_monthly")?.id).toBe("monthly");
    expect(topupByProductId("mascotai_topup_pro")?.tokens).toBe(1_650_000);
    expect(planByProductId("nope")).toBeNull();
    expect(topupByProductId("nope")).toBeNull();
  });

  it("keeps plan and top-up product ids unique", () => {
    const ids = [...PLANS.map((p) => p.productId), ...TOPUPS.map((t) => t.productId)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("addCycle", () => {
  it("advances a week", () => {
    const start = Date.UTC(2026, 0, 1);
    expect(addCycle(start, "week")).toBe(Date.UTC(2026, 0, 8));
  });

  it("advances a calendar month", () => {
    expect(addCycle(Date.UTC(2026, 0, 15), "month")).toBe(Date.UTC(2026, 1, 15));
  });

  it("clamps to the last day of a shorter month", () => {
    expect(addCycle(Date.UTC(2026, 0, 31), "month")).toBe(Date.UTC(2026, 1, 28));
  });

  it("rolls across a year boundary", () => {
    expect(addCycle(Date.UTC(2026, 11, 10), "month")).toBe(Date.UTC(2027, 0, 10));
  });

  it("always moves forward", () => {
    const start = Date.UTC(2026, 1, 28);
    for (const cycle of ["week", "month"] as const) {
      expect(addCycle(start, cycle)).toBeGreaterThan(start);
    }
  });
});

describe("token rates", () => {
  it("scales with published model prices", () => {
    for (const option of MASCOT_MODEL_OPTIONS) {
      const rate = tokenRate(option);
      expect(rate.input).toBeCloseTo(option.usd.input / 1_000_000 / USD_PER_TOKEN);
      expect(rate.output).toBeGreaterThan(rate.input);
    }
  });

  it("charges more for a pricier model on identical usage", () => {
    const usage = { input_tokens: 10_000, output_tokens: 20_000 };
    const luna = tokensForUsage(usage, "gpt-5.6-luna");
    const sol = tokensForUsage(usage, "gpt-5.6-sol");
    const fable = tokensForUsage(usage, "claude-fable-5");
    expect(luna).toBeLessThan(sol);
    expect(sol).toBeLessThan(fable);
  });

  it("recovers the underlying provider cost", () => {
    // 1M output tokens on Sol lists at $30, i.e. 3,000,000 billing tokens.
    expect(tokensForUsage({ output_tokens: 1_000_000 }, "gpt-5.6-sol")).toBe(
      3_000_000
    );
  });

  it("bills the model that actually ran, not the one requested", () => {
    const usage = { input_tokens: 1_000, output_tokens: 1_000 };
    const downgraded = tokensForUsage(usage, "gpt-5.6-sol", "gpt-5.6-luna");
    expect(downgraded).toBe(tokensForUsage(usage, "gpt-5.6-luna"));
  });

  it("falls back to the requested model for an unknown provider id", () => {
    const usage = { input_tokens: 1_000, output_tokens: 1_000 };
    expect(tokensForUsage(usage, "gpt-5.6-sol", "gpt-4o-mystery")).toBe(
      tokensForUsage(usage, "gpt-5.6-sol")
    );
  });

  it("treats missing or negative usage as zero", () => {
    expect(tokensForUsage(undefined, "gpt-5.6-sol")).toBe(0);
    expect(tokensForUsage({ input_tokens: -5 }, "gpt-5.6-sol")).toBe(0);
  });
});

describe("estimates", () => {
  it("costs more for more gestures", () => {
    const three = estimateTokens({ kind: "studio", gestures: 3 }, "gpt-5.6-sol");
    const six = estimateTokens({ kind: "studio", gestures: 6 }, "gpt-5.6-sol");
    expect(six.typical).toBeGreaterThan(three.typical);
    expect(six.calls).toBe(7);
    expect(three.calls).toBe(4);
  });

  it("clamps the gesture count to the range the API accepts", () => {
    const low = estimateTokens({ kind: "studio", gestures: 0 }, "gpt-5.6-sol");
    const high = estimateTokens({ kind: "studio", gestures: 99 }, "gpt-5.6-sol");
    expect(low.calls).toBe(2);
    expect(high.calls).toBe(7);
  });

  it("reserves every full-context refinement batch", () => {
    const one = estimateTokens(
      { kind: "refine", batches: 1, payloadChars: 225_000 },
      "gpt-5.6-sol"
    );
    const three = estimateTokens(
      { kind: "refine", batches: 3, payloadChars: 225_000 },
      "gpt-5.6-sol"
    );

    expect(one.calls).toBe(1);
    expect(three.calls).toBe(3);
    expect(three.max).toBeGreaterThan(one.max * 2.9);
    expect(three.typical).toBeGreaterThan(one.typical * 2.9);
  });

  it("clamps invalid refinement batch counts", () => {
    expect(
      estimateTokens({ kind: "refine", batches: 0 }, "gpt-5.6-sol").calls
    ).toBe(1);
    expect(
      estimateTokens({ kind: "refine", batches: 99 }, "gpt-5.6-sol").calls
    ).toBe(24);
  });

  it("always reserves at least the typical spend", () => {
    for (const option of MASCOT_MODEL_OPTIONS) {
      for (const action of [
        { kind: "samples" } as const,
        { kind: "studio", gestures: 6 } as const,
        { kind: "gesture" } as const,
        { kind: "refine" } as const,
        { kind: "remix", poses: 6 } as const,
      ]) {
        const estimate = estimateTokens(action, option.id);
        expect(estimate.max).toBeGreaterThanOrEqual(estimate.typical);
        expect(estimate.typical).toBeGreaterThan(0);
      }
    }
  });

  it("keeps a full create affordable on every plan", () => {
    const monthly = PLANS.find((p) => p.id === "monthly")!;
    for (const option of MASCOT_MODEL_OPTIONS) {
      const create = estimateFullCreate(3, option.id);
      expect(create.max).toBeLessThan(monthly.tokensPerCycle);
    }
  });

  it("affords at least ten full creates a month on the balanced models", () => {
    const monthly = PLANS.find((p) => p.id === "monthly")!;
    for (const id of ["gpt-5.6-luna", "gpt-5.6-terra", "claude-sonnet-5"] as const) {
      const create = estimateFullCreate(3, id);
      expect(runsRemaining(monthly.tokensPerCycle, create.typical)).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("payload-sized reservations", () => {
  const big = "x".repeat(120_000);

  it("charges for the caller's payload, not just the fixed scaffold", () => {
    const bare = estimateTokens({ kind: "refine" }, "claude-fable-5");
    const loaded = estimateTokens(
      { kind: "refine", payloadChars: big.length },
      "claude-fable-5"
    );
    expect(loaded.max).toBeGreaterThan(bare.max);
  });

  it("covers the real provider cost of a large refine payload at refine margin", () => {
    const model = "claude-fable-5";
    const reserved = estimateTokens(
      { kind: "refine", payloadChars: big.length },
      model
    ).max;

    // What the provider would bill if that payload tokenised at a realistic
    // 3.5 chars/token and the call ran to its output ceiling — then × margin.
    const cogs = tokensForUsage(
      {
        input_tokens: Math.ceil(big.length / 3.5) + 16_000,
        output_tokens: 32_000,
      },
      model
    );
    expect(reserved).toBeGreaterThanOrEqual(
      Math.ceil(cogs * REFINE_MARGIN_MULTIPLIER)
    );
  });

  it("re-charges the payload once per phase that re-sends it", () => {
    const chars = 60_000;
    const two = estimateTokens(
      { kind: "studio", gestures: 2, payloadChars: chars },
      "gpt-5.6-sol"
    );
    const four = estimateTokens(
      { kind: "studio", gestures: 4, payloadChars: chars },
      "gpt-5.6-sol"
    );
    // Two extra gesture phases, each re-sending the same sample SVG.
    expect(four.max - two.max).toBeGreaterThan(2 * (chars / 4));
  });

  it("ignores a nonsensical payload size", () => {
    const bare = estimateTokens({ kind: "gesture" }, "gpt-5.6-sol");
    expect(estimateTokens({ kind: "gesture", payloadChars: -1 }, "gpt-5.6-sol"))
      .toEqual(bare);
  });
});

describe("output ceilings", () => {
  /**
   * The `maxOutputTokens` each generate route passes. Kept here by hand so a
   * change to a route has to be mirrored in the pricing table. The estimate
   * is only a valid ceiling while these agree.
   */
  const ROUTE_CEILINGS = {
    samples: 20_000,
    bible: 8_000,
    idle: 16_000,
    studioGesture: 14_000,
    addGesture: 14_000,
    refine: 32_000,
    remixIdentity: 10_000,
    remixPose: 6_000,
  } as const;

  for (const [phase, ceiling] of Object.entries(ROUTE_CEILINGS)) {
    it(`${phase} is priced at the ceiling the route sends`, () => {
      expect(
        PHASE_OUTPUT_CEILINGS[phase as keyof typeof ROUTE_CEILINGS]
      ).toBe(ceiling);
    });
  }

  it("reserves against Claude's output floor even when a phase asks for less", () => {
    // The bible phase asks for 8,000, below Anthropic's 8,192 minimum.
    const claude = estimateTokens({ kind: "studio", gestures: 1 }, "claude-opus-5");
    const rate = tokenRate(mascotModelOption("claude-opus-5"));
    const flooredOutput = CLAUDE_MIN_OUTPUT_TOKENS * rate.output;
    expect(claude.max).toBeGreaterThanOrEqual(flooredOutput * 2);
  });
});

describe("store product identifiers", () => {
  it("matches Google Play ids that carry a base plan suffix", () => {
    expect(planByProductId("mascotai_monthly:monthly-base-plan")?.id).toBe(
      "monthly"
    );
    expect(topupByProductId("MascotAI_Topup_Pro")?.id).toBe("topup_pro");
  });

  it("still rejects an id that is not ours", () => {
    expect(planByProductId("someone_else:plan")).toBeNull();
  });
});

describe("refine margin and reservation quotes", () => {
  it("uses a 50% gross-margin multiplier", () => {
    expect(REFINE_MARGIN_MULTIPLIER).toBe(2);
  });

  it("marks up bare refine estimates by exactly ×2 COGS", () => {
    const model = "gpt-5.6-sol";
    const rate = tokenRate(mascotModelOption(model));
    // PHASES.refine: input 16_000, outputTypical 8_000, outputMax 32_000, no payload.
    const cogsTypical = 16_000 * rate.input + 8_000 * rate.output;
    const cogsMax = 16_000 * rate.input + 32_000 * rate.output;
    const estimate = estimateTokens({ kind: "refine", batches: 1 }, model);
    expect(estimate.typical).toBe(
      Math.ceil(cogsTypical * REFINE_MARGIN_MULTIPLIER)
    );
    expect(estimate.max).toBe(Math.ceil(cogsMax * REFINE_MARGIN_MULTIPLIER));
  });

  it("does not mark up studio estimates", () => {
    const model = "gpt-5.6-sol";
    const rate = tokenRate(mascotModelOption(model));
    // bible + idle scaffolds only (gestures: 1 → no studioGesture phases).
    const cogsMax =
      (7_000 + 6_500) * rate.input +
      (Math.max(8_000, 0) + 16_000) * rate.output;
    const studio = estimateTokens({ kind: "studio", gestures: 1 }, model);
    expect(studio.max).toBe(Math.ceil(cogsMax));
  });

  it("billUsageTokens applies refine margin without double-ceil inflation", () => {
    expect(billUsageTokens(1_000, 1)).toBe(1_000);
    expect(billUsageTokens(1_000, REFINE_MARGIN_MULTIPLIER)).toBe(2_000);
    expect(billUsageTokens(0, REFINE_MARGIN_MULTIPLIER)).toBe(0);
    expect(billUsageTokens(-5, REFINE_MARGIN_MULTIPLIER)).toBe(0);
  });

  it("openMeter settle path: refine usage is marked up like billUsageTokens", () => {
    // Mirrors openMeter.record: tokensForUsage (COGS) → billUsageTokens(margin).
    const cogs = tokensForUsage(
      { input_tokens: 10_000, output_tokens: 4_000 },
      "gpt-5.6-sol"
    );
    const refineCharged = billUsageTokens(cogs, REFINE_MARGIN_MULTIPLIER);
    const studioCharged = billUsageTokens(cogs, 1);
    expect(refineCharged).toBe(cogs * REFINE_MARGIN_MULTIPLIER);
    expect(studioCharged).toBe(cogs);
  });

  it("keeps Fable worst-case refine holds under MAX_TOKEN_RESERVATION", () => {
    const worst = estimateRefineReservation(
      {
        batches: MAX_REFINE_GESTURES,
        payloadChars: 500_000,
        hasReference: true,
      },
      "claude-fable-5"
    );
    expect(worst.editCost).toBeLessThanOrEqual(MAX_TOKEN_RESERVATION);
    expect(MAX_TOKEN_RESERVATION).toBeGreaterThanOrEqual(20_000_000);
  });

  it("estimateRefineReservation: min is 1-batch; edit scales with batches", () => {
    const one = estimateRefineReservation(
      { batches: 1, payloadChars: 80_000, hasReference: false },
      "gpt-5.6-luna"
    );
    const three = estimateRefineReservation(
      { batches: 3, payloadChars: 80_000, hasReference: false },
      "gpt-5.6-luna"
    );
    expect(one.minCost).toBe(one.editCost);
    expect(three.minCost).toBe(one.minCost);
    expect(three.editCost).toBeGreaterThan(three.minCost);
    expect(three.editCost).toBeGreaterThan(one.editCost * 2.9);
    expect(three.typical).toBeGreaterThan(0);
  });

  it("includes a single vision surcharge in minCost when a reference is attached", () => {
    const bare = estimateRefineReservation(
      { batches: 3, payloadChars: 40_000, hasReference: false },
      "claude-sonnet-5"
    );
    const withRef = estimateRefineReservation(
      { batches: 3, payloadChars: 40_000, hasReference: true },
      "claude-sonnet-5"
    );
    expect(withRef.minCost).toBeGreaterThan(bare.minCost);
    expect(withRef.editCost).toBeGreaterThan(withRef.minCost);
    expect(withRef.editCost - bare.editCost).toBeGreaterThan(
      withRef.minCost - bare.minCost
    );
  });
});

describe("formatTokens", () => {
  it("formats magnitudes compactly", () => {
    expect(formatTokens(1_250_000)).toBe("1.25M");
    expect(formatTokens(240_000)).toBe("240K");
    expect(formatTokens(12_000_000)).toBe("12M");
    expect(formatTokens(500)).toBe("500");
  });

  it("handles empty and invalid balances", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(-10)).toBe("0");
    expect(formatTokens(Number.NaN)).toBe("0");
  });
});

describe("runsRemaining", () => {
  it("floors to whole runs and never goes negative", () => {
    expect(runsRemaining(250_000, 100_000)).toBe(2);
    expect(runsRemaining(50_000, 100_000)).toBe(0);
    expect(runsRemaining(100, 0)).toBe(0);
  });
});
