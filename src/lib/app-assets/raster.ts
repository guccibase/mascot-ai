import "server-only";

import sharp from "sharp";
import type { AppAssetFileSpec } from "./catalog";

export { composeAppIconPreview, parseHexColor } from "./icon-compose";

/**
 * Render mascot SVG to a square transparent PNG, trimming empty padding so the
 * character fills the icon canvas.
 */
export async function svgToSquarePng(svg: string, size = 1024): Promise<Buffer> {
  const rendered = await sharp(Buffer.from(svg), { density: 288 }).png().toBuffer();
  const trimmed = await sharp(rendered)
    .trim({ threshold: 2 })
    .png()
    .toBuffer();

  return sharp(trimmed)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}

/** Resize master icon to a target spec (square, cover crop from center). */
export async function resizeIcon(
  master: Buffer,
  spec: AppAssetFileSpec
): Promise<Buffer> {
  let pipeline = sharp(master)
    .resize(spec.width, spec.height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    });

  if (spec.opaque) {
    pipeline = pipeline.flatten({ background: "#ffffff" });
  }

  if (spec.maskable) {
    // Scale artwork to ~80% safe zone on transparent canvas
    const inner = Math.round(Math.min(spec.width, spec.height) * 0.72);
    const resized = await sharp(master)
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    return sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: "centre" }])
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
  }

  return pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer();
}

export async function buildAdaptiveBackground(
  master: Buffer,
  accentHex: string,
  size: number
): Promise<Buffer> {
  const color = accentHex.startsWith("#") ? accentHex : "#6366f1";
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}
