import { describe, expect, it } from "vitest";
import React from "react";
import { buildPosePack, buildPosePackFromSource } from "@/lib/example-poses/build-pack";
import {
  defaultPackOutputPath,
  resolveMascotStudioPath,
} from "@/lib/example-poses/resolve-mascot-file";
import { validateExportedPosePack } from "@/lib/example-poses/validate-exported-pack";
import {
  finalizeMarketplacePack,
  parseMarketplacePackFile,
} from "@/lib/marketplace/parse-pack-file";
import {
  applyThemeContract,
  mergeSvgClassNames,
  normalizeGeneratedMascot,
} from "@/lib/studio-utils";

const ROOT = process.cwd();

describe("resolveMascotStudioPath", () => {
  it("finds bud-mascot.jsx by short name", () => {
    const path = resolveMascotStudioPath("bud", ROOT);
    expect(path).toMatch(/bud-mascot\.jsx$/);
  });

  it("accepts -mascot suffix", () => {
    const path = resolveMascotStudioPath("lyra-mascot", ROOT);
    expect(path).toMatch(/lyra-mascot\.jsx$/);
  });

  it("throws for missing mascot", () => {
    expect(() => resolveMascotStudioPath("not-a-real-mascot-xyz", ROOT)).toThrow(
      /No mascot studio found/
    );
  });

  it("rejects paths outside src/components/mascots", () => {
    expect(() =>
      resolveMascotStudioPath("package.json", ROOT)
    ).toThrow(/must live under/);
  });
});

describe("defaultPackOutputPath", () => {
  it("writes under marketplace/packs", () => {
    expect(defaultPackOutputPath("nova", ROOT)).toMatch(
      /src\/lib\/marketplace\/packs\/nova\.json$/
    );
  });
});

describe("validateExportedPosePack", () => {
  it("accepts a built-in bud export", () => {
    const pack = buildPosePack("bud");
    const report = validateExportedPosePack(pack);
    expect(report.poseCount).toBeGreaterThan(10);
    expect(report.bytes).toBeLessThan(900_000);
    expect(report.restoredBytes).toBeGreaterThan(report.bytes);
  });

  it("rejects packs without keyframes css", () => {
    expect(() =>
      validateExportedPosePack({
        slug: "x",
        css: "",
        poses: [
          {
            key: "idle",
            label: "Idle",
            cat: "Core",
            tip: "",
            use: "",
            track: false,
            signal: 50,
            svg: '<svg viewBox="0 0 420 520"><style></style></svg>',
          },
        ],
      })
    ).toThrow(/@keyframes/);
  });

  it("rejects duplicate pose keys", () => {
    expect(() =>
      validateExportedPosePack({
        slug: "x",
        css: "@keyframes x{0%{opacity:1}}",
        poses: [
          {
            key: "idle",
            label: "Idle",
            cat: "Core",
            tip: "",
            use: "",
            track: false,
            signal: 50,
            svg: '<svg viewBox="0 0 420 520"><style></style></svg>',
          },
          {
            key: "idle",
            label: "Idle 2",
            cat: "Core",
            tip: "",
            use: "",
            track: false,
            signal: 50,
            svg: '<svg viewBox="0 0 420 520"><style></style></svg>',
          },
        ],
      })
    ).toThrow(/Duplicate pose key/);
  });
});

describe("buildPosePackFromSource meta", () => {
  it("embeds optional POSE_SOURCE.meta in the pack", () => {
    const pack = buildPosePackFromSource({
      slug: "demo",
      meta: {
        name: "Demo Fox",
        tagline: "A demo mascot",
        accent: "#AABBCC",
        stage: "#112233",
      },
      poses: [
        {
          key: "idle",
          label: "Idle",
          cat: "Core",
          tip: "",
          use: "",
          track: false,
          signal: 50,
        },
      ],
      renderPose: () =>
        React.createElement(
          "svg",
          {
            viewBox: "0 0 420 520",
            xmlns: "http://www.w3.org/2000/svg",
          },
          React.createElement("style", null, ".demo-float{animation:demo-float 1s infinite}@keyframes demo-float{0%,100%{opacity:1}}"),
          React.createElement("circle", {
            cx: "210",
            cy: "260",
            r: "40",
            fill: "#AABBCC",
          })
        ),
    });

    expect(pack.meta?.name).toBe("Demo Fox");
    expect(pack.css).toContain("@keyframes demo-float");
    const imported = parseMarketplacePackFile(JSON.stringify(pack));
    expect(imported.name).toBe("Demo Fox");
    expect(imported.accent).toBe("#AABBCC");
  });
});

