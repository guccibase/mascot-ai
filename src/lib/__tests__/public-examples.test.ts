import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExampleIdlePreview } from "@/components/example-idle-preview";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_GENERATED_EXAMPLES,
  isPublicExampleSlug,
  MASCOTS,
  PUBLIC_EXAMPLE_SLUGS,
  PUBLIC_EXAMPLES,
  type MascotSlug,
} from "@/lib/mascots";
import { PUBLIC_EXAMPLE_SLUGS as CONVEX_PUBLIC_EXAMPLE_SLUGS } from "../../../convex/lib/publicExamples";

describe("public example allowlist", () => {
  it("exposes only lyra, sol, bud, and fanous as public", () => {
    expect([...PUBLIC_EXAMPLE_SLUGS]).toEqual([
      "lyra",
      "sol",
      "bud",
      "fanous",
    ]);
    expect(PUBLIC_EXAMPLES.map((m) => m.slug)).toEqual([
      "lyra",
      "sol",
      "bud",
      "fanous",
    ]);
  });

  it("keeps the Convex allowlist mirrored", () => {
    expect([...CONVEX_PUBLIC_EXAMPLE_SLUGS]).toEqual([...PUBLIC_EXAMPLE_SLUGS]);
  });

  it("partitions the full catalog without gaps or overlap", () => {
    const publicSlugs = new Set<MascotSlug>(PUBLIC_EXAMPLES.map((m) => m.slug));
    const adminSlugs = new Set(ADMIN_GENERATED_EXAMPLES.map((m) => m.slug));

    expect(publicSlugs.size + adminSlugs.size).toBe(MASCOTS.length);
    for (const m of MASCOTS) {
      expect(publicSlugs.has(m.slug) !== adminSlugs.has(m.slug)).toBe(true);
    }
  });

  it("classifies slugs with isPublicExampleSlug", () => {
    expect(isPublicExampleSlug("lyra")).toBe(true);
    expect(isPublicExampleSlug("granary")).toBe(false);
    expect(isPublicExampleSlug("not-a-mascot")).toBe(false);
  });

  /**
   * Admin studios share /studio/[slug] with public examples. generateStaticParams
   * marks the segment static; Clerk auth on on-demand admin slugs then throws
   * DYNAMIC_SERVER_USAGE in `next start` / Vercel (works in `next dev`).
   */
  it("forces dynamic rendering so admin studio auth can run", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/studio/[slug]/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
    expect(page).toMatch(/isAdminUser\(\)/);
  });
});

it("includes animated and reduced-motion artwork before hydration", () => {
  for (const { slug, accent, stage } of PUBLIC_EXAMPLES) {
    const html = renderToStaticMarkup(
      createElement(ExampleIdlePreview, { slug, accent, stage })
    );
    expect(html).toContain(`src="/previews/${slug}.svg"`);
    expect(html).toContain('media="(prefers-reduced-motion: reduce)"');
    expect(html).toContain(`srcSet="/previews/${slug}-still.svg"`);
  }
});
