import { describe, expect, it } from "vitest";
import { setSignalPaint } from "@/lib/studio-utils";
import { packSignalPartKey } from "@/lib/mascot-pack";

function mockPaintTarget(initial: Record<string, string> = {}) {
  const attrs = { ...initial };
  return {
    getAttribute: (name: string) => attrs[name] ?? null,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    hasAttribute: (name: string) => name in attrs,
    snapshot: () => ({ ...attrs }),
  };
}

describe("setSignalPaint", () => {
  it("stores and restores original fill when toggling off", () => {
    const el = mockPaintTarget({ fill: "#2A8A6A" });

    setSignalPaint(el, "fill", "#FF0000", true);
    expect(el.snapshot().fill).toBe("#FF0000");
    expect(el.snapshot()["data-ms-orig-fill"]).toBe("#2A8A6A");

    setSignalPaint(el, "fill", "#FF0000", false);
    expect(el.snapshot().fill).toBe("#2A8A6A");
  });

  it("does not mutate fill=none", () => {
    const el = mockPaintTarget({ fill: "none" });
    setSignalPaint(el, "fill", "#FF0000", true);
    expect(el.snapshot().fill).toBe("none");
    expect(el.snapshot()["data-ms-orig-fill"]).toBeUndefined();
  });
});

describe("packSignalPartKey", () => {
  it("returns chips for octopus nm-chips markup", () => {
    expect(
      packSignalPartKey([{ svg: '<svg><g class="nm-chips"></g></svg>' }])
    ).toBe("chips");
  });

  it("returns instrument for ms-signal-fan markup", () => {
    expect(
      packSignalPartKey([{ svg: '<svg><g class="ms-signal-fan"></g></svg>' }])
    ).toBe("instrument");
  });

  it("returns null for tint-only packs", () => {
    expect(
      packSignalPartKey([{ svg: '<svg><path class="ms-signal-tint"/></svg>' }])
    ).toBe(null);
  });
});
