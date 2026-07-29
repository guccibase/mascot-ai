import { describe, expect, it } from "vitest";
import { affordabilityFromBalance } from "@/lib/use-affordability";

describe("affordabilityFromBalance", () => {
  it("uses available capacity when present", () => {
    const result = affordabilityFromBalance(50_000, {
      total: 100_000,
      available: 20_000,
      hasAccess: true,
    });
    expect(result.blocked).toBe(true);
    expect(result.shortfall).toBe(30_000);
  });

  it("falls back to total when available is missing", () => {
    const result = affordabilityFromBalance(50_000, {
      total: 100_000,
      hasAccess: true,
    });
    expect(result.blocked).toBe(false);
    expect(result.shortfall).toBe(0);
  });

  it("blocks while balance is loading", () => {
    const result = affordabilityFromBalance(1, undefined);
    expect(result.blocked).toBe(true);
    expect(result.loading).toBe(true);
  });

  it("requires a plan when balance is null", () => {
    const result = affordabilityFromBalance(1_000, null);
    expect(result.needsPlan).toBe(true);
    expect(result.blocked).toBe(true);
  });
});
