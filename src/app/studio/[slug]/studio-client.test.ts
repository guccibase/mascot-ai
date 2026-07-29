import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("example GeneratedStudio studios", () => {
  it("disables pack export for pack-driven example studios", () => {
    const source = readFileSync(
      join(__dirname, "studio-client.tsx"),
      "utf8"
    );
    expect(source).toMatch(/EXAMPLE_PREVIEW_CAPABILITIES/);
    expect(source).toMatch(/capabilities=\{EXAMPLE_PREVIEW_CAPABILITIES\}/);
  });
});
