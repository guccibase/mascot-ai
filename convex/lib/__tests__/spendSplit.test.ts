import { describe, expect, it } from "vitest";
import { refundTokenHold, splitTokenHold } from "../spendSplit";

describe("splitTokenHold", () => {
  it("draws subscription tokens before top-up", () => {
    expect(splitTokenHold(500, 300, 400)).toEqual({
      fromSubscription: 300,
      fromTopup: 200,
      totalAvailable: 700,
      sufficient: true,
    });
  });

  it("uses only subscription when hold fits", () => {
    expect(splitTokenHold(100, 500, 200)).toEqual({
      fromSubscription: 100,
      fromTopup: 0,
      totalAvailable: 700,
      sufficient: true,
    });
  });

  it("uses only top-up when subscription is empty", () => {
    expect(splitTokenHold(100, 0, 500)).toEqual({
      fromSubscription: 0,
      fromTopup: 100,
      totalAvailable: 500,
      sufficient: true,
    });
  });

  it("reports insufficient when hold exceeds balance", () => {
    expect(splitTokenHold(1000, 200, 100).sufficient).toBe(false);
  });
});

describe("refundTokenHold", () => {
  it("returns unused hold to top-up first", () => {
    expect(refundTokenHold(1000, 400, 400)).toEqual({
      topupBack: 400,
      subscriptionBack: 200,
    });
  });

  it("returns zero when fully charged", () => {
    expect(refundTokenHold(500, 500, 200)).toEqual({
      topupBack: 0,
      subscriptionBack: 0,
    });
  });

  it("refunds only subscription when hold drew no top-up", () => {
    expect(refundTokenHold(300, 100, 0)).toEqual({
      topupBack: 0,
      subscriptionBack: 200,
    });
  });

  it("clamps when charged exceeds hold", () => {
    expect(refundTokenHold(100, 150, 40)).toEqual({
      topupBack: 0,
      subscriptionBack: 0,
    });
  });
});
