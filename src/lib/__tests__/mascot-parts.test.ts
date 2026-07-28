import { describe, expect, it } from "vitest";
import {
  ensurePartAttributes,
  extractPartsFromMascot,
  listPartKeysInSvg,
} from "@/lib/mascot-parts";
import type { GeneratedMascot } from "@/lib/types";

const baseInstrument = {
  label: "Signal",
  description: "x",
  lowLabel: "L",
  midLabel: "M",
  highLabel: "H",
  defaultValue: 50,
  ramp: ["#1", "#2", "#3", "#4", "#5"] as [
    string,
    string,
    string,
    string,
    string,
  ],
};

describe("mascot-parts", () => {
  it("tags structural groups with data-ms-part", () => {
    const svg = `<svg><g class="ms-eyes"><circle/></g><g class="ms-signal-fan"><path/></g><ellipse class="ms-glow-halo"/></svg>`;
    const out = ensurePartAttributes(svg);
    expect(out).toContain('data-ms-part="eyes"');
    expect(out).toContain('data-ms-part="instrument"');
    expect(out).toContain('data-ms-part="halo"');
  });

  it("does not invent a hit toggle from ms-hit alone", () => {
    const mascot = {
      gestures: [
        {
          key: "idle",
          label: "Idle",
          cat: "Core",
          tip: "",
          use: "",
          svg: `<svg><g id="ms-hit"><rect/></g><g class="ms-eyes" data-ms-part="eyes"><circle/></g></svg>`,
        },
      ],
      parts: [],
      instrument: baseInstrument,
    } satisfies Pick<GeneratedMascot, "gestures" | "parts" | "instrument">;

    const parts = extractPartsFromMascot(mascot);
    expect(parts.some((p) => p.key === "hit")).toBe(false);
    expect(parts.some((p) => p.key === "eyes")).toBe(true);
  });

  it("upgrades inferred markers with structural part metadata", () => {
    const mascot = {
      gestures: [
        {
          key: "idle",
          label: "Idle",
          cat: "Core",
          tip: "",
          use: "",
          svg: `<svg>
            <g class="ms-eyes" data-ms-part="eyes"><circle/></g>
            <g class="ms-signal-fan" data-ms-part="instrument"><path/></g>
            <ellipse class="ms-glow-halo" data-ms-part="halo"/>
          </svg>`,
        },
      ],
      parts: [],
      instrument: baseInstrument,
    } satisfies Pick<GeneratedMascot, "gestures" | "parts" | "instrument">;

    const parts = extractPartsFromMascot(mascot);

    expect(parts.find((part) => part.key === "eyes")).toMatchObject({
      label: "Eyes",
      category: "Face",
      essential: true,
    });
    expect(parts.find((part) => part.key === "instrument")).toMatchObject({
      label: "Signal",
      category: "Instrument",
    });
    expect(parts.find((part) => part.key === "halo")).toMatchObject({
      label: "Glow halo",
      category: "Light",
    });
  });

  it("lists only parts present in SVG markup", () => {
    const svg = `<svg><g data-ms-part="body"/><g data-ms-part="prop"/></svg>`;
    expect(listPartKeysInSvg(svg).sort()).toEqual(["body", "prop"]);
  });
});
