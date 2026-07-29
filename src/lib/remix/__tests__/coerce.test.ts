import { describe, expect, it } from "vitest";
import {
  coerceRemixEdits,
  coerceRemixIdentity,
  coerceRemixPose,
} from "../coerce";

describe("coerceRemixIdentity", () => {
  const valid = {
    name: "Nova",
    tagline: "Bright helper",
    accent: "#AABBCC",
    instrument: {
      label: "Signal",
      description: "d",
      lowLabel: "L",
      midLabel: "M",
      highLabel: "H",
      defaultValue: 60,
      ramp: ["#111", "#222", "#333", "#444", "#555"],
    },
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
    palette: { "#112233": "#445566" },
    edits: [{ id: "el-1", fill: "#FF0000" }],
    parts: [{ key: "eyes", label: "Eyes", category: "Face" }],
  };

  it("parses a valid identity payload", () => {
    const out = coerceRemixIdentity(valid, "Fallback");
    expect(out?.name).toBe("Nova");
    expect(out?.edits).toHaveLength(1);
    expect(out?.parts[0]?.key).toBe("eyes");
  });

  it("falls back to request name when model omits name", () => {
    const out = coerceRemixIdentity({ ...valid, name: "  " }, "Fallback");
    expect(out?.name).toBe("Fallback");
  });

  it("rejects missing themes or instrument", () => {
    expect(coerceRemixIdentity({ ...valid, themes: null }, "x")).toBeNull();
    expect(coerceRemixIdentity({ ...valid, instrument: null }, "x")).toBeNull();
  });
});

describe("coerceRemixPose", () => {
  it("accepts empty edits", () => {
    const out = coerceRemixPose({ edits: [] }, "idle");
    expect(out?.key).toBe("idle");
    expect(out?.edits).toEqual([]);
  });

  it("rejects non-object payloads", () => {
    expect(coerceRemixPose(null, "idle")).toBeNull();
  });
});

describe("coerceRemixEdits", () => {
  it("drops edits without ids", () => {
    expect(coerceRemixEdits([{ fill: "#fff" }])).toEqual([]);
  });

  it("keeps valid shape edits", () => {
    expect(
      coerceRemixEdits([{ id: "x1", fill: "#fff", part: "eyes" }])
    ).toEqual([{ id: "x1", fill: "#fff", part: "eyes" }]);
  });
});
