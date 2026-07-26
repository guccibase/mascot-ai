import { describe, expect, it } from "vitest";
import { POSE_PACK_SLUGS, buildPosePack } from "../build-pack";
import { restoreSharedCss, stripSharedCss } from "../types";

/**
 * These snapshots are the shipped artifacts, not just a test fixture.
 * `npm run poses:build` writes them; a plain `npm test` re-renders the mascot
 * components and fails if the committed packs no longer match, so editing a
 * mascot without rebuilding cannot silently ship a stale remix source.
 */
describe("example pose packs", () => {
  for (const slug of POSE_PACK_SLUGS) {
    it(`${slug} matches its committed pack`, async () => {
      const pack = buildPosePack(slug);
      await expect(JSON.stringify(pack, null, 2)).toMatchFileSnapshot(
        `../${slug}.json`
      );
    });

    it(`${slug} poses carry animations and the studio viewBox`, () => {
      const pack = buildPosePack(slug);
      expect(pack.poses.length).toBeGreaterThan(0);
      expect(pack.css).toContain("@keyframes");

      for (const pose of pack.poses) {
        expect(pose.svg).toContain('viewBox="0 0 420 520"');
        // The stylesheet is hoisted, so the element is present but empty.
        expect(pose.svg).toMatch(/<style[^>]*><\/style>/);
        expect(pose.svg).not.toContain("data-paused");
      }
    });
  }

  it("round-trips a hoisted stylesheet back into place", () => {
    const pack = buildPosePack("lyra");
    const pose = pack.poses[0]!;
    const restored = restoreSharedCss(pose.svg, pack.css);

    expect(restored).toContain("@keyframes lv-float");
    expect(stripSharedCss(restored).svg).toBe(pose.svg);
  });
});
