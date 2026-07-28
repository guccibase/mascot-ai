import { describe, expect, it } from "vitest";
import { GESTURE_CATEGORIES, GESTURE_PRESETS } from "@/lib/gesture-presets";

describe("gesture-presets", () => {
  it("has 37 presets across four categories", () => {
    expect(GESTURE_PRESETS).toHaveLength(37);
    expect(GESTURE_CATEGORIES).toEqual(["Core", "Moods", "Action", "Feedback"]);
  });

  it("uses unique keys and valid categories", () => {
    const keys = GESTURE_PRESETS.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const preset of GESTURE_PRESETS) {
      expect(GESTURE_CATEGORIES).toContain(preset.cat);
      expect(preset.label.trim()).not.toBe("");
      expect(preset.tip.trim()).not.toBe("");
      expect(preset.use.trim()).not.toBe("");
    }
  });

  it("keeps default create keys", () => {
    const keys = new Set(GESTURE_PRESETS.map((g) => g.key));
    expect(keys.has("idle")).toBe(true);
    expect(keys.has("wave")).toBe(true);
    expect(keys.has("happy")).toBe(true);
  });

  it("groups presets by category counts", () => {
    const counts = Object.fromEntries(
      GESTURE_CATEGORIES.map((cat) => [
        cat,
        GESTURE_PRESETS.filter((g) => g.cat === cat).length,
      ])
    );
    expect(counts).toEqual({ Core: 8, Moods: 12, Action: 11, Feedback: 6 });
  });
});
