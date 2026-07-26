import { describe, expect, it } from "vitest";
import type { Package } from "@revenuecat/purchases-js";
import { normalizeProductId } from "../../../convex/lib/plans";
import {
  indexPackages,
  lookupPackage,
  priceFromPackage,
} from "../catalog-prices";

function mockPackage(productId: string, amountMicros: number): Package {
  return {
    identifier: productId,
    webBillingProduct: {
      identifier: productId,
      price: {
        amount: amountMicros / 10_000,
        amountMicros,
        currency: "USD",
        formattedPrice: `$${amountMicros / 1_000_000}`,
      },
    },
  } as Package;
}

describe("catalog prices", () => {
  it("indexes packages by normalised product id", () => {
    const packages = indexPackages([
      mockPackage("mascotai_monthly", 19_990_000),
      mockPackage("MascotAI_Topup_Pro", 49_000_000),
    ]);

    expect(lookupPackage(packages, "mascotai_monthly")?.identifier).toBe(
      "mascotai_monthly"
    );
    expect(lookupPackage(packages, "mascotai_topup_pro")?.identifier).toBe(
      "MascotAI_Topup_Pro"
    );
    expect(normalizeProductId("mascotai_monthly:monthly-base-plan")).toBe(
      "mascotai_monthly"
    );
  });

  it("reads formatted and numeric prices from RevenueCat packages", () => {
    const price = priceFromPackage(mockPackage("mascotai_weekly", 9_990_000));
    expect(price).toEqual({
      formattedPrice: "$9.99",
      amountUsd: 9.99,
    });
  });
});
