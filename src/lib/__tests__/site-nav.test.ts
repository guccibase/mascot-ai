import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("site navigation discoverability", () => {
  it("keeps Marketplace reachable on mobile via the overflow menu", () => {
    const source = readSrc("components/site-header.tsx");
    expect(source).toMatch(/MobileNavMenu/);
    expect(source).toMatch(/Sheet/);
    expect(source).toMatch(/href:\s*"\/marketplace"/);
    expect(source).toMatch(/label:\s*"Marketplace"/);
    // Compact mobile bar — secondary destinations are not forced into one row.
    expect(source).toMatch(/sm:hidden/);
    expect(source).toMatch(/Open menu/);
  });

  it("keeps Marketplace on desktop primary nav for both auth states", () => {
    const source = readSrc("components/site-header.tsx");
    expect(source).toMatch(/VISITOR_SECONDARY/);
    expect(source).toMatch(/SIGNED_IN_SECONDARY/);
    expect(source).toMatch(/hidden items-center gap-1\.5 sm:flex/);
  });

  it("lists Marketplace in the site footer", () => {
    const source = readSrc("components/site-footer.tsx");
    expect(source).toMatch(/href:\s*"\/marketplace"/);
  });
});
