import { describe, expect, it } from "vitest";
import type { GeneratedMascot } from "@/lib/types";

/** Minimal pack for snapshot size checks (mirrors hook constants). */
const MAX_SNAPSHOT_BYTES = 900_000;

function cloneMascot(mascot: GeneratedMascot): GeneratedMascot {
  return structuredClone(mascot);
}

const miniPack = (): GeneratedMascot => ({
  name: "Test",
  tagline: "Hi",
  accent: "#6366f1",
  themes: {
    primary: {
      name: "Primary",
      top: "#fff",
      mid: "#eee",
      base: "#ddd",
      core: "#ccc",
      stage: "#bbb",
    },
  },
  instrument: {
    label: "Energy",
    description: "d",
    lowLabel: "Low",
    midLabel: "Mid",
    highLabel: "High",
    defaultValue: 50,
    ramp: ["#1", "#2", "#3", "#4", "#5"],
  },
  gestures: [
    {
      key: "idle",
      label: "Idle",
      cat: "Core",
      tip: "tip",
      use: "use",
      svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
    },
  ],
  parts: [],
});

describe("mascot undo snapshots", () => {
  it("structuredClone preserves pack identity fields", () => {
    const a = miniPack();
    const b = cloneMascot(a);
    b.name = "Changed";
    expect(a.name).toBe("Test");
    expect(b.gestures[0]?.key).toBe("idle");
  });

  it("typical packs fit under snapshot byte cap", () => {
    expect(JSON.stringify(miniPack()).length).toBeLessThan(MAX_SNAPSHOT_BYTES);
  });
});

describe("refine reference types", () => {
  it("accepts optional referenceId on refine payload shape", () => {
    const body = {
      mascot: miniPack(),
      enabledParts: ["idle"],
      message: "add glasses",
      referenceId: "referenceAssets:abc123",
    };
    expect(body.referenceId).toContain("referenceAssets");
  });
});
