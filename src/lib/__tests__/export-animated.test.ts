import { describe, expect, it } from "vitest";
import {
  cssTransformToSvgAttr,
  stripAnimationCss,
} from "@/lib/export-animated/bake-frame";
import { detectAnimationLoopSec } from "@/lib/export-animated/detect-duration";
import {
  frameDifference,
  hasVisibleMotion,
  opaquePixelScore,
  putBestFrameFirst,
} from "@/lib/export-animated/capture-frames";
import { __testing } from "@/lib/export-animated/encode-webp";
import {
  encodeApng,
  estimatePackRasterMegabytes,
  estimatePackRasterSeconds,
  poseExportExtension,
  poseExportMime,
  rasterPixelSize,
} from "@/lib/export-animated";

const { extractWebpBitstream, muxAnimatedWebp } = __testing;

function solidFrame(
  width: number,
  height: number,
  rgba: [number, number, number, number]
): ArrayBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    data[o] = rgba[0];
    data[o + 1] = rgba[1];
    data[o + 2] = rgba[2];
    data[o + 3] = rgba[3];
  }
  return data.buffer;
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function readU24LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16)
  );
}

function fourCCAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!
  );
}

describe("export-animated helpers", () => {
  it("maps formats to extensions and mime types", () => {
    expect(poseExportExtension("svg")).toBe("svg");
    expect(poseExportExtension("apng")).toBe("png");
    expect(poseExportExtension("webp")).toBe("webp");
    expect(poseExportMime("apng")).toBe("image/png");
    expect(poseExportMime("webp")).toBe("image/webp");
  });

  it("scales studio viewBox for retina exports", () => {
    expect(rasterPixelSize("1x")).toEqual({ width: 420, height: 520 });
    expect(rasterPixelSize("2x")).toEqual({ width: 840, height: 1040 });
  });

  it("estimates pack cost with shared capture (not double-counted)", () => {
    const withWebp = estimatePackRasterSeconds(12, "1x", true);
    const withoutWebp = estimatePackRasterSeconds(12, "1x", false);
    expect(withWebp).toBeGreaterThan(withoutWebp);
    expect(estimatePackRasterMegabytes(12, "2x", true)).toBeGreaterThan(
      estimatePackRasterMegabytes(12, "1x", true)
    );
  });

  it("converts CSS matrix transforms to SVG attributes", () => {
    expect(cssTransformToSvgAttr("none")).toBeNull();
    expect(cssTransformToSvgAttr("matrix(1, 0, 0, 1, 0, -9)")).toBe(
      "matrix(1 0 0 1 0 -9)"
    );
    expect(
      cssTransformToSvgAttr(
        "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -9, 0, 1)"
      )
    ).toBe("matrix(1 0 0 1 0 -9)");
  });

  it("strips animation rules from shared pack CSS", () => {
    const css =
      ".nm-float{animation:nm-float 4.2s infinite}@keyframes nm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}.x{fill:red}";
    const stripped = stripAnimationCss(css);
    expect(stripped).not.toContain("@keyframes");
    expect(stripped).not.toContain("animation:");
    expect(stripped).toContain("fill:red");
  });

  it("detects the longest animation loop in markup", () => {
    const markup = `<svg><style>.a{animation:x 4.2s infinite}@keyframes x{} .b{animation:y 1.2s infinite}</style><animate dur="3s"/></svg>`;
    expect(detectAnimationLoopSec(markup)).toBe(4.2);
  });

  it("takes the max duration from multi-animation shorthand", () => {
    const markup = `<svg><style>.a{animation:x 2s infinite, y 5s infinite}</style></svg>`;
    expect(detectAnimationLoopSec(markup)).toBe(5);
  });

  it("detects SMIL dur when it is the first attribute", () => {
    const markup = `<svg><animateTransform dur="5s" attributeName="transform"/></svg>`;
    expect(detectAnimationLoopSec(markup)).toBe(5);
  });

  it("detects static frame sequences without throwing", () => {
    const w = 4;
    const h = 4;
    const buf = solidFrame(w, h, [10, 20, 30, 255]);
    const frame = {
      width: w,
      height: h,
      data: new Uint8ClampedArray(buf),
    } as ImageData;
    expect(hasVisibleMotion([frame, frame], w, h)).toBe(false);
  });

  it("measures pixel delta between frames", () => {
    const a = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray(solidFrame(2, 2, [0, 0, 0, 255])),
    } as ImageData;
    const b = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray(solidFrame(2, 2, [100, 0, 0, 255])),
    } as ImageData;
    expect(frameDifference(a, b)).toBeGreaterThan(0);
  });

  it("rotates the most opaque frame to the front for thumbnails", () => {
    const blank = solidFrame(2, 2, [0, 0, 0, 0]);
    const solid = solidFrame(2, 2, [255, 0, 0, 255]);
    const frames = [blank, blank, solid];
    const delays = [10, 20, 30];
    expect(opaquePixelScore(blank)).toBe(0);
    expect(opaquePixelScore(solid)).toBeGreaterThan(0);
    putBestFrameFirst(frames, delays);
    expect(opaquePixelScore(frames[0]!)).toBeGreaterThan(0);
    expect(delays[0]).toBe(30);
  });
});

