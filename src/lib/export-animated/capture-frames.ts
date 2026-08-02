import { sanitizeSvg } from "@/lib/sanitize-svg";
import {
  bakeSvgCurrentFrame,
  findInfiniteCssAnimatedElements,
  finishOneShotCssAnimations,
  listTreeElements,
  seekCssAnimations,
  snapshotComputedStyles,
} from "./bake-frame";
import { detectAnimationLoopSec } from "./detect-duration";
import {
  DEFAULT_EXPORT_DURATION_SEC,
  DEFAULT_EXPORT_FPS,
  rasterPixelSize,
  type AnimatedRasterOptions,
  type CapturedFrames,
} from "./types";

const SMIL_SELECTOR = "animate, animateTransform, animateMotion, set";

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Animated export aborted", "AbortError");
  }
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function seekSmil(svg: SVGSVGElement, timeSec: number): void {
  try {
    svg.pauseAnimations();
    svg.setCurrentTime(timeSec);
  } catch {
    /* SMIL unavailable */
  }
}

/** Seek only infinite WAAPI timelines (never re-wind finished entrance anims). */
function seekInfiniteWebAnimations(
  svg: SVGSVGElement,
  timeSec: number
): void {
  const animations =
    typeof svg.getAnimations === "function"
      ? svg.getAnimations({ subtree: true })
      : [];
  for (const animation of animations) {
    try {
      const timing = animation.effect?.getComputedTiming();
      if (timing && timing.iterations !== Infinity) continue;
      animation.pause();
      animation.currentTime = timeSec * 1000;
    } catch {
      /* ignore */
    }
  }
}

function seekTimeline(
  svg: SVGSVGElement,
  cssAnimated: readonly SVGElement[],
  timeSec: number
): void {
  seekSmil(svg, timeSec);
  seekCssAnimations(cssAnimated, timeSec);
  seekInfiniteWebAnimations(svg, timeSec);
  svg.getBoundingClientRect();
}

function motionThreshold(width: number, height: number): number {
  return Math.max(400, Math.round((width * height) / 180));
}

/** Sum of absolute RGBA channel deltas between two frames. */
export function frameDifference(a: ImageData, b: ImageData): number {
  if (a.width !== b.width || a.height !== b.height) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    sum +=
      Math.abs(a.data[i]! - b.data[i]!) +
      Math.abs(a.data[i + 1]! - b.data[i + 1]!) +
      Math.abs(a.data[i + 2]! - b.data[i + 2]!) +
      Math.abs(a.data[i + 3]! - b.data[i + 3]!);
  }
  return sum;
}

/** Opaque pixel mass — used to avoid blank first-frame thumbnails. */
export function opaquePixelScore(frame: ArrayBuffer | ImageData): number {
  const data =
    typeof ImageData !== "undefined" && frame instanceof ImageData
      ? frame.data
      : new Uint8ClampedArray(frame as ArrayBuffer);
  let score = 0;
  for (let i = 3; i < data.length; i += 4) {
    score += data[i]!;
  }
  return score;
}