describe("applyThemeContract root class", () => {
  it("merges ms-root into the existing root class attribute", () => {
    const themed = applyThemeContract(
      '<svg class="ck-svg ck-nox" viewBox="0 0 420 520"><style></style><circle fill="#AABBCC"/></svg>',
      {
        name: "Primary",
        top: "#AABBCC",
        mid: "#BBCCDD",
        base: "#CCDDEE",
        core: "#DDEEFF",
        stage: "#112233",
        features: "#223344",
      },
      "#334455"
    );
    const root = themed.match(/^<svg\b[^>]*>/)?.[0];

    expect(root).toBeTruthy();
    expect(root).toContain("ck-svg");
    expect(root).toContain("ck-nox");
    expect(root).toContain("ms-root");
    expect(root?.match(/\bclass=/g)).toHaveLength(1);
    expect(root?.match(/\bms-root\b/g)).toHaveLength(1);
  });

  it("remaps blush to --ms-blush when the theme declares it", () => {
    const themed = applyThemeContract(
      '<svg viewBox="0 0 10 10"><circle fill="#E8A8C8"/></svg>',
      {
        name: "Twilight",
        top: "#F0E6FF",
        mid: "#C4A8E8",
        base: "#7A62B0",
        core: "#FFF6DE",
        stage: "#1A1628",
        features: "#3A2A58",
        blush: "#E8A8C8",
      },
      "#B8A0E0"
    );

    expect(themed).toContain("fill=\"var(--ms-blush)\"");
    expect(themed).toContain("--ms-blush:#E8A8C8");
  });

  it("preserves family classes when export classes are added", () => {
    expect(
      mergeSvgClassNames(
        "ms-root ck-svg ck-pip ck-pose-talking",
        "ms-root",
        "ms-g-talking"
      )
    ).toBe("ms-root ck-svg ck-pip ck-pose-talking ms-g-talking");
  });
});

