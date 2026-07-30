import { describe, expect, it } from "vitest";
import { snapshotFromV1Subscriber } from "../revenueCatSubscriber";

describe("snapshotFromV1Subscriber", () => {
  it("maps active subscriptions and non-subscription purchases", () => {
    const snapshot = snapshotFromV1Subscriber({
      subscriber: {
        subscriptions: {
          mascotai_weekly: {
            purchase_date: "2026-07-30T03:05:00.000Z",
            expires_date: "2026-08-06T03:05:00.000Z",
            store: "rc_billing",
            is_sandbox: false,
          },
        },
        non_subscriptions: {
          mascotai_topup_starter: [
            {
              id: "txn_abc",
              purchase_date: "2026-07-29T12:00:00.000Z",
              store: "rc_billing",
              is_sandbox: false,
            },
          ],
        },
      },
    });

    expect(snapshot.subscriptions).toEqual([
      {
        productId: "mascotai_weekly",
        purchasedAtMs: Date.parse("2026-07-30T03:05:00.000Z"),
        expiresAtMs: Date.parse("2026-08-06T03:05:00.000Z"),
        store: "rc_billing",
        environment: "PRODUCTION",
      },
    ]);
    expect(snapshot.topups).toEqual([
      {
        productId: "mascotai_topup_starter",
        transactionId: "txn_abc",
        purchasedAtMs: Date.parse("2026-07-29T12:00:00.000Z"),
        store: "rc_billing",
        environment: "PRODUCTION",
      },
    ]);
  });

  it("marks sandbox purchases so grant policy can ignore them", () => {
    const snapshot = snapshotFromV1Subscriber({
      subscriber: {
        subscriptions: {
          mascotai_weekly: {
            purchase_date: "2026-07-30T03:05:00.000Z",
            expires_date: "2026-08-06T03:05:00.000Z",
            is_sandbox: true,
          },
        },
      },
    });
    expect(snapshot.subscriptions[0]?.environment).toBe("SANDBOX");
  });
});
