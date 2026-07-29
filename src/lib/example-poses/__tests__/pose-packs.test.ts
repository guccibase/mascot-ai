import { describe, expect, it } from "vitest";
import { GESTURE_PRESETS } from "@/lib/gesture-presets";
import {
  finalizeMarketplacePack,
  parseMarketplacePackFile,
} from "@/lib/marketplace/parse-pack-file";
import { PUBLIC_EXAMPLE_SLUGS } from "@/lib/mascots";
import { POSE_PACK_SLUGS, buildPosePack } from "../build-pack";
import { restoreSharedCss, stripSharedCss } from "../types";

/** Slice of a matching `<g>…</g>` including nested groups. */
function svgGroupBlockByAttribute(
  svg: string,
  attribute: string,
  value: string
): string | null {
  const open = svg.match(
    new RegExp(`<g\\b[^>]*${attribute}="${value}"[^>]*>`)
  );
  if (!open || open.index === undefined) return null;
  let i = open.index + open[0].length;
  let depth = 1;
  while (i < svg.length && depth > 0) {
    const nextOpen = svg.indexOf("<g", i);
    const nextClose = svg.indexOf("</g>", i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 2;
    } else {
      depth -= 1;
      i = nextClose + 4;
      if (depth === 0) return svg.slice(open.index, i);
    }
  }
  return null;
}

