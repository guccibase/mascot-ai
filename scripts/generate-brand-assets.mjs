/**
 * Rasterizes the MascotAI brand mark into favicon / app-icon sizes.
 * Source: generated master PNG + SVG mark.
 */
import { mkdir, copyFile, readFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const masterSrc = join(
  process.env.HOME,
  ".cursor/projects/Users-tahirunasuru-dev-work-mascot-ai/assets/mascotai-icon-master.png"
);
const brandDir = join(root, "public/brand");
const appDir = join(root, "src/app");

await mkdir(brandDir, { recursive: true });

const masterDest = join(brandDir, "icon-1024.png");
await copyFile(masterSrc, masterDest);

const svgOnDark = await readFile(
  join(brandDir, "logo-mark-on-dark.svg"),
  "utf8"
);
const svgTransparent = await readFile(join(brandDir, "logo-mark.svg"), "utf8");

async function rasterizeSvg(svg, size, outPath) {
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

// Crisp vector-based app icons (preferred over AI raster for small sizes)
await rasterizeSvg(svgOnDark, 512, join(brandDir, "icon-512.png"));
await rasterizeSvg(svgOnDark, 192, join(brandDir, "icon-192.png"));
await rasterizeSvg(svgTransparent, 512, join(brandDir, "logo-mark-512.png"));

// Next.js metadata file conventions
await sharp(join(brandDir, "icon-512.png"))
  .resize(32, 32)
  .png()
  .toFile(join(appDir, "icon.png"));

await sharp(join(brandDir, "icon-512.png"))
  .resize(180, 180)
  .png()
  .toFile(join(appDir, "apple-icon.png"));

// Also ship SVG icon for modern browsers
await copyFile(join(brandDir, "logo-mark-on-dark.svg"), join(appDir, "icon.svg"));

// Multi-size favicon.ico via ImageMagick
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  const path = join(brandDir, `favicon-${size}.png`);
  await sharp(join(brandDir, "icon-512.png")).resize(size, size).png().toFile(path);
  icoPngs.push(path);
}

execFileSync("magick", [...icoPngs, join(appDir, "favicon.ico")], {
  stdio: "inherit",
});

for (const path of icoPngs) {
  await unlink(path).catch(() => {});
}

// PWA / open-graph sized assets in public
await sharp(join(brandDir, "icon-512.png"))
  .resize(512, 512)
  .png()
  .toFile(join(brandDir, "pwa-512.png"));

await sharp(join(brandDir, "icon-512.png"))
  .resize(192, 192)
  .png()
  .toFile(join(brandDir, "pwa-192.png"));

// Open Graph image: brand mark on navy with wordmark
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="30%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#F5B34F" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#0B1020" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0B1020"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(210 315)">
    <circle cx="-76" cy="-16" r="22" fill="#F5B34F"/>
    <circle cx="76" cy="-16" r="22" fill="#F5B34F"/>
    <circle cx="0" cy="0" r="84" fill="#F5B34F"/>
    <line x1="0" y1="-84" x2="0" y2="-116" stroke="#F5B34F" stroke-width="10" stroke-linecap="round"/>
    <circle cx="0" cy="-124" r="13" fill="#F5B34F"/>
    <ellipse cx="-28" cy="-8" rx="22" ry="28" fill="#F7F3EA"/>
    <ellipse cx="28" cy="-8" rx="22" ry="28" fill="#F7F3EA"/>
    <circle cx="-28" cy="-4" r="11" fill="#12141C"/>
    <circle cx="28" cy="-4" r="11" fill="#12141C"/>
    <path d="M-24 28 Q0 48 24 28" stroke="#12141C" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M56 -56 L60.4 -45 L72 -41 L60.4 -37 L56 -26 L51.6 -37 L40 -41 L51.6 -45 Z" fill="#F7F3EA"/>
  </g>
  <text x="420" y="300" font-family="Outfit, Manrope, Arial, sans-serif" font-size="92" font-weight="700" fill="#E8EEF8">Mascot<tspan fill="#F5B34F">AI</tspan></text>
  <text x="420" y="360" font-family="Manrope, Arial, sans-serif" font-size="28" font-weight="500" fill="#9AA8C0" letter-spacing="4">ANIMATED MASCOT STUDIOS</text>
</svg>
`;

await sharp(Buffer.from(ogSvg))
  .png()
  .toFile(join(appDir, "opengraph-image.png"));

console.log("Brand assets written to public/brand and src/app");
