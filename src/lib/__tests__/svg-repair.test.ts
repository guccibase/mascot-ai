import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { repairSvgStructure } from "../svg/repair";
import { sanitizeSvg } from "../sanitize-svg";

describe("repairSvgStructure", () => {
  it("closes an unclosed group before svg ends", () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><circle cx="50" cy="50" r="40" fill="#f00"/></svg>`;
    const fixed = repairSvgStructure(broken);
    expect(fixed).toMatch(/<\/g>\s*<\/svg>$/);
  });

  it("auto-closes tags left open at EOF", () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg"><g><circle cx="1" cy="1" r="1"/>`;
    const fixed = repairSvgStructure(broken);
    expect(fixed).toMatch(/<\/g>\s*<\/svg>$/);
  });

  it("drops stray closing tags with no opener", () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="1" cy="1" r="1"/></g></svg>`;
    const fixed = repairSvgStructure(broken);
    expect(fixed).not.toContain("</g></svg>");
    expect(fixed).toMatch(/<\/svg>$/);
  });

  it("is idempotent on well-formed SVG", () => {
    const good = `<svg xmlns="http://www.w3.org/2000/svg"><g><circle cx="1" cy="1" r="1"/></g></svg>`;
    expect(repairSvgStructure(good)).toBe(good);
  });
});

describe("sanitizeSvg structural repair", () => {
  it("repairs malformed mascot SVG from production-like output", () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 520"><g id="ms-body"><path d="M10 10"/><g class="ms-eyes"><circle cx="20" cy="20" r="4"/></svg>`;
    const out = sanitizeSvg(broken);
    expect(out).toContain("</g>");
    expect(out).toMatch(/<\/svg>$/);
    expect(out.split("<g").length).toBe(out.split("</g>").length);
  });
});

describe("svg rasterization after repair", () => {
  it("lets Sharp parse malformed SVG once tags are balanced", async () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><g><circle cx="100" cy="100" r="80" fill="#D4A843"/></svg>`;
    const fixed = sanitizeSvg(broken);
    const png = await sharp(Buffer.from(fixed), { density: 144 }).png().toBuffer();
    const meta = await sharp(png).metadata();
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
  });
});
