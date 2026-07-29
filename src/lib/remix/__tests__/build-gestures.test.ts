import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { buildPosePack } from "@/lib/example-poses/build-pack";
import { indexPosePack } from "../cross-pose";
import { indexSvg } from "../element-index";
import { buildRemixGestures } from "../build-gestures";
import { examplePackAsGenerated } from "./fixtures";
import { packToRemixSource, preparePackRemixIndex } from "../from-pack";
import * as patch from "../patch";

describe("buildRemixGestures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips poses that fail preservation gate without aborting siblings", () => {
    const pack = buildPosePack("lyra");
    const keys = ["idle", "listening"];
    const { indexed } = indexPosePack(pack.poses, pack.css, keys);
    const gestureRequests = keys.map((key) => {
      const pose = pack.poses.find((p) => p.key === key)!;
      return {
        key: pose.key,
        label: pose.label,
        cat: pose.cat,
        tip: pose.tip,
        use: pose.use,
      };
    });

    let gateCalls = 0;
    vi.spyOn(patch, "preservationGate").mockImplementation(() => {
      gateCalls += 1;
      return gateCalls !== 1;
    });

    const result = buildRemixGestures({
      slug: "owned",
      indexed,
      gestureRequests,
      sharedEdits: [],
      palette: {},
      poseResults: new Map(keys.map((key) => [key, { edits: [] }])),
      originalPoses: pack.poses
        .filter((p) => keys.includes(p.key))
        .map((p) => ({ key: p.key, track: p.track, signal: p.signal })),
    });

    expect(result.skippedGestures).toContain("idle");
    expect(result.gestures.some((g) => g.key === "listening")).toBe(true);
  });
});

describe("from-pack", () => {
  it("preparePackRemixIndex indexes owned library packs", () => {
    const generated = examplePackAsGenerated("bud");
    const prepared = preparePackRemixIndex(generated, ["idle", "happy"]);
    expect(prepared.indexed.length).toBe(2);
    expect(prepared.sharedManifest.length).toBeGreaterThan(0);
    expect(Object.keys(prepared.variantManifests)).toEqual(
      expect.arrayContaining(["idle", "happy"])
    );
  });

  it("packToRemixSource preserves pose metadata", () => {
    const generated = examplePackAsGenerated("lyra");
    const source = packToRemixSource(generated);
    expect(source.name).toBe(generated.name);
    expect(source.poses.some((p) => p.key === "idle")).toBe(true);
    expect(source.poses[0]?.svg).toContain("<svg");
  });

  it("indexed owned pack SVG stays preservation-safe with empty edits", () => {
    const generated = examplePackAsGenerated("sol");
    const { indexed } = preparePackRemixIndex(generated, ["idle"]);
    const svg = indexed[0]!.svg;
    const { svg: indexedSvg } = indexSvg(svg);
    expect(indexedSvg).toContain('data-ms-id="');
    expect(svg).toContain("<svg");
  });
});
