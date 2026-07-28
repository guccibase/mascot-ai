import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadExampleMarketplacePack,
  parseMarketplaceUpload,
} from "@/lib/marketplace/example-packs";
import {
  finalizeMarketplacePack,
  parseMarketplacePackFile,
} from "@/lib/marketplace/parse-pack-file";
import {
  MAX_PACK_JSON_BYTES,
  buildListingSearchText,
  packFingerprint,
} from "../../../convex/lib/marketplace";

const samplePack = {
  name: "Nova Fox",
  tagline: "A clever night messenger",
  accent: "#F5B34F",
  themes: {
    primary: {
      name: "Dusk",
      top: "#F5B34F",
      mid: "#E09A3A",
      base: "#C47E28",
      core: "#8A5414",
      stage: "#1a1f2e",
    },
  },
  instrument: {
    label: "Signal",
    description: "Brightness",
    lowLabel: "Low",
    midLabel: "Mid",
    highLabel: "High",
    defaultValue: 50,
    ramp: ["#F5B34F", "#E09A3A", "#C47E28", "#A8661C", "#8A5414"],
  },
  gestures: [
    {
      key: "idle",
      label: "Idle",
      cat: "Core",
      tip: "Resting",
      use: "Default",
      svg: "<svg xmlns='http://www.w3.org/2000/svg'><circle/></svg>",
    },
    {
      key: "wave",
      label: "Wave",
      cat: "Delight",
      tip: "Hello",
      use: "Greeting",
      svg: "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>",
    },
  ],
  parts: [{ key: "tail", label: "Tail", category: "body" }],
};

describe("parseMarketplacePackFile", () => {
  it("parses raw JSON packs", () => {
    const pack = parseMarketplacePackFile(JSON.stringify(samplePack));
    expect(pack.name).toBe("Nova Fox");
    expect(pack.gestures).toHaveLength(2);
  });

  it("parses MARKETPLACE_PACK export from JSX text", () => {
    const jsx = `
      "use client";
      export const MARKETPLACE_PACK = ${JSON.stringify(samplePack)};
      export default function X() { return null }
    `;
    const pack = parseMarketplacePackFile(jsx);
    expect(pack.name).toBe("Nova Fox");
  });

  it("converts example pose-pack JSON into a GeneratedMascot", () => {
    const posePack = {
      slug: "bud",
      css: ".bd-float{animation:x 1s}",
      poses: [
        {
          key: "idle",
          label: "Idle",
          cat: "Core",
          tip: "Rest",
          use: "Home",
          track: true,
          signal: 62,
          svg: "<svg><style></style><circle/></svg>",
        },
      ],
    };
    const pack = parseMarketplacePackFile(JSON.stringify(posePack));
    expect(pack.name).toBe("Bud");
    expect(pack.gestures[0]?.svg).toContain(".bd-float");
    expect(pack.instrument.ramp).toHaveLength(5);
  });

  it("uses embedded pose-pack meta for custom slugs", () => {
    const posePack = {
      slug: "nova",
      css: ".nv-float{animation:nv-float 1s infinite}@keyframes nv-float{0%,100%{opacity:1}}",
      meta: {
        name: "Nova",
        tagline: "Night messenger",
        accent: "#8899AA",
        stage: "#0a0e18",
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
          svg: '<svg viewBox="0 0 420 520"><style></style><circle/></svg>',
        },
      ],
    };
    const pack = parseMarketplacePackFile(JSON.stringify(posePack));
    expect(pack.name).toBe("Nova");
    expect(pack.tagline).toBe("Night messenger");
    expect(pack.accent).toBe("#8899AA");
  });

  it("rejects studio JSX uploads", () => {
    const jsx = `
      "use client";
      const GESTURES = [{ key: "idle" }];
      export const POSE_SOURCE = {
        slug: "bud",
        poses: GESTURES,
        renderPose: (key) => null,
      };
    `;
    expect(() => parseMarketplacePackFile(jsx)).toThrow(/mascot:export/i);
  });

  it("rejects invalid JSON with a clear message", () => {
    expect(() => parseMarketplacePackFile("{not json")).toThrow(
      /Invalid pack JSON/
    );
  });

  it("parses the real bud.json pose pack under the size limit", () => {
    const text = readFileSync(
      resolve(__dirname, "../example-poses/bud.json"),
      "utf8"
    );
    const pack = finalizeMarketplacePack(parseMarketplacePackFile(text));
    expect(pack.name).toBe("Bud");
    expect(pack.gestures).toHaveLength(16);
    expect(JSON.stringify(pack).length).toBeLessThan(MAX_PACK_JSON_BYTES);
  });
});

describe("loadExampleMarketplacePack", () => {
  it("loads Fanous under the Convex pack size limit", async () => {
    const pack = await loadExampleMarketplacePack("fanous");
    expect(pack.name).toBe("Fanous");
    expect(pack.gestures.length).toBeGreaterThan(10);
    expect(JSON.stringify(pack).length).toBeLessThan(MAX_PACK_JSON_BYTES);
  });

  it("rejects studio JSX via parseMarketplaceUpload", async () => {
    await expect(
      parseMarketplaceUpload(
        `export const POSE_SOURCE = { slug: "bud", renderPose: () => null };`,
        "bud-mascot.jsx"
      )
    ).rejects.toThrow(/mascot:export/i);
  });
});

describe("buildListingSearchText", () => {
  it("includes category and pose labels for search", () => {
    const text = buildListingSearchText({
      name: "Nova Fox",
      tagline: "night messenger",
      description: "A fox for chat apps",
      category: "social",
      pack: samplePack,
    });
    expect(text).toContain("social");
    expect(text).toContain("wave");
    expect(text).toContain("greeting");
    expect(text).toContain("tail");
  });
});

describe("packFingerprint", () => {
  it("is stable for the same gesture SVGs and changes when they change", () => {
    const a = packFingerprint(samplePack);
    const b = packFingerprint(samplePack);
    expect(a).toBe(b);
    const tweaked = {
      ...samplePack,
      gestures: samplePack.gestures.map((g, i) =>
        i === 0 ? { ...g, svg: g.svg + " " } : g
      ),
    };
    expect(packFingerprint(tweaked)).not.toBe(a);
  });
});