/** Slice of `<g data-ms-part="…">…</g>` including nested groups. */
function svgGroupBlock(svg: string, part: string): string | null {
  return svgGroupBlockByAttribute(svg, "data-ms-part", part);
}

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

  describe("public idle previews", () => {
    for (const slug of PUBLIC_EXAMPLE_SLUGS) {
      it(`${slug} idle preview matches the pack idle pose`, async () => {
        const pack = buildPosePack(slug);
        const idle =
          pack.poses.find((pose) => pose.key === "idle") ?? pack.poses[0];
        expect(idle).toBeTruthy();
        const extract = {
          slug,
          css: pack.css,
          svg: idle!.svg,
        };
        await expect(JSON.stringify(extract, null, 2) + "\n").toMatchFileSnapshot(
          `../idle-previews/${slug}.json`
        );
      });
    }
  });

  describe("sol orb family studios", () => {
    const orbSlugs = ["aura", "glint", "trove", "zephyr"] as const;
    const expectedKeys = GESTURE_PRESETS.map((pose) => pose.key);
    const coreKeys = new Set([
      "idle",
      "wave",
      "happy",
      "thinking",
      "listening",
      "talking",
      "pointing",
      "writing",
    ]);
    const persistentParts = [
      "body",
      "core",
      "eyes",
      "brows",
      "mouth",
      "blush",
      "gleam",
      "rays",
      "badge",
      "halo",
      "pool",
      "props",
      "effects",
    ];

    for (const slug of orbSlugs) {
      it(`${slug} has the exact preset set and toggle contract`, () => {
        const pack = buildPosePack(slug);

        expect(pack.poses.map((pose) => pose.key)).toEqual(expectedKeys);
        expect(pack.poses).toHaveLength(37);
        expect(pack.meta?.product).toMatch(/App$/);
        expect(Object.keys(pack.meta?.themes ?? {})).toHaveLength(5);
        expect(pack.css).toContain("var(--ms-glow");

        for (const pose of pack.poses) {
          for (const part of persistentParts) {
            expect(
              pose.svg.includes(`data-ms-part="${part}"`),
              `${slug}/${pose.key} must expose the “${part}” toggle`
            ).toBe(true);
          }

          // Sol-pure: no limb paddles.
          expect(pose.svg).not.toContain('data-ms-part="limbs"');
          // Halo uses animated ob-glow only (no static ms-glow-halo fight).
          expect(pose.svg).not.toContain("ms-glow-halo");

          // Eyes must be its own toggle — no nested mouth/brows parts inside.
          expect(pose.svg).toMatch(
            /<g data-ms-part="eyes"[^>]*>(?:(?!data-ms-part=)[\s\S])*?<\/g>/
          );
          // Cursor tracking wraps brows + eyes together; mouth stays outside.
          expect(pose.svg).toMatch(
            /class="[^"]*\bms-eyes\b[^"]*"[\s\S]*?data-ms-part="brows"[\s\S]*?data-ms-part="eyes"/
          );
          expect(pose.svg).toMatch(
            /data-ms-part="eyes"[\s\S]*?data-ms-part="mouth"/
          );

          expect(pose.track).toBe(coreKeys.has(pose.key));

          // Breath SMIL frames share a command skeleton (no morph glitches).
          const breath = pose.svg.match(
            /animate attributeName="d" values="([^"]+)"/
          );
          expect(breath, `${slug}/${pose.key} needs body breath`).not.toBeNull();
          const frames = breath![1]!.split(";");
          const skeleton = (d: string) =>
            (d.match(/[MLCQZHVSTA]/gi) ?? []).join("");
          const skel = skeleton(frames[0]!);
          expect(frames.every((frame) => skeleton(frame) === skel)).toBe(true);
        }

        const themes = pack.meta?.themes ?? {};
        for (const swatch of Object.values(themes)) {
          expect(swatch.blush, `${slug} themes need blush for live remaps`).toMatch(
            /^#[0-9A-Fa-f]{6}$/
          );
        }

        const sleepy = pack.poses.find((pose) => pose.key === "sleepy")!;
        expect(sleepy.svg).toContain("Q0,13 16,-3");
        expect(sleepy.svg).not.toContain("Q0,-13 16,3");

        const kiss = pack.poses.find((pose) => pose.key === "blowing_kiss")!;
        expect(kiss.svg).toMatch(/M0,12 C-14,1/);

        const empty = pack.poses.find((pose) => pose.key === "empty")!;
        expect(empty.svg).toMatch(
          /data-ms-part="brows"[^>]*fill="none"[^>]*stroke=/
        );

        const wave = pack.poses.find((pose) => pose.key === "wave")!;
        expect(wave.svg).toContain("ob-rise");
        // Wave is photonic sparks — not a limb rotate performance.
        expect(wave.svg).not.toMatch(
          /animateTransform[^>]*type="rotate"/
        );

        if (slug === "zephyr") {
          // Crown-level wind ticks, not belly-side curves that read as arms.
          expect(wave.svg).toContain("M96,198");
          expect(wave.svg).not.toContain('rx="14"');
        }

        const imported = finalizeMarketplacePack(
          parseMarketplacePackFile(JSON.stringify(pack))
        );
        expect(imported.parts.map((part) => part.key).sort()).toEqual(
          [...persistentParts].sort()
        );
      });
    }
  });

  describe("lantern family studios", () => {
    const lanternSlugs = ["shade", "watt", "arc"] as const;
    const eyeMarkerBySlug = {
      // soft circle / tall Fanous oval / rounded HUD — distinct idle eyes
      shade: 'r="15.5"',
      watt: 'rx="12" ry="18"',
      arc: 'width="20" height="24" rx="8"',
    } as const;

    const expectedKeys = GESTURE_PRESETS.map((pose) => pose.key);
    const persistentParts = [
      "hang",
      "bands",
      "arms",
      "glass",
      "base",
      "flame",
      "brows",
      "blush",
      "halo",
      "shadow",
      "props",
      "accessory",
      "eyes",
    ];
    /** Arc (desk) and Shade (mushroom) omit mitten arms — lamp body is the limb. */
    const persistentPartsFor = (slug: string) =>
      slug === "arc" || slug === "shade"
        ? persistentParts.filter((part) => part !== "arms")
        : persistentParts;

    for (const slug of lanternSlugs) {
      it(`${slug} has the exact preset set and toggle contract`, () => {
        const pack = buildPosePack(slug);
        const parts = persistentPartsFor(slug);

        expect(pack.poses.map((pose) => pose.key)).toEqual(expectedKeys);
        expect(pack.poses).toHaveLength(37);
        expect(pack.meta?.product).toMatch(/App$/);
        expect(Object.keys(pack.meta?.themes ?? {})).toHaveLength(5);

        for (const pose of pack.poses) {
          for (const part of parts) {
            expect(
              pose.svg.includes(`data-ms-part="${part}"`),
              `${slug}/${pose.key} must expose the “${part}” toggle`
            ).toBe(true);
          }
          if (slug === "arc" || slug === "shade") {
            expect(
              pose.svg.includes('data-ms-part="arms"'),
              `${slug} must not render mitten arms`
            ).toBe(false);
          }
          expect(
            pose.tip,
            `${slug}/${pose.key} tip must not keep robot copy`
          ).not.toMatch(/LED|pixel|wheels|thrusters roaring|code spark|compile/i);
        }

        const flying = pack.poses.find((pose) => pose.key === "flying")!;
        expect(flying.svg).toContain('data-ms-part="thrusters"');
        expect(flying.svg).toContain("translate(0,-7)");
        expect(flying.tip).toMatch(/lift glow/i);

        const idle = pack.poses.find((pose) => pose.key === "idle")!;
        expect(idle.svg).toContain(eyeMarkerBySlug[slug]);

        const imported = finalizeMarketplacePack(
          parseMarketplacePackFile(JSON.stringify(pack))
        );
        expect(imported.parts.map((part) => part.key).sort()).toEqual(
          [...parts, "thrusters"].sort()
        );
      });
    }

    it("keeps three mutually distinct chassis silhouettes and eye styles", () => {
      const idleSvg = Object.fromEntries(
        lanternSlugs.map((slug) => {
          const pack = buildPosePack(slug);
          const idle = pack.poses.find((pose) => pose.key === "idle")!;
          return [slug, idle.svg] as const;
        })
      );

      expect(idleSvg.shade).toContain("M90,206 C90,118 148,96 210,94");
      expect(idleSvg.watt).toContain("M210,96 C284,96 334,164 334,236");
      expect(idleSvg.arc).toContain("M148,126 C168,112 252,112 272,126");

      // Each silhouette marker belongs to only one mascot
      expect(idleSvg.shade).not.toContain("M210,96 C284,96 334,164 334,236");
      expect(idleSvg.arc).not.toContain("M210,96 C284,96 334,164 334,236");
      expect(idleSvg.watt).not.toContain("M90,206 C90,118 148,96 210,94");
      expect(idleSvg.arc).not.toContain("M90,206 C90,118 148,96 210,94");

      expect(idleSvg.shade).toContain(eyeMarkerBySlug.shade);
      expect(idleSvg.watt).toContain(eyeMarkerBySlug.watt);
      expect(idleSvg.arc).toContain(eyeMarkerBySlug.arc);
      expect(idleSvg.shade).not.toContain(eyeMarkerBySlug.arc);
      expect(idleSvg.arc).not.toContain(eyeMarkerBySlug.watt);
      expect(idleSvg.watt).not.toContain(eyeMarkerBySlug.shade);
    });

    it("keeps Fanous-grade thumbs, clap morph, and unique paint ids", () => {
      for (const slug of lanternSlugs) {
        const pack = buildPosePack(slug);
        const thumbsUp = pack.poses.find((pose) => pose.key === "thumbs_up")!;
        const thumbsDown = pack.poses.find((pose) => pose.key === "thumbs_down")!;
        const clapping = pack.poses.find((pose) => pose.key === "clapping")!;
        const flying = pack.poses.find((pose) => pose.key === "flying")!;
        const idle = pack.poses.find((pose) => pose.key === "idle")!;

        if (slug !== "arc" && slug !== "shade") {
          // Knuckle slab + short fat digit (not a floating prop)
          expect(thumbsUp.svg).toContain('width="41" height="28"');
          expect(thumbsUp.svg).toContain("Q21,-23 15,-34");
          expect(thumbsDown.svg).toContain("Q21,-23 15,-34");
          expect(thumbsUp.svg).not.toMatch(/data-ms-part="props"[\s\S]*thumbsUp/);

          // Clap open ↔ shut morph frames
          expect(clapping.svg).toContain("Q-28,8 18,2");
          expect(clapping.svg).toContain("Q-6,20 56,16");
        } else {
          // Desk / mushroom lamps: no mitten/thumb geometry
          expect(thumbsUp.svg).not.toContain("Q21,-23 15,-34");
          expect(clapping.svg).not.toContain("Q-28,8 18,2");
        }

        // Instance-scoped ids (multi-SVG pages must not collide)
        expect(flying.svg).toContain(`id="${slug}-flying-lift-bloom"`);
        expect(flying.svg).toContain(`id="ln-hit-${slug}-flying"`);
        expect(idle.svg).toContain(`id="ln-hit-${slug}-idle"`);
        expect(flying.svg).not.toContain('id="ln-lift-bloom"');
        expect(idle.svg).not.toContain('id="ln-hit"');
      }
    });
  });

  describe("robot family studios", () => {
    const robotSlugs = ["bolt", "relay", "orbit", "brew"] as const;
    const expectedKeys = GESTURE_PRESETS.map((pose) => pose.key);
    const persistentParts = [
      "antenna",
      "arms",
      "blush",
      "body",
      "chest",
      "ears",
      "eyes",
      "frame",
      "halo",
      "head",
      "legs",
      "props",
      "rivets",
      "scan",
      "shadow",
    ];

    for (const slug of robotSlugs) {
      it(`${slug} has the exact preset set and toggle contract`, () => {
        const pack = buildPosePack(slug);

        expect(pack.poses.map((pose) => pose.key)).toEqual(expectedKeys);
        expect(pack.poses).toHaveLength(37);
        expect(pack.meta?.product).toMatch(/App$/);
        expect(Object.keys(pack.meta?.themes ?? {})).toHaveLength(5);

        for (const pose of pack.poses) {
          for (const part of persistentParts) {
            expect(
              pose.svg.includes(`data-ms-part="${part}"`),
              `${slug}/${pose.key} must expose the “${part}” toggle`
            ).toBe(true);
          }
        }

        const flying = pack.poses.find((pose) => pose.key === "flying")!;
        expect(flying.svg).toContain('data-ms-part="thrusters"');
        expect(flying.svg).toContain("translate(0,-7)");

        const imported = finalizeMarketplacePack(
          parseMarketplacePackFile(JSON.stringify(pack))
        );
        expect(imported.parts.map((part) => part.key).sort()).toEqual(
          [...persistentParts, "thrusters"].sort()
        );
      });
    }
  });

  describe("species bird studios", () => {
    const chickSlugs = ["nox", "zest", "quill", "pip"] as const;
    const expectedKeysByCategory = {
      Core: [
        "idle",
        "wave",
        "happy",
        "thinking",
        "listening",
        "talking",
        "pointing",
        "writing",
      ],
      Moods: [
        "celebrate",
        "love",
        "sad",
        "crying",
        "grumpy",
        "sleepy",
        "proud",
        "oops",
        "surprised",
        "blowing_kiss",
        "facepalm",
        "dancing",
      ],
      Action: [
        "alarm",
        "encourage",
        "searching",
        "thumbs_up",
        "thumbs_down",
        "shrug",
        "working",
        "running",
        "flying",
        "high_five",
        "clapping",
      ],
      Feedback: [
        "confused",
        "success",
        "error",
        "empty",
        "loading",
        "waiting",
      ],
    } as const;
    const expectedKeys = Object.values(expectedKeysByCategory).flat();
    const expectedCategoryCounts = {
      Core: 8,
      Moods: 12,
      Action: 11,
      Feedback: 6,
    };
    const trackingKeys = new Set([
      "idle",
      "wave",
      "thinking",
      "listening",
      "talking",
      "pointing",
    ]);
    const tearAnchors = {
      nox: ["M166,276", "M254,276"],
      zest: ["M184,246", "M236,246"],
      quill: ["M182,246", "M238,246"],
      pip: ["M174,258", "M246,258"],
    } as const;
    const persistentParts = [
      "accessory",
      "app-badge",
      "beak",
      "body",
      "effects",
      "eyes",
      "feet",
      "halo",
      "prop",
      "shadow",
      "tuft",
      "wings",
    ];

    for (const slug of chickSlugs) {
      it(`${slug} has the exact preset set and toggle contract`, () => {
        const pack = buildPosePack(slug);

        expect(pack.poses.map((pose) => pose.key)).toEqual(expectedKeys);
        expect(pack.poses).toHaveLength(37);
        expect(
          Object.fromEntries(
            Object.keys(expectedCategoryCounts).map((category) => [
              category,
              pack.poses.filter((pose) => pose.cat === category).length,
            ])
          )
        ).toEqual(expectedCategoryCounts);
        for (const [category, keys] of Object.entries(
          expectedKeysByCategory
        )) {
          expect(
            pack.poses
              .filter((pose) => pose.cat === category)
              .map((pose) => pose.key)
          ).toEqual(keys);
        }
        expect(pack.meta?.product).toMatch(/App$/);
        expect(Object.keys(pack.meta?.themes ?? {})).toHaveLength(3);
        expect(pack.css).toMatch(
          /\.ck-dance,\.ck-run\{[^}]*transform-box:fill-box/
        );
        expect(pack.css).toMatch(
          /\.ck-fly,\.ck-spin,\.ck-pulse,\.ck-blink\{[^}]*transform-box:fill-box/
        );
        expect(pack.css).not.toContain("color-mix(");

        for (const pose of pack.poses) {
          for (const part of persistentParts) {
            expect(
              pose.svg.includes(`data-ms-part="${part}"`),
              `${slug}/${pose.key} must expose the “${part}” toggle`
            ).toBe(true);
          }

          const root = pose.svg.match(/^<svg\b[^>]*>/)?.[0];
          expect(root, `${slug}/${pose.key} needs an SVG root`).toBeTruthy();
          expect(root).toContain("ms-root");
          expect(root).toContain("ck-svg");
          expect(root).toContain('role="img"');
          expect(root).toMatch(/aria-label="[^"]+"/);
          expect(root?.match(/\bclass=/g)).toHaveLength(1);
          expect(pose.svg).toMatch(/<title>[^<]+<\/title>/);
          expect(pose.svg).toMatch(/<desc>[^<]+<\/desc>/);
          expect(pose.svg).not.toContain("color-mix(");
          expect(pose.svg).not.toContain("<feTurbulence");
          expect(pose.track).toBe(trackingKeys.has(pose.key));
          if (pose.track) {
            expect(pose.svg).toMatch(/\bclass="[^"]*\bms-eyes\b/);
          }
        }

        const imported = finalizeMarketplacePack(
          parseMarketplacePackFile(JSON.stringify(pack))
        );
        expect(imported.parts.map((part) => part.key).sort()).toEqual(
          [...persistentParts].sort()
        );

        const kiss = pack.poses.find((pose) => pose.key === "blowing_kiss")!;
        expect(kiss.svg).toContain("#FF6B8A");
        expect(kiss.svg).toMatch(/M0 12 C-14 1|M0,12 C-14,1/);

        const crying = pack.poses.find((pose) => pose.key === "crying")!;
        for (const anchor of tearAnchors[slug]) {
          expect(crying.svg).toContain(anchor);
        }

        const shrug = pack.poses.find((pose) => pose.key === "shrug")!;
        expect(shrug.svg.match(/data-ck-wing-mode="out"/g)).toHaveLength(2);
      });

      it(`${slug} keeps a centered, fixed upper bill while talking`, () => {
        const pack = buildPosePack(slug);
        const upperBills = pack.poses.map((pose) => {
          const match = pose.svg.match(
            /data-ck-beak="upper" d="([^"]+)"/
          );
          expect(match, `${slug}/${pose.key} needs an upper bill`).not.toBeNull();
          expect(match?.[1]).toContain("210,");
          return match?.[1];
        });

        expect(new Set(upperBills).size).toBe(1);

        const talking = pack.poses.find((pose) => pose.key === "talking")!;
        const beakStart = talking.svg.indexOf('data-ms-part="beak"');
        const lowerGroupEnd = talking.svg.indexOf("</g>", beakStart);
        const talkingBeak = talking.svg.slice(beakStart, lowerGroupEnd + 4);
        const cavity = talkingBeak.match(
          /data-ck-beak="cavity" d="([^"]+)"/
        );
        const lower = talkingBeak.match(
          /data-ck-beak="lower" d="([^"]+)"/
        );

        expect(talkingBeak).not.toContain("transform=");
        expect(talkingBeak).not.toContain("<animate");
        expect(talking.svg).not.toContain('class="ck-float"');
        expect(cavity, `${slug}/talking needs a mouth cavity`).not.toBeNull();
        expect(lower, `${slug}/talking needs a lower bill`).not.toBeNull();
        expect(lower?.[1]).not.toBe(cavity?.[1]);
      });

      it(`${slug} uses planted feet and pose-specific contact wings`, () => {
        const pack = buildPosePack(slug);
        const idle = pack.poses.find((pose) => pose.key === "idle")!;
        const idleMotion = svgGroupBlockByAttribute(
          idle.svg,
          "class",
          "ck-float"
        );

        if (slug === "zest") {
          // A hovering hummingbird carries its tucked feet with the body.
          expect(idleMotion).toContain('data-ms-part="feet"');
        } else {
          // Grounded toes stay outside torso breathing / lean transforms.
          expect(idleMotion).not.toContain('data-ms-part="feet"');
          expect(idle.svg.indexOf('data-ms-part="feet"')).toBeLessThan(
            idle.svg.indexOf('class="ck-float"')
          );
        }

        const writing = pack.poses.find((pose) => pose.key === "writing")!;
        expect(writing.svg).toContain('data-ck-wing-mode="support"');
        expect(writing.svg).toContain('data-ck-wing-mode="write"');

        const working = pack.poses.find((pose) => pose.key === "working")!;
        expect(working.svg.match(/data-ck-wing-mode="type"/g)).toHaveLength(2);

        const searching = pack.poses.find((pose) => pose.key === "searching")!;
        expect(searching.svg).toContain('data-ck-wing-mode="grip"');

        const clapping = pack.poses.find((pose) => pose.key === "clapping")!;
        expect(clapping.svg.match(/data-ck-wing-mode="clap"/g)).toHaveLength(2);

        const facepalm = pack.poses.find((pose) => pose.key === "facepalm")!;
        expect(facepalm.svg).not.toContain("M131 178");

        if (slug === "pip") {
          const restingBill = svgGroupBlock(idle.svg, "beak");
          expect(restingBill).not.toContain('data-ck-beak="cavity"');
          expect(restingBill).not.toContain('data-ck-beak="lower"');
        }
      });

      it(`${slug} uses ordered wing layers with lean shoulder-hinged motion`, () => {
        const pack = buildPosePack(slug);
        const facePoseKeys = new Set([
          "thinking",
          "blowing_kiss",
          "facepalm",
        ]);
        const foregroundPoseKeys = new Set([
          "wave",
          "writing",
          "celebrate",
          "proud",
          "alarm",
          "encourage",
          "thumbs_up",
          "working",
          "flying",
          "high_five",
          "clapping",
        ]);

        for (const pose of pack.poses) {
          const rear = svgGroupBlockByAttribute(
            pose.svg,
            "data-ck-wing-layer",
            "rear"
          );
          const front = svgGroupBlockByAttribute(
            pose.svg,
            "data-ck-wing-layer",
            "front"
          );
          const face = svgGroupBlockByAttribute(
            pose.svg,
            "data-ck-wing-layer",
            "face"
          );
          expect(rear, `${slug}/${pose.key} needs rear wings`).toBeTruthy();
          expect(front, `${slug}/${pose.key} needs front wings`).toBeTruthy();
          expect(face, `${slug}/${pose.key} needs face wings`).toBeTruthy();

          const rearStart = pose.svg.indexOf('data-ck-wing-layer="rear"');
          const bodyStart = pose.svg.indexOf('data-ms-part="body"');
          const frontStart = pose.svg.indexOf('data-ck-wing-layer="front"');
          const badgeStart = pose.svg.indexOf('data-ms-part="app-badge"');
          const beakStart = pose.svg.indexOf('data-ms-part="beak"');
          const faceStart = pose.svg.indexOf('data-ck-wing-layer="face"');
          expect(rearStart).toBeLessThan(bodyStart);
          expect(bodyStart).toBeLessThan(frontStart);
          expect(beakStart).toBeLessThan(faceStart);
          // Badge lives on/after the body, above rear wings — never under rest feathers.
          expect(badgeStart).toBeGreaterThan(rearStart);
          expect(badgeStart).toBeLessThan(frontStart);

          const wings = `${rear ?? ""}${front ?? ""}${face ?? ""}`;
          expect(wings.match(/<path\b/g)?.length).toBeGreaterThanOrEqual(4);
          expect(wings).toContain("translate(");
          expect(wings).toContain("data-ck-wing-primary");
          expect(wings).not.toContain('attributeName="d"');

          if (foregroundPoseKeys.has(pose.key)) {
            expect(front).toContain("<path");
          }
          if (facePoseKeys.has(pose.key)) {
            expect(face).toContain("<path");
          }
        }

        const idle = pack.poses.find((pose) => pose.key === "idle")!;
        const idleRear = svgGroupBlockByAttribute(
          idle.svg,
          "data-ck-wing-layer",
          "rear"
        );
        const idleFront = svgGroupBlockByAttribute(
          idle.svg,
          "data-ck-wing-layer",
          "front"
        );
        expect(idleRear).toContain('data-ck-wing-mode="rest"');
        expect(idleRear).not.toContain("<animate");
        // Idle wings stay behind the body — front layer has no wing geometry.
        expect(idleFront).not.toContain("data-ck-wing-mode");

        const flying = pack.poses.find((pose) => pose.key === "flying")!;
        const flyingFront = svgGroupBlockByAttribute(
          flying.svg,
          "data-ck-wing-layer",
          "front"
        );
        const flyingRear = svgGroupBlockByAttribute(
          flying.svg,
          "data-ck-wing-layer",
          "rear"
        );
        const flyingWings = flyingFront ?? "";
        expect(flyingWings).toContain('data-ck-wing-mode="flap"');
        expect(flyingWings.match(/<animateTransform/g)).toHaveLength(2);
        expect(flyingWings).not.toMatch(/<animate\b/);
        expect(flyingWings).toMatch(
          /dur="(?:0\.12|0\.26|0\.32|0\.46)s"/
        );
        expect(flyingRear).not.toContain("data-ck-wing-mode");
        // Inner covert is a distinct smaller feather, not a clone of the primary.
        const primaryD = flyingWings.match(
          /data-ck-wing-primary="1"[^>]*\sd="([^"]+)"/
        )?.[1];
        const covertD = flyingWings.match(
          /data-ck-wing-covert="1"[^>]*\sd="([^"]+)"/
        )?.[1];
        expect(primaryD).toBeTruthy();
        expect(covertD).toBeTruthy();
        expect(covertD).not.toBe(primaryD);

        const wave = pack.poses.find((pose) => pose.key === "wave")!;
        const waveFront = svgGroupBlockByAttribute(
          wave.svg,
          "data-ck-wing-layer",
          "front"
        );
        const waveRear = svgGroupBlockByAttribute(
          wave.svg,
          "data-ck-wing-layer",
          "rear"
        );
        expect(waveFront).toContain('data-ck-wing-mode="up"');
        expect(waveFront).toContain("<animateTransform");
        expect(waveRear).toContain('data-ck-wing-mode="rest"');
        // Folded wing must stay still while the raised wing flaps.
        expect(waveRear).not.toContain("<animateTransform");
      });

      it(`${slug} keeps held props attached to the floating character`, () => {
        const pack = buildPosePack(slug);
        for (const key of [
          "writing",
          "searching",
          "thumbs_up",
          "thumbs_down",
          "working",
          "empty",
        ]) {
          const pose = pack.poses.find((candidate) => candidate.key === key)!;
          const character = svgGroupBlockByAttribute(
            pose.svg,
            "class",
            "ck-float"
          );
          expect(character, `${slug}/${key} needs its motion group`).toContain(
            'data-ms-part="prop"'
          );
          expect(svgGroupBlock(pose.svg, "accessory")).not.toContain("<path");
          expect(svgGroupBlock(pose.svg, "accessory")).not.toContain("<ellipse");
        }
      });

      it(`${slug} keeps shadow and app-badge independently toggleable`, () => {
        const pack = buildPosePack(slug);
        const idle = pack.poses.find((pose) => pose.key === "idle")!;

        const shadow = svgGroupBlock(idle.svg, "shadow");
        expect(shadow, `${slug} needs a shadow group`).toBeTruthy();
        // Contact oval must live inside the shadow part — not an orphan sibling.
        expect(shadow).toContain('fill="#000"');

        const body = svgGroupBlock(idle.svg, "body");
        expect(body, `${slug} needs a body group`).toBeTruthy();
        // Badge must not be nested under body (hiding body would hide the badge).
        expect(body).not.toContain('data-ms-part="app-badge"');
        expect(idle.svg).toContain('data-ms-part="app-badge"');
      });

      it(`${slug} wires face/beak/iris fills through theme CSS variables`, () => {
        const pack = buildPosePack(slug);
        const idle = pack.poses.find((pose) => pose.key === "idle")!;
        expect(idle.svg).toMatch(/var\(--ms-(?:top|mid|core|accent|features)/);
        // Hardcoded face/blush/iris / beak-band hexes must not survive into the pack.
        expect(idle.svg).not.toContain("#F7F0E4");
        expect(idle.svg).not.toContain("#E2A090");
        expect(idle.svg).not.toContain("#E8B45A");
        expect(idle.svg).not.toContain("#FFF0A8");
        expect(idle.svg).not.toContain("#E83828");
        expect(idle.svg).not.toContain("#5A6A78");
      });
    }
  });

  describe("octopus family studios", () => {
    const octopusSlugs = ["numi", "lexa", "coda", "kelp", "nori"] as const;
    const mantleMarkerBySlug = {
      numi: "M210,98 C268,98 306,146",
      lexa: "M210,78 C248,78 278,120",
      coda: "M210,128 C282,118 330,158",
      kelp: "M210,126 C258,126 298,164",
      nori: "M210,138 C274,138 322,186",
    } as const;

    for (const slug of octopusSlugs) {
      it(`${slug} keeps a distinct idle mantle and a real blowing_kiss`, () => {
        const pack = buildPosePack(slug);
        expect(pack.poses).toHaveLength(38);

        const idle = pack.poses.find((pose) => pose.key === "idle")!;
        expect(idle.svg).toContain(mantleMarkerBySlug[slug]);

        for (const other of octopusSlugs) {
          if (other === slug) continue;
          expect(idle.svg).not.toContain(mantleMarkerBySlug[other]);
        }

        const kiss = pack.poses.find((pose) => pose.key === "blowing_kiss")!;
        expect(kiss.svg).toContain("#FF6B8A");
        expect(kiss.svg).toContain("nm-rise");
        expect(kiss.svg).toContain("Q252,252 278,256");
      });
    }
  });

  /**
   * CSS `transform` animations override SVG `transform` attributes on the same
   * node, teleporting tears/hearts/stars to the viewBox origin. Position must
   * live on a parent `<g>`; the anim class stays on the child.
   */
  it("never puts a transform animation class on the same node as SVG translate", () => {
    const animClass = /(?:tear|rise|pulse|fall|note|drift|drop|drip|float|sweatD)\b/;
    const offenders: string[] = [];

    for (const slug of POSE_PACK_SLUGS) {
      const pack = buildPosePack(slug);
      const transformAnimClasses = new Set<string>();
      for (const m of pack.css.matchAll(
        /\.([a-zA-Z0-9_-]+)\{[^}]*animation:([a-zA-Z0-9_-]+)/g
      )) {
        const cls = m[1]!;
        const anim = m[2]!;
        const kf = pack.css.match(
          new RegExp(`@keyframes\\s+${anim}\\{([\\s\\S]*?)\\}(?=\\s*@|\\s*\\.|$)`)
        );
        if (kf?.[1]?.includes("transform:") && animClass.test(cls)) {
          transformAnimClasses.add(cls);
        }
      }

      for (const pose of pack.poses) {
        for (const tag of pose.svg.matchAll(/<([a-zA-Z0-9]+)([^>]*?)>/g)) {
          const attrs = tag[2]!;
          if (!attrs.includes('transform="translate')) continue;
          const classMatch = attrs.match(/class="([^"]*)"/);
          if (!classMatch) continue;
          for (const cls of classMatch[1]!.split(/\s+/)) {
            if (transformAnimClasses.has(cls)) {
              offenders.push(`${slug}/${pose.key}: class="${cls}" + transform`);
            }
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("tear keyframes fall downward, not upward into the eyes", () => {
    const tearAnim =
      /@keyframes\s+[a-zA-Z0-9_-]*(?:tear|drip|drop|sweatK)[a-zA-Z0-9_-]*\{([\s\S]*?)\}(?=\s*@|\s*\.|$)/g;
    const tearClassOnPose =
      /class="[^"]*(?:-tear|ck-tear|ob-tear|gw-tear|bd-tear|lm-tear|nm-tear|lv-drop|sd-drip|lm-sweatD)[^"]*"/;

    for (const slug of POSE_PACK_SLUGS) {
      const pack = buildPosePack(slug);
      const tearPoses = pack.poses.filter(
        (pose) =>
          /crying|sad|sorry|pale|focused|oops/.test(pose.key) &&
          tearClassOnPose.test(pose.svg)
      );
      const hasTearKeyframes = tearAnim.test(pack.css);
      tearAnim.lastIndex = 0;
      if (tearPoses.length === 0 && !hasTearKeyframes) continue;

      for (const m of pack.css.matchAll(tearAnim)) {
        const body = m[1]!;
        // Must end with a positive translateY (down the face), never negative.
        expect(
          body,
          `${slug} tear keyframes must drop downward`
        ).toMatch(/100%\{[^}]*translateY\(\d+px\)/);
        expect(body).not.toMatch(/100%\{[^}]*translateY\(-\d+px\)/);
      }

      // Tear droplets must not ride upward drift/rise animations.
      for (const pose of tearPoses) {
        expect(
          pose.svg,
          `${slug}/${pose.key} tears must not use upward drift/rise`
        ).not.toMatch(/class="[^"]*(?:-drift|-rise)[^"]*"/);
      }
    }
  });
});
