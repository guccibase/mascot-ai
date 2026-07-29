import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { restoreSharedCss } from "../src/lib/example-poses/types.ts";
import { buildPosePack } from "../src/lib/example-poses/build-pack.ts";

const dir = path.dirname(fileURLToPath(import.meta.url));
const slugs = ["shade", "watt", "arc"];

for (const slug of slugs) {
  const pack = buildPosePack(slug);
  const idle = pack.poses.find((p) => p.key === "idle");
  const svgPath = path.join(dir, `${slug}-idle.svg`);
  const pngPath = path.join(dir, `${slug}-idle.png`);
  writeFileSync(svgPath, restoreSharedCss(idle.svg, pack.css));
  await sharp(svgPath, { density: 200 }).resize(420, 520).png().toFile(pngPath);
  console.log("ok", slug);
}