function indexOfMostOpaque(frames: ArrayBuffer[]): number {
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < frames.length; i++) {
    const score = opaquePixelScore(frames[i]!);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Rotate so the most opaque frame is first (Finder / gallery thumbnails). */
export function putBestFrameFirst(
  frames: ArrayBuffer[],
  delaysMs: number[]
): void {
  if (frames.length < 2) return;
  const best = indexOfMostOpaque(frames);
  if (best === 0) return;
  frames.push(...frames.splice(0, best));
  delaysMs.push(...delaysMs.splice(0, best));
}

/** True when sample frames show enough pixel change to count as motion. */
export function hasVisibleMotion(
  frames: ImageData[],
  width: number,
  height: number
): boolean {
  if (frames.length < 2) return false;
  const threshold = motionThreshold(width, height);
  const baseline = frames[0]!;
  const sampleIndexes = new Set<number>([
    1,
    Math.max(1, Math.floor(frames.length / 4)),
    Math.max(1, Math.floor(frames.length / 2)),
    Math.max(1, Math.floor((frames.length * 3) / 4)),
    frames.length - 1,
  ]);

  let maxDiff = 0;
  for (const index of sampleIndexes) {
    maxDiff = Math.max(maxDiff, frameDifference(baseline, frames[index]!));
  }
  return maxDiff >= threshold;
}

/** Two-frame still so APNG/WebP encoders always get a valid sequence. */
function stillCapture(
  frame: ArrayBuffer,
  width: number,
  height: number,
  delayMs: number
): CapturedFrames {
  return {
    width,
    height,
    frames: [frame.slice(0), frame.slice(0)],
    delaysMs: [delayMs, delayMs],
    hasMotion: false,
  };
}

/**
 * Mount an SVG, seek SMIL + CSS timelines, snapshot each frame, and capture RGBA.
 * Static poses become a 2-frame still. One-shot entrance animations are finished
 * before capture so frame 0 is not blank.
 * Browser-only (needs DOM + canvas).
 */
export async function captureSvgAnimationFrames(
  svgMarkup: string,
  opts: AnimatedRasterOptions = {}
): Promise<CapturedFrames> {
  if (typeof document === "undefined") {
    throw new Error("Animated raster export requires a browser");
  }

  const scale = opts.scale ?? "1x";
  const fps = opts.fps ?? DEFAULT_EXPORT_FPS;
  const clean = sanitizeSvg(svgMarkup);
  if (!clean.includes("<svg")) {
    throw new Error("Export SVG failed sanitization");
  }

  const durationSec =
    opts.durationSec ??
    detectAnimationLoopSec(clean) ??
    DEFAULT_EXPORT_DURATION_SEC;
  const { width, height } = rasterPixelSize(scale);
  const frameCount = Math.max(2, Math.round(durationSec * fps));
  const delayMs = Math.round(1000 / fps);
  const minOpaque = Math.max(500, Math.round(width * height * 0.002 * 255));

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${width}px`,
    `height:${height}px`,
    "overflow:hidden",
    "pointer-events:none",
    "opacity:0",
    "z-index:-1",
    "background:transparent",
  ].join(";");
  document.body.appendChild(host);

  const rasterCanvas = document.createElement("canvas");
  rasterCanvas.width = width;
  rasterCanvas.height = height;
  const rasterCtx = rasterCanvas.getContext("2d", { willReadFrequently: true });
  if (!rasterCtx) throw new Error("Canvas 2D unavailable for export");
  const rasterImage = new Image();

  const rasterizeBakedMarkup = (markup: string): Promise<ImageData> =>
    new Promise((resolve, reject) => {
      const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      rasterImage.onload = () => {
        URL.revokeObjectURL(url);
        try {
          rasterCtx.clearRect(0, 0, width, height);
          rasterCtx.drawImage(rasterImage, 0, 0, width, height);
          resolve(rasterCtx.getImageData(0, 0, width, height));
        } catch (error) {
          reject(error);
        }
      };
      rasterImage.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("SVG frame rasterize failed"));
      };
      rasterImage.src = url;
    });

  try {
    host.innerHTML = clean;
    const svg = host.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Export SVG root missing");
    }

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.removeAttribute("data-paused");
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.display = "block";
    svg.style.background = "transparent";

    try {
      svg.unpauseAnimations();
    } catch {
      /* noop */
    }
    await waitFrame();
    await waitFrame();
    try {
      svg.pauseAnimations();
    } catch {
      /* noop */
    }

    // Entrance pops (opacity 0 → 1) must not be rewound to t=0 each frame.
    finishOneShotCssAnimations(svg);
    await waitFrame();

    const sourceEls = listTreeElements(svg);
    const cssAnimated = findInfiniteCssAnimatedElements(svg);
    const hasSmil = svg.querySelector(SMIL_SELECTOR) != null;

    if (cssAnimated.length === 0 && !hasSmil) {
      opts.onProgress?.(0.5, "Capturing still frame");
      seekTimeline(svg, cssAnimated, 0);
      await waitFrame();
      const computed = snapshotComputedStyles(svg, sourceEls);
      const baked = bakeSvgCurrentFrame(svg, computed, sourceEls);
      const image = await rasterizeBakedMarkup(baked);
      opts.onProgress?.(1, "Done");
      return stillCapture(image.data.slice().buffer, width, height, delayMs);
    }

    const frames: ArrayBuffer[] = [];
    const delaysMs: number[] = [];
    const motionSamples: ImageData[] = [];

    for (let i = 0; i < frameCount; i++) {
      assertNotAborted(opts.signal);
      // Sample mid-slots so looping animations aren't stuck on a dead endpoint.
      const timeSec = ((i + 0.5) / frameCount) * durationSec;
      seekTimeline(svg, cssAnimated, timeSec);
      await waitFrame();

      const computed = snapshotComputedStyles(svg, sourceEls);
      const baked = bakeSvgCurrentFrame(svg, computed, sourceEls);
      const image = await rasterizeBakedMarkup(baked);
      const rgbaCopy = image.data.slice();
      frames.push(rgbaCopy.buffer);
      delaysMs.push(delayMs);

      if (
        i === 0 ||
        i === Math.floor(frameCount / 4) ||
        i === Math.floor(frameCount / 2) ||
        i === Math.floor((frameCount * 3) / 4) ||
        i === frameCount - 1
      ) {
        motionSamples.push(
          new ImageData(new Uint8ClampedArray(rgbaCopy), width, height)
        );
      }

      opts.onProgress?.(
        (i + 1) / (frameCount + 1),
        `Capturing frame ${i + 1}/${frameCount}`
      );
      await yieldToMain();
    }

    if (!hasVisibleMotion(motionSamples, width, height)) {
      const best = frames[indexOfMostOpaque(frames)]!;
      return stillCapture(best, width, height, delayMs);
    }

    putBestFrameFirst(frames, delaysMs);

    if (opaquePixelScore(frames[0]!) < minOpaque) {
      throw new Error(
        "Animated export produced a blank frame. Try SVG export for this pose."
      );
    }

    return { width, height, frames, delaysMs, hasMotion: true };
  } finally {
    host.remove();
  }
}
