import { describe, expect, it } from "vitest";
import {
  canHardDeleteDeferredHold,
  deferredCaptureCeiling,
  DEFERRED_SETTLE_GRACE_MS,
  isDeferredReservation,
  settleEventId,
  spendableTokens,
} from "../spendCapacity";

describe("spendableTokens", () => {
  it("subtracts open holds from the wallet", () => {
    expect(spendableTokens(100_000, 23_000)).toBe(77_000);
  });

  it("never goes negative", () => {
    expect(spendableTokens(1_000, 5_000)).toBe(0);
  });

  it("floors fractional inputs", () => {
    expect(spendableTokens(100.9, 10.2)).toBe(90);
  });

  it("treats empty wallet as zero capacity", () => {
    expect(spendableTokens(0, 0)).toBe(0);
  });
});

describe("isDeferredReservation", () => {
  it("is true only when deferred is explicitly true", () => {
    expect(isDeferredReservation({ deferred: true })).toBe(true);
    expect(isDeferredReservation({ deferred: false })).toBe(false);
    expect(isDeferredReservation({})).toBe(false);
  });
});

describe("deferredCaptureCeiling", () => {
  it("allows refine overrun only within capacity left after peer holds", () => {
    expect(deferredCaptureCeiling(100_000, 80_000, 50_000)).toEqual({
      toCharge: 20_000,
      writeoff: 30_000,
    });
  });

  it("charges the full request when peers leave enough room", () => {
    expect(deferredCaptureCeiling(100_000, 10_000, 40_000)).toEqual({
      toCharge: 40_000,
      writeoff: 0,
    });
  });

  it("charges nothing when peers earmark the whole wallet", () => {
    expect(deferredCaptureCeiling(50_000, 50_000, 10_000)).toEqual({
      toCharge: 0,
      writeoff: 10_000,
    });
  });
});

describe("canHardDeleteDeferredHold", () => {
  it("keeps the row through the settle grace window", () => {
    const expiresAt = 1_000_000;
    expect(canHardDeleteDeferredHold(expiresAt, expiresAt + 1)).toBe(false);
    expect(
      canHardDeleteDeferredHold(expiresAt, expiresAt + DEFERRED_SETTLE_GRACE_MS - 1)
    ).toBe(false);
    expect(
      canHardDeleteDeferredHold(expiresAt, expiresAt + DEFERRED_SETTLE_GRACE_MS)
    ).toBe(true);
  });
});

describe("settleEventId", () => {
  it("namespaces reservation ids for settle receipts", () => {
    expect(settleEventId("jd7abc")).toBe("token_settle:jd7abc");
  });
});
