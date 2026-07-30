import { describe, expect, it } from "vitest";
import {
  BUD_PARTS,
  FANOUS_PARTS,
  LYRA_PARTS,
  SOL_PARTS,
} from "@/lib/legacy-example-parts";

describe("legacy example part catalogs", () => {
  it("defines unique keys per mascot catalog", () => {
    for (const catalog of [SOL_PARTS, LYRA_PARTS, BUD_PARTS, FANOUS_PARTS]) {
      const keys = catalog.map((part) => part.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("covers the four public example mascots", () => {
    expect(SOL_PARTS.length).toBeGreaterThanOrEqual(8);
    expect(LYRA_PARTS.some((part) => part.key === "instrument")).toBe(true);
    expect(BUD_PARTS.some((part) => part.key === "feet")).toBe(true);
    expect(FANOUS_PARTS.some((part) => part.key === "dome")).toBe(true);
  });
});
