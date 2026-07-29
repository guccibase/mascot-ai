import { describe, expect, it } from "vitest";
import {
  APP_ASSET_KINDS,
  filesForKinds,
  isAppAssetKind,
  packOutputFileCount,
  type AppAssetKind,
} from "../app-assets/catalog";
import { expectedPathsForKinds } from "../../../convex/lib/appAssetPaths";
import {
  APP_ASSET_MARGIN_MULTIPLIER,
  APP_ASSET_SAMPLE_USD_PER_IMAGE,
  estimateAppAssetPackTokens,
  estimateAppAssetSampleTokens,
  estimateTokens,
} from "../token-pricing";
import { USD_PER_TOKEN } from "../../../convex/lib/plans";
import { composeAppIconPreview, parseHexColor } from "../app-assets/icon-compose";
import { buildIconPrompt } from "../app-assets/icon-prompt";
import sharp from "sharp";

describe("app asset catalog", () => {
  it("recognizes valid kinds", () => {
    expect(isAppAssetKind("app_icon")).toBe(true);
    expect(isAppAssetKind("nope")).toBe(false);
  });

  it("dedupes files across kinds", () => {
    const files = filesForKinds(["app_icon", "favicon", "pwa"]);
    const paths = files.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.some((p) => p.includes("favicon"))).toBe(true);
    expect(paths.some((p) => p.includes("pwa"))).toBe(true);
  });

  it("includes every declared kind", () => {
    expect(APP_ASSET_KINDS.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps server path allowlist in sync with client catalog", () => {
    const manifestExtras: Partial<Record<AppAssetKind, string[]>> = {
      app_icon: ["ios/Contents.json"],
      pwa: ["pwa/site.webmanifest"],
    };

    for (const kind of APP_ASSET_KINDS) {
      const clientPaths = new Set(filesForKinds([kind.id]).map((f) => f.path));
      for (const extra of manifestExtras[kind.id] ?? []) {
        clientPaths.add(extra);
      }

      const serverPaths = expectedPathsForKinds([kind.id]);
      serverPaths.delete("README.txt");

      expect([...clientPaths].sort()).toEqual([...serverPaths].sort());
    }

    const allKinds = APP_ASSET_KINDS.map((k) => k.id);
    const combinedClient = new Set(filesForKinds(allKinds).map((f) => f.path));
    combinedClient.add("ios/Contents.json");
    combinedClient.add("pwa/site.webmanifest");

    const combinedServer = expectedPathsForKinds(allKinds);
    combinedServer.delete("README.txt");
    expect([...combinedClient].sort()).toEqual([...combinedServer].sort());
  });

  it("packOutputFileCount matches expectedPathsForKinds", () => {
    const kinds = APP_ASSET_KINDS.map((k) => k.id);
    expect(packOutputFileCount(kinds)).toBe(expectedPathsForKinds(kinds).size);
    expect(packOutputFileCount(["favicon"])).toBe(
      expectedPathsForKinds(["favicon"]).size
    );
  });
});

describe("app asset token pricing", () => {
  it("charges 2× image-edit COGS for AI icon samples (50% gross margin)", () => {
    const one = estimateAppAssetSampleTokens(1);
    const rawCogsTokens = APP_ASSET_SAMPLE_USD_PER_IMAGE / USD_PER_TOKEN;
    expect(one.typical).toBe(
      Math.ceil(rawCogsTokens * APP_ASSET_MARGIN_MULTIPLIER)
    );
    const margin = (one.typical - rawCogsTokens) / one.typical;
    expect(margin).toBeGreaterThanOrEqual(0.5 - 1e-9);
    // Must price real gpt-image edits, not the old composite infra fee.
    expect(one.typical).toBeGreaterThan(10_000);
  });

  it("scales sample quotes with image count", () => {
    const three = estimateAppAssetSampleTokens(3);
    const one = estimateAppAssetSampleTokens(1);
    expect(three.typical).toBe(one.typical * 3);
  });

  it("scales pack fee with file count", () => {
    const few = estimateAppAssetPackTokens(4);
    const many = estimateAppAssetPackTokens(30);
    expect(many.typical).toBeGreaterThan(few.typical);
  });

  it("wires estimateTokens for samples and pack", () => {
    const samples = estimateTokens(
      { kind: "appAssetSamples", images: 3 },
      "gpt-5.6-sol"
    );
    expect(samples.typical).toBe(estimateAppAssetSampleTokens(3).typical);

    const pack = estimateTokens(
      { kind: "appAssetPack", fileCount: 20 },
      "gpt-5.6-sol"
    );
    expect(pack.typical).toBe(estimateAppAssetPackTokens(20).typical);
  });
});

describe("buildIconPrompt", () => {
  it("asks for designed icon art, not a screenshot paste", () => {
    const prompt = buildIconPrompt({
      mascotName: "Pip",
      tagline: "Cheerful helper",
      product: "Habit tracker",
      accent: "#F5B34F",
      kinds: ["app_icon", "favicon"],
      variantIndex: 0,
      styleDescription: "soft pastel dawn",
    });
    expect(prompt).toMatch(/NOT a screenshot/i);
    expect(prompt).toMatch(/identity only/i);
    expect(prompt).toMatch(/Pip/);
    expect(prompt).toMatch(/soft pastel dawn/);
    expect(prompt).toMatch(/Variant A/);
  });

  it("varies creative direction across the three options", () => {
    const a = buildIconPrompt({
      mascotName: "Pip",
      kinds: ["app_icon"],
      variantIndex: 0,
    });
    const b = buildIconPrompt({
      mascotName: "Pip",
      kinds: ["app_icon"],
      variantIndex: 1,
    });
    const c = buildIconPrompt({
      mascotName: "Pip",
      kinds: ["app_icon"],
      variantIndex: 2,
    });
    expect(a).toMatch(/Variant A/);
    expect(b).toMatch(/Variant B/);
    expect(c).toMatch(/Variant C/);
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("composeAppIconPreview", () => {
  it("parses hex accents", () => {
    expect(parseHexColor("#fc0")).toEqual({ r: 255, g: 204, b: 0 });
    expect(parseHexColor("#D4A843").r).toBe(212);
  });

  it("keeps output square and embeds the mascot pixels", async () => {
    // Solid gold circle on transparent — stand-in for a mascot render.
    const mascotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <circle cx="100" cy="100" r="80" fill="#D4A843"/>
    </svg>`;
    const mascotPng = await sharp(Buffer.from(mascotSvg)).png().toBuffer();
    const icon = await composeAppIconPreview({
      mascotPng,
      accent: "#D4A843",
      variantIndex: 0,
      size: 256,
    });
    const meta = await sharp(icon).metadata();
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);

    // Center pixel should be near the mascot gold, not a random redesign color.
    const { data } = await sharp(icon)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const i = (128 * 256 + 128) * 4;
    expect(data[i]).toBeGreaterThan(180); // R
    expect(data[i + 1]!).toBeGreaterThan(140); // G
    expect(data[i + 2]!).toBeLessThan(120); // B (warm gold, not blue redesign)
  });
});
