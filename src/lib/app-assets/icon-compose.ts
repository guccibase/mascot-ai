import { loadSharp } from "./sharp-loader";

type Rgba = { r: number; g: number; b: number; alpha?: number };

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Parse #RGB / #RRGGBB (falls back to brand gold). */
export function parseHexColor(hex: string): Rgba {
  const raw = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return {
      r: parseInt(raw[0]! + raw[0]!, 16),
      g: parseInt(raw[1]! + raw[1]!, 16),
      b: parseInt(raw[2]! + raw[2]!, 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return { r: 212, g: 168, b: 67 };
}

function mix(a: Rgba, b: Rgba, t: number): Rgba {
  return {
    r: clampByte(a.r + (b.r - a.r) * t),
    g: clampByte(a.g + (b.g - a.g) * t),
    b: clampByte(a.b + (b.b - a.b) * t),
  };
}

function rgbaCss(c: Rgba, alpha = 1): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

/** App-icon backgrounds — character is composited on top unchanged. */
async function buildIconPreviewBackground(
  size: number,
  accent: Rgba,
  variantIndex: number
): Promise<Buffer> {
  const light = mix(accent, { r: 255, g: 255, b: 255 }, 0.55);
  const soft = mix(accent, { r: 255, g: 250, b: 240 }, 0.35);
  const deep = mix(accent, { r: 20, g: 24, b: 36 }, 0.55);
  const mid = mix(accent, soft, 0.25);

  const stops =
    variantIndex % 3 === 0
      ? [
          { offset: "0%", color: rgbaCss(light) },
          { offset: "55%", color: rgbaCss(soft) },
          { offset: "100%", color: rgbaCss(mid) },
        ]
      : variantIndex % 3 === 1
        ? [
            { offset: "0%", color: rgbaCss(mix(accent, { r: 255, g: 255, b: 255 }, 0.2)) },
            { offset: "100%", color: rgbaCss(mix(accent, { r: 40, g: 44, b: 60 }, 0.35)) },
          ]
        : [
            { offset: "0%", color: rgbaCss(deep) },
            { offset: "45%", color: rgbaCss(mix(deep, accent, 0.45)) },
            { offset: "100%", color: rgbaCss(mix(accent, { r: 10, g: 12, b: 20 }, 0.25)) },
          ];

  const gradientStops = stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`)
    .join("");

  const svg =
    variantIndex % 3 === 1
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              ${gradientStops}
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <defs>
            <radialGradient id="g" cx="50%" cy="42%" r="70%">
              ${gradientStops}
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>`;

  const sharp = await loadSharp();
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, effort: 10 }).toBuffer();
}

/**
 * Deterministic composite helper (exact mascot pixels + background).
 * Production samples use AI reference edits via `generateAppIconImage` instead;
 * this remains for tests / offline fidelity checks.
 */
export async function composeAppIconPreview(args: {
  mascotPng: Buffer;
  accent: string;
  variantIndex: number;
  size?: number;
}): Promise<Buffer> {
  const size = args.size ?? 1024;
  // ~72% safe zone so platform masks / home-screen rounding don't clip.
  const inner = Math.round(size * 0.72);
  const accent = parseHexColor(args.accent);

  const sharp = await loadSharp();
  const [background, character] = await Promise.all([
    buildIconPreviewBackground(size, accent, args.variantIndex),
    sharp(args.mascotPng)
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer(),
  ]);

  return sharp(background)
    .composite([{ input: character, gravity: "centre" }])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}
