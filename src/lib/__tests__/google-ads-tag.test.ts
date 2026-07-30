import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GOOGLE_ADS_ID } from "@/components/google-ads-tag";

describe("Google Ads tag", () => {
  it("defaults to the configured AW conversion ID", () => {
    expect(GOOGLE_ADS_ID).toMatch(/^AW-\d+$/);
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
});
