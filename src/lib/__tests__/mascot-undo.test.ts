import { describe, expect, it } from "vitest";
import type { GeneratedMascot } from "@/lib/types";
import {
  MAX_UNDO_SNAPSHOT_BYTES,
  popUndoSnapshot,
  pushUndoSnapshot,
  shouldResetUndoStack,
  snapshotByteSize,
} from "@/hooks/use-mascot-undo";

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
    const pushed = pushUndoSnapshot([], { mascot: a, refineHistoryLength: 0 });
    expect(pushed.saved).toBe(true);
    const restored = pushed.stack[0]?.mascot;
    expect(restored).toBeDefined();
    if (!restored) return;
    restored.name = "Changed";
    expect(a.name).toBe("Test");
    expect(restored.gestures[0]?.key).toBe("idle");
  });

  it("typical packs fit under snapshot byte cap", () => {
    expect(snapshotByteSize(miniPack())).toBeLessThan(MAX_UNDO_SNAPSHOT_BYTES);
  });

  it("push stores refine history length metadata", () => {
    const { stack, saved } = pushUndoSnapshot([], {
      mascot: miniPack(),
      refineHistoryLength: 4,
    });
    expect(saved).toBe(true);
    expect(stack[0]?.refineHistoryLength).toBe(4);
  });

  it("pop returns the most recent snapshot (LIFO)", () => {
    const first = pushUndoSnapshot([], {
      mascot: { ...miniPack(), name: "First" },
      refineHistoryLength: 0,
    });
    const second = pushUndoSnapshot(first.stack, {
      mascot: { ...miniPack(), name: "Second" },
      refineHistoryLength: 2,
    });

    const popped = popUndoSnapshot(second.stack);
    expect(popped.snapshot?.mascot.name).toBe("Second");
    expect(popped.snapshot?.refineHistoryLength).toBe(2);
    expect(popped.stack).toHaveLength(1);
    expect(popped.stack[0]?.mascot.name).toBe("First");
  });

  it("caps stack length at MAX_UNDO_SNAPSHOTS", () => {
    let stack: ReturnType<typeof pushUndoSnapshot>["stack"] = [];
    for (let i = 0; i < 25; i++) {
      const result = pushUndoSnapshot(stack, {
        mascot: { ...miniPack(), name: `M${i}` },
        refineHistoryLength: i,
      });
      stack = result.stack;
    }
    expect(stack).toHaveLength(20);
    expect(stack[0]?.mascot.name).toBe("M5");
    expect(stack[19]?.mascot.name).toBe("M24");
  });

  it("rejects snapshots above byte cap without mutating stack", () => {
    const huge = miniPack();
    huge.gestures = Array.from({ length: 200 }, (_, i) => ({
      key: `pose-${i}`,
      label: `Pose ${i}`,
      cat: "Core",
      tip: "tip",
      use: "use",
      svg: `<svg viewBox="0 0 100 100">${"x".repeat(5000)}</svg>`,
    }));

    expect(snapshotByteSize(huge)).toBeGreaterThan(MAX_UNDO_SNAPSHOT_BYTES);
    const { stack, saved } = pushUndoSnapshot([], {
      mascot: huge,
      refineHistoryLength: 0,
    });
    expect(saved).toBe(false);
    expect(stack).toHaveLength(0);
  });
});

describe("undo session reset", () => {
  it("resets only when switching between saved mascot ids", () => {
    expect(shouldResetUndoStack(null, "mascots:a")).toBe(false);
    expect(shouldResetUndoStack("mascots:a", "mascots:a")).toBe(false);
    expect(shouldResetUndoStack("mascots:a", "mascots:b")).toBe(true);
    expect(shouldResetUndoStack(undefined, "mascots:a")).toBe(false);
    expect(shouldResetUndoStack("mascots:a", null)).toBe(false);
  });

  it("does not reset when first save binds an id after draft edits", () => {
    expect(shouldResetUndoStack(null, "mascots:new")).toBe(false);
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
