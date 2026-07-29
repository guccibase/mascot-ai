import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import type { Id } from "../../_generated/dataModel";
import {
  ADMIN_GRANT_EVENT_TYPE,
  MAX_ADMIN_GRANT,
  buildGrantReason,
  isValidIdempotencyKey,
  normalizeGrantAmount,
  resolveSubscriptionGrant,
  subscriptionHeadroom,
} from "../adminGrant";

function expectConvexCode(fn: () => unknown, code: string) {
  try {
    fn();
    expect.fail("expected ConvexError");
  } catch (err) {
    expect(err).toBeInstanceOf(ConvexError);
    expect((err as ConvexError<{ code: string }>).data.code).toBe(code);
  }
}

describe("MAX_ADMIN_GRANT", () => {
  it("is above the largest catalog top-up", () => {
    expect(MAX_ADMIN_GRANT).toBeGreaterThan(1_650_000);
  });

  it("stays below reservation abuse ceiling", () => {
    expect(MAX_ADMIN_GRANT).toBeLessThan(30_000_000);
  });
});

describe("normalizeGrantAmount", () => {
  it("floors fractional amounts", () => {
    expect(normalizeGrantAmount(100.9)).toBe(100);
  });

  it("rejects zero, negative, and non-finite values", () => {
    expectConvexCode(() => normalizeGrantAmount(0), "INVALID_AMOUNT");
    expectConvexCode(() => normalizeGrantAmount(-1), "INVALID_AMOUNT");
    expectConvexCode(() => normalizeGrantAmount(Number.NaN), "INVALID_AMOUNT");
  });

  it("rejects amounts above the admin cap", () => {
    expectConvexCode(
      () => normalizeGrantAmount(MAX_ADMIN_GRANT + 1),
      "AMOUNT_TOO_LARGE"
    );
  });
});

describe("isValidIdempotencyKey", () => {
  it("accepts UUID-shaped keys", () => {
    expect(isValidIdempotencyKey("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      true
    );
  });

  it("rejects short, long, or unsafe keys", () => {
    expect(isValidIdempotencyKey("short")).toBe(false);
    expect(isValidIdempotencyKey("a".repeat(65))).toBe(false);
    expect(isValidIdempotencyKey("has space!!")).toBe(false);
  });
});

describe("subscriptionHeadroom / resolveSubscriptionGrant", () => {
  it("computes remaining room under the plan cap", () => {
    expect(subscriptionHeadroom(200_000, 240_000)).toBe(40_000);
    expect(subscriptionHeadroom(240_000, 240_000)).toBe(0);
  });

  it("applies a full grant when it fits", () => {
    expect(resolveSubscriptionGrant(100_000, 50_000, 240_000)).toEqual({
      applied: 50_000,
    });
  });

  it("fails closed when already at the cap", () => {
    expectConvexCode(
      () => resolveSubscriptionGrant(240_000, 10_000, 240_000),
      "SUBSCRIPTION_AT_CAP"
    );
  });

  it("fails closed when the request would be silently truncated", () => {
    expectConvexCode(
      () => resolveSubscriptionGrant(200_000, 100_000, 240_000),
      "SUBSCRIPTION_PARTIAL"
    );
  });
});

describe("ADMIN_GRANT_EVENT_TYPE", () => {
  it("is a stable billingEvents discriminator", () => {
    expect(ADMIN_GRANT_EVENT_TYPE).toBe("ADMIN_GRANT");
  });
});

describe("buildGrantReason", () => {
  const adminId = "users:admin" as Id<"users">;

  it("includes the admin id", () => {
    expect(buildGrantReason(adminId)).toBe("admin_grant:users:admin");
  });

  it("appends a trimmed note and truncates to 120 chars", () => {
    expect(buildGrantReason(adminId, "  ticket-42  ")).toBe(
      "admin_grant:users:admin:ticket-42"
    );
    const long = "x".repeat(200);
    const reason = buildGrantReason(adminId, long);
    expect(reason.endsWith("x".repeat(120))).toBe(true);
    expect(reason.length).toBe("admin_grant:users:admin:".length + 120);
  });
});
