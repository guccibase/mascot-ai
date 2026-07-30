import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  billingEnvironments,
  getSubscriptionManagementUrl,
} from "../revenuecat-management";

describe("billingEnvironments", () => {
  afterEach(() => {
    delete process.env.ALLOW_SANDBOX_BILLING;
  });

  it("defaults to production only", () => {
    delete process.env.ALLOW_SANDBOX_BILLING;
    expect(billingEnvironments()).toEqual(["production"]);
  });

  it("includes sandbox when ALLOW_SANDBOX_BILLING is on", () => {
    process.env.ALLOW_SANDBOX_BILLING = "true";
    expect(billingEnvironments()).toEqual(["production", "sandbox"]);
  });
});

describe("getSubscriptionManagementUrl", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.REVENUECAT_SECRET_API_KEY = "sk_test_secret";
    process.env.REVENUECAT_PROJECT_ID = "proj_test";
    delete process.env.ALLOW_SANDBOX_BILLING;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.REVENUECAT_SECRET_API_KEY;
    delete process.env.REVENUECAT_PROJECT_ID;
    delete process.env.ALLOW_SANDBOX_BILLING;
  });

  it("returns null when RevenueCat is not configured", async () => {
    delete process.env.REVENUECAT_SECRET_API_KEY;
    await expect(getSubscriptionManagementUrl("user_123")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up the customer by app user id and returns the portal URL", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: "list",
          items: [
            {
              id: "sub_old",
              gives_access: false,
              status: "expired",
              ends_at: 1,
            },
            {
              id: "sub_live",
              gives_access: true,
              status: "active",
              ends_at: 9_999_999_999_999,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: "authenticated_management_url",
          management_url: "https://billing.revenuecat.com/app/sub?token=abc",
        }),
      });

    await expect(getSubscriptionManagementUrl("user_123")).resolves.toBe(
      "https://billing.revenuecat.com/app/sub?token=abc"
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/customers/user_123/subscriptions?environment=production"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/subscriptions/sub_live/authenticated_management_url"
    );
  });

  it("returns null when the customer has no manageable subscription", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        object: "list",
        items: [
          {
            id: "sub_old",
            gives_access: false,
            status: "expired",
            ends_at: 1,
          },
        ],
      }),
    });

    await expect(getSubscriptionManagementUrl("user_123")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
