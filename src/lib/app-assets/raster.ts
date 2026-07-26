import "server-only";

import sharp from "sharp";
import type { AppAssetFileSpec } from "./catalog";

/** Render mascot SVG to a square PNG buffer for image-model reference input. */
export async function svgToSquarePng(svg: string, size = 1024): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 288 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
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
    });

  if (spec.opaque) {
    pipeline = pipeline.flatten({ background: "#ffffff" });
  }

  if (spec.maskable) {
    // Scale artwork to ~80% safe zone on transparent canvas
    const inner = Math.round(Math.min(spec.width, spec.height) * 0.72);
    const resized = await sharp(master)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
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
      .png()
      .toBuffer();
  }

  return pipeline.png().toBuffer();
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
