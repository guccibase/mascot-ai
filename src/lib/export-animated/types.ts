export type PoseExportFormat = "svg" | "apng" | "webp";

export type RasterScale = "1x" | "2x";

export type AnimatedRasterOptions = {
  /** Logical studio size is 420×520; 2x doubles pixel dimensions. */
  scale?: RasterScale;
  /** Frames per second (default 15). */
  fps?: number;
  /** Loop length in seconds (auto-detected from CSS/SMIL when omitted). */
  durationSec?: number;
  /** Optional progress 0–1. */
  onProgress?: (progress: number, label: string) => void;
  /** Abort mid-capture. */
  signal?: AbortSignal;
};

export type CapturedFrames = {
  width: number;
  height: number;
  /** RGBA ArrayBuffers, one per frame. */
  frames: ArrayBuffer[];
  /** Per-frame delay in milliseconds. */
  delaysMs: number[];
  /** False for still poses (2 identical frames). Pack export still includes them. */
  hasMotion: boolean;
};

export const STUDIO_VIEW_WIDTH = 420;
export const STUDIO_VIEW_HEIGHT = 520;
export const DEFAULT_EXPORT_FPS = 15;
/** Fallback when markup has no detectable animation period. */
export const DEFAULT_EXPORT_DURATION_SEC = 2;
/** Typical mascot CSS loop (e.g. `.nm-float` 4.2s) for pack ETA heuristics. */
export const TYPICAL_EXPORT_DURATION_SEC = 4.2;

export function rasterPixelSize(scale: RasterScale = "1x"): {
  width: number;
  height: number;
} {
  const mult = scale === "2x" ? 2 : 1;
  return {
    width: STUDIO_VIEW_WIDTH * mult,
    height: STUDIO_VIEW_HEIGHT * mult,
  };
}
