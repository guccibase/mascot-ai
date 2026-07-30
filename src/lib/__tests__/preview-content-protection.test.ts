import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("preview content protection", () => {
  it("blocks save shortcuts on preview-only GeneratedStudio surfaces", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/generated-studio.tsx"),
      "utf8"
    );
    expect(source).toMatch(/usePreviewContentProtection\(previewProtected\)/);
    expect(source).toMatch(/data-preview-protected/);
    expect(source).toMatch(/Preview/);
  });

  it("wraps legacy example studios with PreviewContentGuard", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/studio/[slug]/studio-client.tsx"),
      "utf8"
    );
    expect(source).toMatch(/PreviewContentGuard/);
  });
});
