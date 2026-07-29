import { describe, expect, it } from "vitest";
import {
  ADMIN_GENERATED_EXAMPLES,
  isPublicExampleSlug,
  MASCOTS,
  PUBLIC_EXAMPLE_SLUGS,
  PUBLIC_EXAMPLES,
} from "@/lib/mascots";
import {
  loadPublicExampleIdlePreview,
  PUBLIC_IDLE_PREVIEW_SLUGS,
} from "@/lib/public-example-idle-preview";
import { restoreSharedCss } from "@/lib/example-poses/types";
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
    const publicSlugs = new Set(PUBLIC_EXAMPLES.map((m) => m.slug));
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
});

describe("public example idle previews", () => {
  it("loads restored idle SVG for every public slug", async () => {
    expect([...PUBLIC_IDLE_PREVIEW_SLUGS]).toEqual([...PUBLIC_EXAMPLE_SLUGS]);

    for (const slug of PUBLIC_EXAMPLE_SLUGS) {
      const markup = await loadPublicExampleIdlePreview(slug);
      expect(markup).toBeTruthy();
      expect(markup).toContain("<svg");
      expect(markup).toContain("@keyframes");

      const preview = (
        await import(`@/lib/example-poses/idle-previews/${slug}.json`)
      ).default as { css: string; svg: string };
      expect(markup).toBe(restoreSharedCss(preview.svg, preview.css));
    }
  });
});
