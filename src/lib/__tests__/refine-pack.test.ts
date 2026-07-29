import { describe, expect, it } from "vitest";
import { loadExampleMarketplacePack } from "@/lib/marketplace/example-packs";
import {
  MAX_REFINE_GESTURES_PER_BATCH,
  MAX_REFINE_SVG_CHARS_PER_BATCH,
  compactMascotForRefine,
  mergeRefinedGestureBatches,
  refinePayloadChars,
  splitRefineGestures,
} from "@/lib/refine-pack";
import { normalizeGeneratedMascot } from "@/lib/studio-utils";
import type { GeneratedGesture, GeneratedMascot } from "@/lib/types";

function gesture(key: string, svgChars = 100): GeneratedGesture {
  return {
    key,
    label: `Label ${key}`,
    cat: "Core",
    tip: `Tip ${key}`,
    use: `Use ${key}`,
    track: key === "pose_0",
    signal: 42,
    svg: `<svg>${"x".repeat(svgChars)}</svg>`,
  };
}

describe("refine pose batches", () => {
  it("bounds batches by both pose count and SVG size", () => {
    const byCount = splitRefineGestures(
      Array.from({ length: 13 }, (_, index) => gesture(`pose_${index}`))
    );
    expect(byCount.map((batch) => batch.length)).toEqual([12, 1]);

    const bySize = splitRefineGestures([
      gesture("first", 50_000),
      gesture("second", 50_000),
    ]);
    expect(bySize.map((batch) => batch.length)).toEqual([1, 1]);
  });

  it("splits the real normalized Granary pack into safe stable batches", async () => {
    const imported = await loadExampleMarketplacePack("granary");
    const granary = normalizeGeneratedMascot(imported, imported.gestures);
    const batches = splitRefineGestures(granary.gestures);

    // Large example packs need multiple batches; exact count tracks pose SVG sizes.
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flat().map((pose) => pose.key)).toEqual(
      granary.gestures.map((pose) => pose.key)
    );
    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(
        MAX_REFINE_GESTURES_PER_BATCH
      );
      expect(
        batch.reduce((total, pose) => total + pose.svg.length, 0)
      ).toBeLessThanOrEqual(MAX_REFINE_SVG_CHARS_PER_BATCH);
    }
  });

  it("restores original order and metadata from reordered batch SVGs", () => {
    const original = Array.from({ length: 13 }, (_, index) =>
      gesture(`pose_${index}`)
    );
    const expected = splitRefineGestures(original);
    const returned = expected.map((batch) =>
      [...batch].reverse().map((pose) => ({
        key: pose.key,
        svg: `<svg data-refined="${pose.key}"></svg>`,
      }))
    );

    const merged = mergeRefinedGestureBatches(
      original,
      expected,
      returned
    );
    expect(merged.map((pose) => pose.key)).toEqual(
      original.map((pose) => pose.key)
    );
    expect(merged.map((pose) => pose.label)).toEqual(
      original.map((pose) => pose.label)
    );
    expect(merged.every((pose) => pose.svg.includes("data-refined"))).toBe(true);
    expect(merged[0]?.track).toBe(true);
    expect(merged[0]?.signal).toBe(42);
  });

  it("rejects missing, duplicate, and unassigned pose keys", () => {
    const original = [gesture("one"), gesture("two")];
    const expected = splitRefineGestures(original);

    expect(() =>
      mergeRefinedGestureBatches(original, expected, [[{ ...original[0]! }]])
    ).toThrow(/incomplete pose batch/i);

    expect(() =>
      mergeRefinedGestureBatches(original, expected, [
        [
          { ...original[0]! },
          { ...original[0]! },
        ],
      ])
    ).toThrow(/incomplete pose batch/i);

    expect(() =>
      mergeRefinedGestureBatches(original, expected, [
        [
          { ...original[0]! },
          gesture("other"),
        ],
      ])
    ).toThrow(/incomplete pose batch/i);
  });
});

describe("refinePayloadChars", () => {
  it("matches compact mascot JSON + message + history (route reserve math)", () => {
    const mascot = {
      name: "Test",
      tagline: "Hi",
      product: "App",
      accent: "#fff",
      glowLabel: "Glow",
      instrument: { type: "sine", notes: [1] },
      themes: { dusk: { bg: "#000" } },
      parts: [],
      gestures: [gesture("idle", 20)],
    } as unknown as GeneratedMascot;
    const message = "make it softer";
    const history = [
      { role: "user" as const, content: "earlier" },
      { role: "assistant" as const, content: "ok" },
    ];
    const expected =
      JSON.stringify(compactMascotForRefine(mascot)).length +
      message.length +
      "earlier".length +
      "ok".length;
    expect(refinePayloadChars(mascot, message, history)).toBe(expected);
  });
});
