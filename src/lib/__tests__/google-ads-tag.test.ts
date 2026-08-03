import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_PURCHASE_SEND_TO,
  GOOGLE_ADS_SUBSCRIBE_SEND_TO,
  trackGoogleAdsPurchaseConversion,
  trackGoogleAdsSubscribeConversion,
} from "@/components/google-ads-tag";

describe("Google Ads tag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to the configured AW conversion ID", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-869374788");
    expect(GOOGLE_ADS_SUBSCRIBE_SEND_TO).toBe(
      "AW-869374788/_amCC0Sh1ogcENWkvLwo"
    );
    expect(GOOGLE_ADS_PURCHASE_SEND_TO).toBe(
      "AW-869374788/FWLSC0eh1ogcENWkvLwo"
    );
  });

  it("is mounted once in the root layout via next/script", () => {
    const layout = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    expect(layout).toMatch(/GoogleAdsTag/);
    const tag = readFileSync(
      join(process.cwd(), "src/components/google-ads-tag.tsx"),
      "utf8"
    );
    expect(tag).toMatch(/next\/script/);
    expect(tag).toMatch(/afterInteractive/);
    expect(tag).toMatch(/googletagmanager\.com\/gtag\/js/);
  });

  it("fires the Subscribe conversion via gtag when available", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag, dataLayer: [] });
    trackGoogleAdsSubscribeConversion();
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: GOOGLE_ADS_SUBSCRIBE_SEND_TO,
    });
  });

  it("fires the Purchase conversion with value and currency", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag, dataLayer: [] });
    trackGoogleAdsPurchaseConversion({ value: 19.0, currency: "USD" });
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
      value: 19.0,
      currency: "USD",
    });
  });

  it("pricing page fires Subscribe for plans and Purchase for top-ups", () => {
    const pricing = readFileSync(
      join(process.cwd(), "src/app/pricing/page.tsx"),
      "utf8"
    );
    expect(pricing).toMatch(/trackGoogleAdsSubscribeConversion/);
    expect(pricing).toMatch(/trackGoogleAdsPurchaseConversion/);
    expect(pricing).toMatch(/kind === "plan" && activated/);
    expect(pricing).toMatch(/kind === "topup" && credited/);
  });

  it("marketplace success page fires Purchase conversion", () => {
    const success = readFileSync(
      join(process.cwd(), "src/app/marketplace/checkout/success/page.tsx"),
      "utf8"
    );
    expect(success).toMatch(/trackGoogleAdsPurchaseConversion/);
    expect(success).toMatch(/amountCents/);
  });
});
