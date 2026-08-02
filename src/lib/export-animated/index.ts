import { captureSvgAnimationFrames } from "./capture-frames";
import { downloadBlobFile } from "./download-file";
import { encodeApng } from "./encode-apng";
import { encodeAnimatedWebp, supportsWebpEncode } from "./encode-webp";
import type {
  AnimatedRasterOptions,
  PoseExportFormat,
  RasterScale,
} from "./types";
import {
  DEFAULT_EXPORT_FPS,
  TYPICAL_EXPORT_DURATION_SEC,
  rasterPixelSize,
} from "./types";

export type {
  AnimatedRasterOptions,
  CapturedFrames,
  PoseExportFormat,
  RasterScale,
} from "./types";
export {
  DEFAULT_EXPORT_DURATION_SEC,
  DEFAULT_EXPORT_FPS,
  STUDIO_VIEW_HEIGHT,
  STUDIO_VIEW_WIDTH,
  TYPICAL_EXPORT_DURATION_SEC,
  rasterPixelSize,
} from "./types";
export { downloadBlobFile } from "./download-file";
export { encodeApng } from "./encode-apng";
export { encodeAnimatedWebp, supportsWebpEncode } from "./encode-webp";
export { captureSvgAnimationFrames, hasVisibleMotion } from "./capture-frames";

export function poseExportExtension(format: PoseExportFormat): string {
  if (format === "svg") return "svg";
  if (format === "apng") return "png";
  return "webp";
}

export function poseExportMime(format: PoseExportFormat): string {
  if (format === "svg") return "image/svg+xml";
  if (format === "apng") return "image/png";
  return "image/webp";
}

/** Rough wall-clock estimate. Capture runs once per pose; encode is additive. */
export function estimatePackRasterSeconds(
  poseCount: number,
  scale: RasterScale,
  includeWebp = true
): number {
  const frames = Math.round(TYPICAL_EXPORT_DURATION_SEC * DEFAULT_EXPORT_FPS);
  const captureMs = scale === "2x" ? 45 : 28;
  const encodeMs = scale === "2x" ? 18 : 12;
  const webpFactor = includeWebp ? 1 : 0;
  const totalMs =
    poseCount * frames * captureMs +
    poseCount * frames * encodeMs * (1 + webpFactor);
  return Math.max(3, Math.ceil(totalMs / 1000));
}

export function estimatePackRasterMegabytes(
  poseCount: number,
  scale: RasterScale,
  includeWebp = true
): number {
  const { width, height } = rasterPixelSize(scale);
  const pixels = width * height;
  const apngBytes = pixels * 0.12;
  const webpBytes = includeWebp ? pixels * 0.07 : 0;
  return Math.max(1, Math.round((poseCount * (apngBytes + webpBytes)) / (1024 * 1024)));
}

/** Capture once, encode APNG (+ animated WebP when supported / requested). */
export async function encodeAnimatedPair(
  svgMarkup: string,
  opts: AnimatedRasterOptions & { includeWebp?: boolean } = {}
): Promise<{ apng: Uint8Array; webp: Uint8Array | null; hasMotion: boolean }> {
  const includeWebp = opts.includeWebp !== false;
  const captured = await captureSvgAnimationFrames(svgMarkup, {
    ...opts,
    onProgress: (p, label) => opts.onProgress?.(p * 0.7, label),
  });
  opts.onProgress?.(0.78, "Encoding APNG");
  const apng = encodeApng(captured);
  if (!includeWebp) {
    opts.onProgress?.(1, "Done");
    return { apng, webp: null, hasMotion: captured.hasMotion };
  }
  opts.onProgress?.(0.9, "Encoding animated WebP");
  try {
    const webp = await encodeAnimatedWebp(captured, 0.9, opts.signal);
    opts.onProgress?.(1, "Done");
    return { apng, webp, hasMotion: captured.hasMotion };
  } catch (error) {
    // Pack must not fail after APNG succeeds (capability races / encode quirks).
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    opts.onProgress?.(1, "Done");
    return { apng, webp: null, hasMotion: captured.hasMotion };
  }
}

export async function encodePoseRaster(
  svgMarkup: string,
  format: Exclude<PoseExportFormat, "svg">,
  opts: AnimatedRasterOptions = {}
): Promise<Uint8Array> {
  if (format === "webp" && !(await supportsWebpEncode())) {
    throw new Error("This browser cannot encode WebP images");
  }
  const captured = await captureSvgAnimationFrames(svgMarkup, {
    ...opts,
    onProgress: (p, label) => opts.onProgress?.(p * 0.85, label),
  });
  opts.onProgress?.(
    0.9,
    format === "apng" ? "Encoding APNG" : "Encoding WebP"
  );
  if (format === "apng") return encodeApng(captured);
  return encodeAnimatedWebp(captured, 0.9, opts.signal);
}

export function downloadPoseBytes(args: {
  format: Exclude<PoseExportFormat, "svg">;
  filenameBase: string;
  bytes: Uint8Array;
}): void {
  downloadBlobFile(
    args.bytes,
    `${args.filenameBase}.${poseExportExtension(args.format)}`,
    poseExportMime(args.format)
  );
}
