import { createRouteMatcher } from "@clerk/nextjs/server";
import { describe, expect, it } from "vitest";
import {
  isMarketplaceBrowsePath,
  isMarketplaceFulfillmentPath,
  MARKETPLACE_PUBLIC_ROUTE_PATTERNS,
} from "@/lib/marketplace-routes";

function mockReq(pathname: string) {
  return { nextUrl: { pathname } } as Parameters<
    ReturnType<typeof createRouteMatcher>
  >[0];
}

describe("isMarketplaceBrowsePath", () => {
  it("allows the index and listing preview", () => {
    expect(isMarketplaceBrowsePath("/marketplace")).toBe(true);
    expect(isMarketplaceBrowsePath("/marketplace/nova")).toBe(true);
    expect(isMarketplaceBrowsePath("/marketplace/nova/")).toBe(true);
  });

  it("rejects remix and checkout (auth required)", () => {
    expect(isMarketplaceBrowsePath("/marketplace/nova/remix")).toBe(false);
    expect(isMarketplaceBrowsePath("/marketplace/checkout/success")).toBe(
      false
    );
  });

  it("rejects unrelated paths", () => {
    expect(isMarketplaceBrowsePath("/")).toBe(false);
    expect(isMarketplaceBrowsePath("/library")).toBe(false);
  });
});

describe("isMarketplaceFulfillmentPath", () => {
  it("allows checkout success and listing remix unlock entry", () => {
    expect(
      isMarketplaceFulfillmentPath("/marketplace/checkout/success")
    ).toBe(true);
    expect(isMarketplaceFulfillmentPath("/marketplace/nova/remix")).toBe(true);
    expect(isMarketplaceFulfillmentPath("/marketplace/nova/remix/")).toBe(
      true
    );
  });

  it("rejects browse and library remix", () => {
    expect(isMarketplaceFulfillmentPath("/marketplace")).toBe(false);
    expect(isMarketplaceFulfillmentPath("/marketplace/nova")).toBe(false);
    expect(isMarketplaceFulfillmentPath("/library/abc/remix")).toBe(false);
  });
});

describe("MARKETPLACE_PUBLIC_ROUTE_PATTERNS", () => {
  it("is browse-only (no catch-all under /marketplace)", () => {
    expect(MARKETPLACE_PUBLIC_ROUTE_PATTERNS).toEqual([
      "/marketplace",
      "/marketplace/:slug",
    ]);
    expect(MARKETPLACE_PUBLIC_ROUTE_PATTERNS.join(" ")).not.toMatch(
      /\(\.\*\)/
    );
  });

  it("Clerk matcher allows browse and denies remix/checkout", () => {
    const isPublic = createRouteMatcher([...MARKETPLACE_PUBLIC_ROUTE_PATTERNS]);
    expect(isPublic(mockReq("/marketplace"))).toBe(true);
    expect(isPublic(mockReq("/marketplace/nova"))).toBe(true);
    expect(isPublic(mockReq("/marketplace/nova/remix"))).toBe(false);
    expect(isPublic(mockReq("/marketplace/checkout/success"))).toBe(false);
  });
});