describe("encodeApng", () => {
  it("encodes a two-frame transparent animation with PNG signature", () => {
    const width = 8;
    const height = 8;
    const frames = [
      solidFrame(width, height, [255, 0, 0, 255]),
      solidFrame(width, height, [0, 0, 255, 128]),
    ];
    const bytes = encodeApng({
      width,
      height,
      frames,
      delaysMs: [67, 67],
      hasMotion: true,
    });
    expect(bytes.byteLength).toBeGreaterThan(32);
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    const asText = new TextDecoder("latin1").decode(bytes);
    expect(asText.includes("acTL")).toBe(true);
  });
});

function fakeStillWebp(payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + 8 + payload.byteLength);
  const view = new DataView(out.buffer);
  const contentSize = 4 + 8 + payload.byteLength;
  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, contentSize, true);
  view.setUint32(8, 0x50424557, true);
  view.setUint32(12, 0x20385056, true);
  view.setUint32(16, payload.byteLength, true);
  out.set(payload, 20);
  return out;
}

describe("animated webp mux", () => {
  it("extracts VP8 bitstream and builds a spec-shaped animated RIFF", () => {
    const still = fakeStillWebp(new Uint8Array([1, 2, 3, 4, 5]));
    const { bitstream, hasAlpha } = extractWebpBitstream(still);
    expect(bitstream.byteLength).toBeGreaterThan(8);
    expect(hasAlpha).toBe(false);

    const animated = muxAnimatedWebp({
      width: 16,
      height: 20,
      hasAlpha: true,
      loopCount: 0,
      frames: [
        { bitstream, durationMs: 67 },
        { bitstream, durationMs: 100 },
      ],
    });

    expect(fourCCAt(animated, 0)).toBe("RIFF");
    expect(fourCCAt(animated, 8)).toBe("WEBP");
    expect(readU32LE(animated, 4)).toBe(animated.byteLength - 8);
    expect(fourCCAt(animated, 12)).toBe("VP8X");
    expect(readU32LE(animated, 16)).toBe(10);
    expect(animated[20]! & 0x02).toBeTruthy();
    expect(animated[20]! & 0x10).toBeTruthy();
    expect(readU24LE(animated, 24)).toBe(15);
    expect(readU24LE(animated, 27)).toBe(19);
    expect(fourCCAt(animated, 30)).toBe("ANIM");
    expect(readU32LE(animated, 34)).toBe(6);
    expect(readU32LE(animated, 38)).toBe(0);
    expect(animated[42]! | (animated[43]! << 8)).toBe(0);
    expect(fourCCAt(animated, 44)).toBe("ANMF");
    expect(readU32LE(animated, 48)).toBe(16 + bitstream.byteLength);
    expect(readU24LE(animated, 64)).toBe(67);
    expect(animated[67]).toBe(0x02);
  });
});
