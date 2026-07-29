import { describe, expect, it } from "vitest";
import { packHasLiveSignal, toGeneratedMascot } from "@/lib/mascot-pack";
import { normalizeInstrumentDefault } from "@/lib/studio-utils";

const basePack = {
  name: "Bud",
  tagline: "Chick",
  accent: "#F59A48",
  themes: {
    dawn: {
      name: "First Light",
      top: "#f8b679",
      mid: "#F59A48",
      base: "#b57236",
      core: "#FFE4BE",
      stage: "#2B3555",
    },
  },
  instrument: {
    label: "Signal",
    description: "Intensity",
    lowLabel: "Low",
    midLabel: "Mid",
    highLabel: "High",
    defaultValue: 50,
    ramp: ["#F59A48", "#E09A3A", "#C47E28", "#A8661C", "#8A5414"] as [
      string,
      string,
      string,
      string,
      string,
    ],
  },
  gestures: [
    {
      key: "idle",
      label: "Idle",
      cat: "Core",
      tip: "",
      use: "",
      svg: '<svg viewBox="0 0 420 520"><circle class="bd-float"/></svg>',
    },
  ],
  parts: [],
};

describe("packHasLiveSignal", () => {
  it("detects ms-signal-fan markup", () => {
    expect(
      packHasLiveSignal([
        { svg: '<svg><g class="ms-signal-fan"></g></svg>' },
      ])
    ).toBe(true);
  });

  it("is false for example studios without signal hooks", () => {
    expect(packHasLiveSignal(basePack.gestures)).toBe(false);
  });
});

describe("toGeneratedMascot", () => {
  it("hides Signal when the pack has no live signal markup", () => {
    const pack = toGeneratedMascot(basePack);
    expect(pack.instrument.hidden).toBe(true);
  });

  it("keeps Signal visible when markup supports it", () => {
    const pack = toGeneratedMascot({
      ...basePack,
      gestures: [
        {
          ...basePack.gestures[0]!,
          svg: '<svg><g class="ms-signal-fan"><path/></g></svg>',
        },
      ],
    });
    expect(pack.instrument.hidden).toBe(false);
  });

  it("honors explicit instrument.hidden even with fan markup", () => {
    const pack = toGeneratedMascot({
      ...basePack,
      instrument: { ...basePack.instrument, hidden: true },
      gestures: [
        {
          ...basePack.gestures[0]!,
          svg: '<svg><g class="ms-signal-fan"></g></svg>',
        },
      ],
    });
    expect(pack.instrument.hidden).toBe(true);
  });

  it("coerces stub instrument defaults (e.g. 3) up to a usable resting value", () => {
    const pack = toGeneratedMascot({
      ...basePack,
      instrument: { ...basePack.instrument, defaultValue: 3 },
      gestures: [
        {
          ...basePack.gestures[0]!,
          svg: '<svg><g class="ms-signal-fan"></g></svg>',
        },
      ],
    });
    expect(pack.instrument.defaultValue).toBe(50);
  });
});

describe("normalizeInstrumentDefault", () => {
  it("keeps mid-range values", () => {
    expect(normalizeInstrumentDefault(68)).toBe(68);
    expect(normalizeInstrumentDefault(55)).toBe(55);
  });

  it("scales 0–1 fractions", () => {
    expect(normalizeInstrumentDefault(0.68)).toBe(68);
  });

  it("replaces near-zero stubs with the craft fallback", () => {
    expect(normalizeInstrumentDefault(3)).toBe(68);
    expect(normalizeInstrumentDefault(0)).toBe(68);
    expect(normalizeInstrumentDefault(undefined)).toBe(68);
  });
});
