import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HaySVG, POSE_SOURCE } from "@/components/mascots/hay-mascot";
import { buildPosePack } from "@/lib/example-poses/build-pack";

const RIGHT_HAND_HIGH = "M0,0 Q-24,-32 -18,-68";
const RIGHT_HAND_THUMB = "M0,0 Q-34,-20 -32,-54";
const RIGHT_SHOULDER = "translate(158,318)";

const BASE_PARTS = {
  ears: true,
  whiskers: true,
  arms: true,
  legs: true,
  belly: true,
  brows: true,
  blush: true,
  nose: true,
  vest: false,
  cape: false,
  coins: true,
  flames: false,
  halo: false,
  shadow: false,
  props: true,
} as const;

function renderWithParts(gesture: string, parts: Record<string, boolean>) {
  return renderToStaticMarkup(
    createElement(HaySVG, {
      p: {
        body: "#E0C49A",
        bodyLight: "#e6ceab",
        bodyDark: "#b49d7c",
        belly: "#FFF1DC",
        limb: "#c4ab87",
        feature: "#796852",
        accent: "#D4A84B",
        blush: "#e3a361",
        earInner: "#fff2de",
        earTip: "#817058",
        glowC: "#ddba6f",
        dim: "#8D8472",
      },
      glow: 0.45,
      waving: false,
      gesture,
      eyeRef: {},
      parts,
    })
  );
}

describe("Hay pose intent", () => {
  const pack = buildPosePack("hay");
  const byKey = Object.fromEntries(pack.poses.map((p) => [p.key, p.svg]));

  it("registers 37 poses in POSE_SOURCE", () => {
    expect(POSE_SOURCE.poses).toHaveLength(37);
    expect(POSE_SOURCE.slug).toBe("hay");
  });

  it("uses the character's right hand for wave / thumbs / high-five", () => {
    for (const key of ["wave", "thumbs_up", "high_five"] as const) {
      const svg = byKey[key]!;
      expect(svg).toContain(RIGHT_SHOULDER);
      const path = key === "thumbs_up" ? RIGHT_HAND_THUMB : RIGHT_HAND_HIGH;
      expect(svg).toContain(`d="${path}"`);
      const shoulderIdx = svg.indexOf(RIGHT_SHOULDER);
      const pathIdx = svg.indexOf(`d="${path}"`);
      expect(pathIdx).toBeGreaterThan(shoulderIdx);
      expect(pathIdx - shoulderIdx).toBeLessThan(600);
    }
  });

  it("flying keeps cape + flames and never rotates the head/neck", () => {
    const svg = byKey.flying!;
    expect(svg).toContain("hm-cape-flying");
    expect(svg).toContain("hm-flare-flying");
    expect(svg).toContain("hm-puff-flying");
    expect(svg).toContain("hm-g-flying");
    expect(svg).not.toMatch(
      /transform="rotate\(-?[1-9]\d+\)"[^>]*>[\s\S]{0,80}<ellipse[^>]+cy="208"/
    );
    expect(svg).toContain('transform="translate(0,-7)"');
  });

  it("gates idle/wave coins behind Pose props", () => {
    const withProps = renderWithParts("idle", { ...BASE_PARTS, props: true, cape: false });
    const withoutProps = renderWithParts("idle", { ...BASE_PARTS, props: false, cape: false });
    expect(withProps).toContain("hm-coin-idle-idle");
    expect(withoutProps).not.toContain("hm-coin-idle-idle");
  });

  it("shows a resting cape when Cape is on outside flying", () => {
    const idle = renderWithParts("idle", {
      ...BASE_PARTS,
      cape: true,
      coins: false,
      props: false,
    });
    expect(idle).toContain("hm-cape-idle");
    expect(idle).toContain("M-34,2 C-48,28");
  });
});