describe("Granary toggle parts", () => {
  const expectedParts = [
    "accessory",
    "body",
    "brows",
    "crest",
    "effects",
    "eyes",
    "halo",
    "instrument",
    "limbs",
    "mouth",
    "prop",
    "shadow",
    "tail",
  ];
  const persistentParts = [
    "body",
    "crest",
    "eyes",
    "halo",
    "limbs",
    "mouth",
    "shadow",
  ];

  const partKeys = (svg: string) =>
    new Set(
      [...svg.matchAll(/data-ms-part=["']([^"']+)["']/g)].map(
        (match) => match[1]!
      )
    );

  it("exports and imports every toggleable visual layer", () => {
    const posePack = buildPosePack("granary");
    const imported = finalizeMarketplacePack(
      parseMarketplacePackFile(JSON.stringify(posePack))
    );

    expect(imported.parts.map((part) => part.key).sort()).toEqual(
      [...expectedParts].sort()
    );

    for (const part of imported.parts) {
      expect(
        imported.gestures.some((gesture) =>
          gesture.svg.includes(`data-ms-part="${part.key}"`)
        ),
        `part “${part.key}” must control at least one rendered element`
      ).toBe(true);
    }
  });

  it("keeps the core controls available in every pose", () => {
    const posePack = buildPosePack("granary");

    for (const pose of posePack.poses) {
      const keys = partKeys(pose.svg);
      for (const key of persistentParts) {
        expect(
          keys.has(key),
          `${pose.key} must expose the “${key}” toggle`
        ).toBe(true);
      }
      expect(pose.svg).toContain("ms-root");
      expect(pose.svg).toContain("ms-glow-halo");
    }

    const flightPose = posePack.poses.find((pose) => pose.key === "flying")!;
    const flightKeys = partKeys(flightPose.svg);
    expect(flightKeys.has("tail")).toBe(true);
    expect(flightKeys.has("accessory")).toBe(false);

    const trackedPoses = posePack.poses.filter((pose) => pose.track);
    expect(trackedPoses.length).toBeGreaterThan(0);
    for (const pose of trackedPoses) {
      expect(pose.svg).toMatch(/class=["'][^"']*\bms-eyes\b/);
    }
  });

  it("normalizes snapshots to the shared theme and spotlight contract", () => {
    const imported = finalizeMarketplacePack(
      parseMarketplacePackFile(JSON.stringify(buildPosePack("granary")))
    );
    const normalized = normalizeGeneratedMascot(
      imported,
      imported.gestures
    );

    for (const gesture of normalized.gestures) {
      expect(gesture.svg).toContain("var(--ms-top)");
      expect(gesture.svg).toContain("var(--ms-glow)");
      expect(gesture.svg).toContain("ms-glow-halo");
    }
  });
});

describe("factory pack marketplace parity", () => {
  const partKeys = (svg: string) =>
    new Set(
      [...svg.matchAll(/data-ms-part=["']([^"']+)["']/g)].map(
        (match) => match[1]!
      )
    );

  const octopusParts = [
    "suckers",
    "spots",
    "brows",
    "blush",
    "specs",
    "cap",
    "slate",
    "chips",
    "siphon",
    "props",
    "halo",
    "shadow",
    "eyes",
  ] as const;

  const byteParts = [
    "antenna",
    "ears",
    "arms",
    "chest",
    "rivets",
    "legs",
    "frame",
    "scan",
    "blush",
    "thrusters",
    "halo",
    "shadow",
    "props",
    "eyes",
  ] as const;

  const hayParts = [
    "ears",
    "whiskers",
    "arms",
    "legs",
    "belly",
    "brows",
    "blush",
    "nose",
    "vest",
    "cape",
    "coins",
    "flames",
    "halo",
    "shadow",
    "props",
    "eyes",
  ] as const;

  for (const [slug, expectedParts] of [
    ["kelp", octopusParts],
    ["numi", octopusParts],
    ["lexa", octopusParts],
    ["coda", octopusParts],
    ["nori", octopusParts],
    ["byte", byteParts],
    ["hay", hayParts],
  ] as const) {
    it(`${slug} exports a full parts catalog for marketplace preview`, () => {
      const imported = finalizeMarketplacePack(
        parseMarketplacePackFile(JSON.stringify(buildPosePack(slug)))
      );

      expect(imported.parts.map((part) => part.key).sort()).toEqual(
        [...expectedParts].sort()
      );
      expect(Object.keys(imported.themes).length).toBeGreaterThan(0);

      for (const part of imported.parts) {
        expect(
          imported.gestures.some((gesture) =>
            gesture.svg.includes(`data-ms-part="${part.key}"`)
          ),
          `part “${part.key}” must control at least one rendered element`
        ).toBe(true);
      }
    });

    it(`${slug} idle pose carries theme contract and ms-glow-halo`, () => {
      const imported = finalizeMarketplacePack(
        parseMarketplacePackFile(JSON.stringify(buildPosePack(slug)))
      );
      const idle = imported.gestures.find((g) => g.key === "idle");
      expect(idle?.svg).toMatch(/\/\*ms-theme-vars\*\//);
      expect(idle?.svg).toMatch(/var\(--ms-(top|mid|base|core)\)/);
      expect(idle?.svg).toContain("ms-glow-halo");
    });
  }

  it("kelp exports live energy instrument with nm-chips hooks", () => {
    const imported = finalizeMarketplacePack(
      parseMarketplacePackFile(JSON.stringify(buildPosePack("kelp")))
    );

    expect(imported.instrument.hidden).not.toBe(true);
    expect(imported.instrument.label).toBe("Energy");
    expect(imported.gestures.some((g) => g.svg.includes("nm-chips"))).toBe(
      true
    );
  });

  it("octopus writing pose exposes slate part only when rendered", () => {
    const pack = buildPosePack("kelp");
    const writing = pack.poses.find((p) => p.key === "writing")!;
    const idle = pack.poses.find((p) => p.key === "idle")!;
    expect(partKeys(writing.svg).has("slate")).toBe(true);
    expect(partKeys(idle.svg).has("slate")).toBe(false);
  });
});
