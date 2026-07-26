import { describe, expect, it } from "vitest";
import {
  APP_ASSET_KINDS,
  filesForKinds,
  isAppAssetKind,
  type AppAssetKind,
} from "../app-assets/catalog";
import { expectedPathsForKinds } from "../../../convex/lib/appAssetPaths";
import {
  APP_ASSET_PACK_TOKENS_TYPICAL,
  estimateImageGenTokens,
  estimateTokens,
  IMAGE_GEN_USD_PER_IMAGE,
} from "../token-pricing";
import { USD_PER_TOKEN } from "../../../convex/lib/plans";

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
});

describe("app asset token pricing", () => {
  it("charges per image for samples with margin", () => {
    const three = estimateImageGenTokens(3);
    const one = estimateImageGenTokens(1);
    expect(three.typical).toBeGreaterThan(one.typical * 2.5);
    const raw = (3 * IMAGE_GEN_USD_PER_IMAGE) / USD_PER_TOKEN;
    expect(three.typical).toBeGreaterThan(raw);
  });

  it("includes flat pack assembly fee", () => {
    const quote = estimateTokens({ kind: "appAssetPack" }, "gpt-5.6-sol");
    expect(quote.typical).toBe(APP_ASSET_PACK_TOKENS_TYPICAL);
  });

  it("combines image gen for three samples", () => {
    const quote = estimateTokens(
      { kind: "appAssetSamples", images: 3 },
      "gpt-5.6-sol"
    );
    expect(quote.typical).toBeGreaterThan(estimateImageGenTokens(3).typical - 1);
  });
});
