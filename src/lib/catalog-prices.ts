import type { Package } from "@revenuecat/purchases-js";
import { normalizeProductId } from "../../convex/lib/plans";

export type CatalogPrice = {
  formattedPrice: string;
  amountUsd: number;
};

export function priceFromPackage(pkg: Package): CatalogPrice | null {
  const price = pkg.webBillingProduct.price;
  if (!price) return null;
  return {
    formattedPrice: price.formattedPrice,
    amountUsd: price.amountMicros / 1_000_000,
  };
}

/** Packages keyed by normalised RevenueCat product id. */
export function indexPackages(packages: Package[]): Record<string, Package> {
  const map: Record<string, Package> = {};
  for (const pkg of packages) {
    map[normalizeProductId(pkg.webBillingProduct.identifier)] = pkg;
  }
  return map;
}

export function lookupPackage(
  packages: Record<string, Package>,
  productId: string
): Package | undefined {
  return packages[normalizeProductId(productId)];
}
