import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Clerk public routes", () => {
  const proxy = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");

  it("keeps marketplace browse public without opening remix/checkout", () => {
    // Header + blog CTAs link to browse; Convex list/getBySlug are public.
    // Remix unlock and checkout must still hit auth.protect().
    expect(proxy).toMatch(/MARKETPLACE_PUBLIC_ROUTE_PATTERNS/);
    expect(proxy).not.toMatch(/["']\/marketplace\(\.\*\)["']/);
  });

  it("keeps pricing and example studios public", () => {
    expect(proxy).toMatch(/["']\/pricing["']/);
    expect(proxy).toMatch(/["']\/studio\(\.\*\)["']/);
  });
});
