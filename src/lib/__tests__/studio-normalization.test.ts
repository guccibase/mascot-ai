import { describe, expect, it } from "vitest";
import {
  DEFAULT_RAMP,
  normalizeGeneratedMascot,
} from "@/lib/studio-utils";

describe("normalizeGeneratedMascot persistence contract", () => {
  it("keeps supported fields and strips unknown model metadata", () => {
    const gesture = {
      key: "idle",
      label: "Idle",
      cat: "Core",
      tip: "At rest",
      use: "Home screen",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 520"><g data-ms-part="body"><rect width="20" height="20" fill="#F2DCCE"/></g></svg>',
      modelNote: "not part of the contract",
    };
    const raw = {
      name: "Pixel Pup",
      tagline: "Always ready",
      accent: "#F2DCCE",
      product: { note: "wrong runtime type" },
      glowLabel: 42,
      themes: {
        themes_note: "model commentary must not become a theme",
        metadata: { note: "model commentary must not become a theme" },
        primary: {
          name: "Primary",
          top: "#F2DCCE",
          mid: "#F08A3C",
          base: "#E8453C",
          core: "#FFF6CF",
          stage: "#202838",
          features: "#2A1A0C",
          blush: "#E8A8A0",
          modelNote: "not part of the contract",
        },
      },
      instrument: {
        label: "Fetch Signal Tail",
        description: "Controls the tail",
        lowLabel: "Resting Curl",
        midLabel: "Happy Wag",
        highLabel: "Full Zoomies",
        defaultValue: 68,
        ramp: ["#F2DCCE", "#FFC23C", "#F08A3C", "#E8453C", "#8A3A0A"] as [
          string,
          string,
          string,
          string,
          string,
        ],
        themes_note: "model commentary must not reach Convex",
      },
      gestures: [gesture],
      parts: [
        {
          key: "body",
          label: "Body",
          category: "Core",
          description: "Main silhouette",
          essential: true,
          modelNote: "not part of the contract",
        },
      ],
      modelNote: "not part of the contract",
    };

    const normalized = normalizeGeneratedMascot(
      raw as unknown as Parameters<typeof normalizeGeneratedMascot>[0],
      [gesture]
    );

    expect(normalized.instrument).toEqual({
      label: "Fetch Signal Tail",
      description: "Controls the tail",
      lowLabel: "Resting Curl",
      midLabel: "Happy Wag",
      highLabel: "Full Zoomies",
      defaultValue: 68,
      ramp: ["#F2DCCE", "#FFC23C", "#F08A3C", "#E8453C", "#8A3A0A"],
      hidden: undefined,
    });
    expect(normalized.themes.primary).toEqual({
      name: "Primary",
      top: "#F2DCCE",
      mid: "#F08A3C",
      base: "#E8453C",
      core: "#FFF6CF",
      stage: "#202838",
      features: "#2A1A0C",
      blush: "#E8A8A0",
    });
    expect(Object.keys(normalized.themes)).toEqual(["primary"]);
    expect(normalized.product).toBeUndefined();
    expect(normalized.glowLabel).toBe("Spotlight");
    expect(normalized.parts).toEqual([
      {
        key: "body",
        label: "Body",
        category: "Core",
        description: "Main silhouette",
        essential: true,
      },
    ]);
    expect(normalized.gestures[0]).not.toHaveProperty("modelNote");
    expect(normalized).not.toHaveProperty("modelNote");
  });

  it("falls back safely when the model returns a malformed ramp", () => {
    const gesture = {
      key: "idle",
      label: "Idle",
      cat: "Core",
      tip: "At rest",
      use: "Home screen",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 520"><rect width="20" height="20"/></svg>',
    };
    const raw = {
      name: "Pixel Pup",
      tagline: "Always ready",
      accent: "#F08A3C",
      themes: {
        primary: {
          name: "Primary",
          top: "#F2DCCE",
          mid: "#F08A3C",
          base: "#E8453C",
          core: "#FFF6CF",
          stage: "#202838",
        },
      },
      instrument: {
        ramp: "12345",
      },
      gestures: [gesture],
      parts: [],
    };

    const normalized = normalizeGeneratedMascot(
      raw as unknown as Parameters<typeof normalizeGeneratedMascot>[0],
      [gesture]
    );

    expect(normalized.instrument.ramp).toEqual(DEFAULT_RAMP);
  });

  it("rejects malformed gesture collections with a domain error", () => {
    const raw = {
      name: "Pixel Pup",
      tagline: "Always ready",
      accent: "#F08A3C",
      themes: {
        primary: {
          name: "Primary",
          top: "#F2DCCE",
          mid: "#F08A3C",
          base: "#E8453C",
          core: "#FFF6CF",
          stage: "#202838",
        },
      },
      instrument: {},
      gestures: { idle: "not an array" },
      parts: [],
    };

    expect(() =>
      normalizeGeneratedMascot(
        raw as unknown as Parameters<typeof normalizeGeneratedMascot>[0],
        [
          {
            key: "idle",
            label: "Idle",
            cat: "Core",
            tip: "At rest",
            use: "Home screen",
          },
        ]
      )
    ).toThrow('Missing gesture SVG for "idle"');
  });
});
