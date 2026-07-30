import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LEGACY_EXAMPLES = [
  { slug: "sol", parts: "SOL_PARTS", pill: "ss-pill" },
  { slug: "lyra", parts: "LYRA_PARTS", pill: "ly-pill" },
  { slug: "bud", parts: "BUD_PARTS", pill: "bs-pill" },
  { slug: "fanous", parts: "FANOUS_PARTS", pill: "fs-pill" },
] as const;

describe("legacy example studios elements panel", () => {
  for (const { slug, parts, pill } of LEGACY_EXAMPLES) {
    it(`${slug} studio wires part toggles and data-ms-part tags`, () => {
      const source = readFileSync(
        join(process.cwd(), `src/components/mascots/${slug}-mascot.jsx`),
        "utf8"
      );
      expect(source).toMatch(new RegExp(parts));
      expect(source).toMatch(/useStudioPartToggles/);
      expect(source).toMatch(/MascotPartsPanel/);
      expect(source).toMatch(/data-ms-part=/);
      expect(source).toMatch(new RegExp(`pillClassName="${pill}"`));
    });
  }
});
