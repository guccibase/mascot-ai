import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXAMPLE_PREVIEW_CAPABILITIES,
  MARKETPLACE_PREVIEW_CAPABILITIES,
  OWNED_STUDIO_CAPABILITIES,
  OWNED_STUDIO_GATED_FEATURES,
  hasFullOwnedStudio,
  ownedStudioCapabilitiesForSource,
  ownedStudioGatedCoverage,
  resolveStudioFeatures,
  type MascotLibrarySource,
} from "../studio-capabilities";

const ROOT = join(__dirname, "../..");

function readApp(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("owned studio capability parity", () => {
  const sources: Array<MascotLibrarySource | undefined> = [
    undefined,
    "created",
    "remixed",
    "purchased",
  ];

  it("gives identical full capabilities for every library source", () => {
    const caps = sources.map((source) =>
      ownedStudioCapabilitiesForSource(source)
    );
    for (const c of caps) {
      expect(c).toEqual(OWNED_STUDIO_CAPABILITIES);
    }
    expect(new Set(caps.map((c) => JSON.stringify(c))).size).toBe(1);
  });

  it("resolves full owned-studio gated features when mascotId + change handler exist", () => {
    for (const source of sources) {
      const features = resolveStudioFeatures({
        capabilities: ownedStudioCapabilitiesForSource(source),
        mascotId: "mascots_owned",
        hasMascotChangeHandler: true,
      });
      expect(hasFullOwnedStudio(features)).toBe(true);
      const coverage = ownedStudioGatedCoverage(features);
      for (const key of OWNED_STUDIO_GATED_FEATURES) {
        expect(coverage[key], key).toBe(true);
      }
    }
  });

  it("requires mascotId for app assets even with owned caps", () => {
    const features = resolveStudioFeatures({
      capabilities: OWNED_STUDIO_CAPABILITIES,
      mascotId: null,
      hasMascotChangeHandler: true,
    });
    expect(features.canEdit).toBe(true);
    expect(features.canExport).toBe(true);
    expect(features.canAppAssets).toBe(false);
    expect(hasFullOwnedStudio(features)).toBe(false);
  });

  it("requires change handler for edit even with owned caps", () => {
    const features = resolveStudioFeatures({
      capabilities: OWNED_STUDIO_CAPABILITIES,
      mascotId: "mascots_owned",
      hasMascotChangeHandler: false,
    });
    expect(features.canEdit).toBe(false);
    expect(features.canExport).toBe(true);
    expect(features.canAppAssets).toBe(true);
    expect(hasFullOwnedStudio(features)).toBe(false);
  });
});

describe("fail-closed capability defaults", () => {
  it("omitted capabilities unlock nothing privileged", () => {
    const features = resolveStudioFeatures({
      hasMascotChangeHandler: true,
      mascotId: "mascots_owned",
    });
    expect(features.canExport).toBe(false);
    expect(features.canEdit).toBe(false);
    expect(features.canToggleParts).toBe(false);
    expect(features.canAppAssets).toBe(false);
    expect(hasFullOwnedStudio(features)).toBe(false);
  });

  it("partial caps do not imply the rest", () => {
    const features = resolveStudioFeatures({
      capabilities: { export: true },
      hasMascotChangeHandler: true,
      mascotId: "mascots_owned",
    });
    expect(features.canExport).toBe(true);
    expect(features.canEdit).toBe(false);
    expect(features.canAppAssets).toBe(false);
  });

  it("gated coverage only reports capability-derived flags", () => {
    const empty = ownedStudioGatedCoverage(
      resolveStudioFeatures({ hasMascotChangeHandler: false })
    );
    expect(Object.values(empty).every((v) => v === false)).toBe(true);

    const full = ownedStudioGatedCoverage(
      resolveStudioFeatures({
        capabilities: OWNED_STUDIO_CAPABILITIES,
        mascotId: "x",
        hasMascotChangeHandler: true,
      })
    );
    expect(Object.values(full).every((v) => v === true)).toBe(true);
  });
});

describe("preview surfaces stay restricted", () => {
  it("marketplace preview: play + parts, no export/edit/app assets", () => {
    const features = resolveStudioFeatures({
      capabilities: MARKETPLACE_PREVIEW_CAPABILITIES,
      mascotId: null,
      hasMascotChangeHandler: false,
    });
    expect(features.canExport).toBe(false);
    expect(features.canEdit).toBe(false);
    expect(features.canToggleParts).toBe(true);
    expect(features.canAppAssets).toBe(false);
    expect(hasFullOwnedStudio(features)).toBe(false);
  });

  it("example preview matches marketplace preview restrictions", () => {
    expect(EXAMPLE_PREVIEW_CAPABILITIES).toEqual(
      MARKETPLACE_PREVIEW_CAPABILITIES
    );
  });
});

describe("studio entry wiring (UI functional matrix)", () => {
  it("create result studio uses owned capabilities + persistence props", () => {
    const source = readApp("app/create/page.tsx");
    expect(source).toMatch(/OWNED_STUDIO_CAPABILITIES/);
    expect(source).toMatch(/capabilities=\{OWNED_STUDIO_CAPABILITIES\}/);
    expect(source).toMatch(/mascotId=\{mascotId\}/);
    expect(source).toMatch(/onMascotChange=\{/);
    expect(source).toMatch(/fullPage/);
  });

  it("library studio uses source-agnostic owned capabilities", () => {
    const source = readApp("app/library/[id]/page.tsx");
    expect(source).toMatch(/ownedStudioCapabilitiesForSource/);
    expect(source).toMatch(
      /capabilities=\{ownedStudioCapabilitiesForSource\(saved\.source\)\}/
    );
    expect(source).toMatch(/mascotId=\{mascotId\}/);
    expect(source).toMatch(/onMascotChange=\{/);
    expect(source).toMatch(/fullPage/);
  });

  it("remix result studio matches create/library owned surface", () => {
    const source = readApp("app/remix/[slug]/remix-client.tsx");
    expect(source).toMatch(/OWNED_STUDIO_CAPABILITIES/);
    expect(source).toMatch(/capabilities=\{OWNED_STUDIO_CAPABILITIES\}/);
    expect(source).toMatch(/mascotId=\{mascotId\}/);
    expect(source).toMatch(/onMascotChange=\{/);
    expect(source).toMatch(/fullPage/);
    expect(source).toMatch(/source:\s*"remixed"/);
    expect(source).toMatch(/sourceMascotId:/);
  });

  it("marketplace listing uses preview capabilities (parts on)", () => {
    const source = readApp("app/marketplace/[slug]/page.tsx");
    expect(source).toMatch(/MARKETPLACE_PREVIEW_CAPABILITIES/);
    expect(source).toMatch(
      /capabilities=\{MARKETPLACE_PREVIEW_CAPABILITIES\}/
    );
    expect(source).not.toMatch(/onMascotChange/);
  });

  it("example studios use example preview capabilities", () => {
    const source = readApp("app/studio/[slug]/studio-client.tsx");
    expect(source).toMatch(/EXAMPLE_PREVIEW_CAPABILITIES/);
    expect(source).toMatch(/capabilities=\{EXAMPLE_PREVIEW_CAPABILITIES\}/);
  });

  it("convex getMine/listMine expose owner-scoped source", () => {
    const source = readFileSync(
      join(ROOT, "../convex/mascots.ts"),
      "utf8"
    );
    expect(source).toMatch(/source: mascotSource/);
    expect(source).toMatch(/source: m\.source/);
    expect(source).toMatch(/source: mascot\.source/);
    expect(source).toMatch(/sourceMascotId:/);
    expect(source).toMatch(/Remix source required/);
  });
});
