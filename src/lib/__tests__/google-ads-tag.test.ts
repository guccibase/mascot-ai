import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_SUBSCRIBE_SEND_TO,
  trackGoogleAdsSubscribeConversion,
} from "@/components/google-ads-tag";

describe("Google Ads tag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to the configured AW conversion ID", () => {
    expect(GOOGLE_ADS_ID).toMatch(/^AW-\d+$/);
    expect(GOOGLE_ADS_SUBSCRIBE_SEND_TO).toMatch(
      /^AW-\d+\/[A-Za-z0-9_-]+$/
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

  it("pricing page fires Subscribe conversion only for plan activation", () => {
    const pricing = readFileSync(
      join(process.cwd(), "src/app/pricing/page.tsx"),
      "utf8"
    );
    expect(pricing).toMatch(/trackGoogleAdsSubscribeConversion/);
    expect(pricing).toMatch(/kind === "plan" && activated/);
  });
});
