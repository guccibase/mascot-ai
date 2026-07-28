import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSubscriptionManagementUrl } from "../revenuecat-management";

describe("getSubscriptionManagementUrl", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.REVENUECAT_SECRET_API_KEY = "sk_test_secret";
    process.env.REVENUECAT_PROJECT_ID = "proj_test";
    process.env.ALLOW_SANDBOX_BILLING = "true";
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

  it("returns the authenticated portal URL for an active subscription", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: "list", items: [{ id: "cust_1" }] }),
      })
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

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/customers?search=user_123"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/customers/cust_1/subscriptions?environment=sandbox"
    );
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      "/subscriptions/sub_live/authenticated_management_url"
    );
  });

  it("returns null when the customer has no manageable subscription", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: "list", items: [{ id: "cust_1" }] }),
      })
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
          ],
        }),
      });

    await expect(getSubscriptionManagementUrl("user_123")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
