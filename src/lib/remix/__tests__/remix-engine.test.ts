import { describe, expect, it } from "vitest";
import { buildPosePack } from "@/lib/example-poses/build-pack";
import { restoreSharedCss } from "@/lib/example-poses/types";
import { annotateStudioContract, stripAnimationsForThumbnail } from "@/lib/remix/contract";
import { indexPosePack } from "@/lib/remix/cross-pose";
import { applyPaletteMap, collectPalette, normalizeHex } from "@/lib/remix/palette";
import { applyEdits, preservationGate } from "@/lib/remix/patch";
import { indexSvg } from "@/lib/remix/element-index";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { extractPartsFromMascot } from "@/lib/mascot-parts";

describe("remix engine", () => {
  it("indexes lyra idle with stable ids", () => {
    const pack = buildPosePack("lyra");
    const svg = restoreSharedCss(pack.poses[0]!.svg, pack.css);
    const { svg: indexed, elements } = indexSvg(svg);
    expect(elements.length).toBeGreaterThan(10);
    expect(indexed).toContain('data-ms-id="');
    expect(indexed.match(/data-ms-id="/g)?.length).toBe(elements.length);
  });

  it("partitions shared vs variant elements across poses", () => {
    const pack = buildPosePack("lyra");
    const keys = ["idle", "listening", "bravo"];
    const { sharedManifest, variantManifests } = indexPosePack(
      pack.poses,
      pack.css,
      keys
    );
    expect(sharedManifest.length).toBeGreaterThan(0);
    expect(
      keys.some((key) => (variantManifests[key]?.length ?? 0) > 0)
    ).toBe(true);
  });

  it("preserves animations when applying a fill-only edit", () => {
    const pack = buildPosePack("lyra");
    const svg = restoreSharedCss(pack.poses[0]!.svg, pack.css);
    const { svg: indexed, elements } = indexSvg(svg);
    const target = elements.find((e) => e.fill);
    expect(target).toBeTruthy();

    const before = indexed;
    const { svg: patched } = applyEdits(before, [
      { id: target!.id, fill: "#AABBCC" },
    ]);

    expect(preservationGate(before, patched)).toBe(true);
    expect(patched).toContain("<animate");
    expect(patched).toContain('viewBox="0 0 420 520"');
    expect(sanitizeSvg(patched)).toContain("<svg");
  });

  it("applies palette map case-insensitively", () => {
    const hex = "#3A4757";
    const svg = `<svg><path fill="${hex}" d="M0,0"/></svg>`;
    const out = applyPaletteMap(svg, { [hex]: "#112233" });
    expect(out.toLowerCase()).toContain("#112233");
  });

  it("annotates studio contract on a real pose", () => {
    const pack = buildPosePack("lyra");
    const svg = restoreSharedCss(pack.poses[0]!.svg, pack.css);
    const out = annotateStudioContract(svg, "lyra");
    expect(out).toContain("ms-root");
    expect(out).toContain("ms-eyes");
    expect(out).toContain("var(--ms-glow,");
  });

  it("stripAnimationsForThumbnail removes SMIL but keeps geometry", () => {
    const pack = buildPosePack("sol");
    const svg = restoreSharedCss(pack.poses[0]!.svg, pack.css);
    const thumb = stripAnimationsForThumbnail(svg);
    expect(thumb).not.toMatch(/<animate/i);
    expect(thumb).toContain("<path");
  });

  it("normalizeHex expands shorthand", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
  });

  it("extractPartsFromMascot sees ms- parts after contract annotation", () => {
    const pack = buildPosePack("bud");
    const svg = annotateStudioContract(
      restoreSharedCss(pack.poses[0]!.svg, pack.css),
      "bud"
    );
    const parts = extractPartsFromMascot({
      gestures: [{ key: "idle", label: "Idle", cat: "Core", tip: "", use: "", svg }],
      parts: [],
      instrument: {
        label: "Signal",
        description: "",
        lowLabel: "Low",
        midLabel: "Mid",
        highLabel: "High",
        defaultValue: 50,
        ramp: ["#000", "#111", "#222", "#333", "#444"],
      },
    });
    expect(parts.some((p) => p.key === "eyes" || p.key === "halo")).toBe(true);
  });
});
