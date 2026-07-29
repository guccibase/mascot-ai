import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolvePackLoadStrategy,
  shouldMountIconPreviewDialog,
  snapshotFromActivePack,
} from "../app-assets/pack-panel-state";

describe("shouldMountIconPreviewDialog", () => {
  it("mounts only while a sample is expanded", () => {
    expect(shouldMountIconPreviewDialog(null)).toBe(false);
    expect(shouldMountIconPreviewDialog("a")).toBe(true);
  });
});

describe("resolvePackLoadStrategy", () => {
  it("sync-reloads when the target pack is already active", () => {
    expect(
      resolvePackLoadStrategy({
        targetPackId: "pack_1",
        activePackId: "pack_1",
      })
    ).toBe("sync");
  });

  it("async-loads when switching packs or cache is empty", () => {
    expect(
      resolvePackLoadStrategy({
        targetPackId: "pack_2",
        activePackId: "pack_1",
      })
    ).toBe("async");
    expect(
      resolvePackLoadStrategy({
        targetPackId: "pack_1",
        activePackId: null,
      })
    ).toBe("async");
  });
});

describe("snapshotFromActivePack", () => {
  it("normalizes optional fields for panel state", () => {
    expect(
      snapshotFromActivePack({
        sampleOptions: [{ id: "a", label: "Option A", url: "/a.png" }],
        selectedSampleId: undefined,
        files: [],
        styleDescription: undefined,
        kinds: ["app_icon"],
      })
    ).toEqual({
      samples: [{ id: "a", label: "Option A", url: "/a.png" }],
      selectedSampleId: null,
      files: [],
      styleDescription: "",
      kinds: ["app_icon"],
    });
  });
});

describe("app-assets panel reopen wiring", () => {
  const source = readFileSync(
    join(__dirname, "../../components/app-assets-panel.tsx"),
    "utf8"
  );

  it("gates the icon preview dialog with shouldMountIconPreviewDialog", () => {
    expect(source).toMatch(/shouldMountIconPreviewDialog\(expandedSampleId\)/);
    expect(source).toMatch(
      /\{shouldMountIconPreviewDialog\(expandedSampleId\) && expandedSample \?/
    );
  });

  it("uses sync/async pack load strategy for previous packs", () => {
    expect(source).toMatch(/resolvePackLoadStrategy/);
    expect(source).toMatch(/strategy === "sync"/);
    expect(source).toMatch(/packLoadToken/);
  });
});

describe("dialog closed-state click safety", () => {
  it("disables pointer events on closed overlay and popup", () => {
    const source = readFileSync(
      join(__dirname, "../../components/ui/dialog.tsx"),
      "utf8"
    );
    expect(source).toMatch(/data-closed:pointer-events-none/);
    expect(source.match(/data-closed:pointer-events-none/g)?.length).toBeGreaterThanOrEqual(
      2
    );
  });
});
