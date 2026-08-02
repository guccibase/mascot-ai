import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import {
  applyPrimaryThemeToPreviewSvg,
  EMPTY_PREVIEW_SVG,
  previewRampColor,
  previewSvgForCard,
  previewSvgFromPack,
  safeCssColor,
} from "../../../convex/lib/previewSvg";

const themeA = {
  name: "Dawn",
  top: "#111111",
  mid: "#222222",
  base: "#333333",
  core: "#444444",
  stage: "#0a0a12",
  features: "#555555",
};

const themeB = {
  name: "Dusk",
  top: "#aaaaaa",
  mid: "#bbbbbb",
  base: "#cccccc",
  core: "#dddddd",
  stage: "#120a0a",
};

const waveSvg =
  '<svg class="ms-root" viewBox="0 0 10 10"><style>.ms-root{opacity:1}</style><g id="wave"/></svg>';
const idleSvg =
  '<svg class="ms-root" viewBox="0 0 10 10" style="color:red"><style>/*ms-theme-vars*/.ms-root{--ms-top:#000}/*/ms-theme-vars*/</style><g id="idle"/></svg>';

describe("previewSvgFromPack", () => {
  it("uses the first gesture, not idle when idle is later", () => {
    const pack = {
      accent: "#ffcc00",
      themes: { primary: themeA },
      gestures: [
        { key: "wave", svg: waveSvg },
        { key: "idle", svg: idleSvg },
      ],
      instrument: {
        defaultValue: 72,
        ramp: ["#111111", "#333333", "#555555", "#777777", "#999999"],
      },
    };
    const preview = previewSvgFromPack(pack);
    expect(preview).toContain('id="wave"');
    expect(preview).not.toContain('id="idle"');
  });

  it("applies the first theme’s CSS vars inline on the root svg", () => {
    const pack = {
      accent: "#00ffaa",
      themes: {
        primary: themeA,
        alt: themeB,
      },
      gestures: [{ key: "wave", svg: waveSvg }],
      instrument: {
        defaultValue: 40,
        ramp: ["#00ff00", "#00ff00", "#00ff00", "#00ff00", "#00ff00"],
      },
    };
    const preview = previewSvgFromPack(pack);
    expect(preview).toMatch(/<svg[^>]*style="/);
    expect(preview).toContain("--ms-top:#111111");
    expect(preview).toContain("--ms-stage:#0a0a12");
    expect(preview).toContain("--ms-accent:#00ffaa");
    expect(preview).toContain("--ms-signal:40");
    expect(preview).toContain("--ms-signal-color:#00ff00");
    expect(preview).toContain("--ms-glow:0.45");
    // Must not emit a global .ms-root theme rule (leaks across cards).
    expect(preview).not.toContain("/*ms-theme-vars*/");
  });

  it("uses instrument defaultValue and ramp for signal color (not accent)", () => {
    const ramp = ["#ff0000", "#ff0000", "#ff0000", "#ff0000", "#ff0000"];
    const pack = {
      accent: "#00ffaa",
      themes: { primary: themeA },
      gestures: [{ key: "wave", svg: waveSvg }],
      instrument: { defaultValue: 80, ramp },
    };
    const preview = previewSvgFromPack(pack);
    expect(preview).toContain("--ms-signal:80");
    expect(preview).toContain(
      `--ms-signal-color:${previewRampColor(80, ramp)}`
    );
    expect(preview).not.toContain("--ms-signal-color:#00ffaa");
  });

  it("strips baked ms-theme-vars and merges into existing style attr", () => {
    const next = applyPrimaryThemeToPreviewSvg(idleSvg, themeB, "#ffffff");
    expect(next).toContain("--ms-top:#aaaaaa");
    expect(next).toContain('style="color:red;');
    expect(next).not.toContain("--ms-top:#000");
    expect(next).not.toContain("/*ms-theme-vars*/");
  });

  it("throws when there are no gestures", () => {
    expect(() =>
      previewSvgFromPack({
        accent: "#fff",
        themes: { primary: themeA },
        gestures: [],
      })
    ).toThrow(/no previewable gesture/);
  });

  it("prefers Object.keys order over a later primary key", () => {
    const pack = {
      accent: "#abcdef",
      themes: {
        alt: themeB,
        primary: themeA,
      },
      gestures: [{ key: "wave", svg: waveSvg }],
    };
    const preview = previewSvgFromPack(pack);
    expect(preview).toContain("--ms-top:#aaaaaa");
  });
});

describe("safeCssColor / injection", () => {
  it("rejects non-hex theme colors that could break out of CSS", () => {
    expect(safeCssColor("red;}*{color:red", "#112233")).toBe("#112233");
    expect(
      safeCssColor("</style><img src=x onerror=alert(1)>", "#112233")
    ).toBe("#112233");
    expect(safeCssColor("#abc", "#000000")).toBe("#abc");
    expect(safeCssColor("#AABBCC", "#000000")).toBe("#AABBCC");
  });

  it("does not inject attacker-controlled theme strings into the style attr", () => {
    const evil = {
      ...themeA,
      top: "red;}*{background:url(javascript:alert(1))",
      mid: "</style><script>alert(1)</script>",
    };
    const out = applyPrimaryThemeToPreviewSvg(waveSvg, evil, "#ffcc00");
    expect(out).toContain("--ms-top:#C8CCD4");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("<script>");
  });
});

describe("previewSvgForCard", () => {
  it("returns empty placeholder instead of throwing on empty gestures", () => {
    expect(
      previewSvgForCard({
        accent: "#fff",
        themes: { primary: themeA },
        gestures: [],
      })
    ).toBe(EMPTY_PREVIEW_SVG);
  });

  it("falls back to raw first gesture svg when theming would fail", () => {
    const pack = {
      accent: "#ffcc00",
      themes: {},
      gestures: [{ key: "wave", svg: waveSvg }],
    };
    expect(previewSvgForCard(pack)).toBe(waveSvg);
  });

  it("strips unscoped .ms-root theme rules that would leak across cards", () => {
    const leaky =
      '<svg class="ms-root" viewBox="0 0 10 10"><style>.ms-root{--ms-top:#ff0000;opacity:1}.ms-eyes{transition:none}</style><g/></svg>';
    const out = applyPrimaryThemeToPreviewSvg(leaky, themeA, "#00ffaa");
    expect(out).toContain('style="--ms-top:#111111;');
    expect(out).not.toMatch(/\.ms-root\{[^}]*--ms-top:#ff0000/);
    expect(out).toContain(".ms-eyes{transition:none}");
  });

  it("survives sanitizeSvg with inline theme vars intact", () => {
    const pack = {
      accent: "#00ffaa",
      themes: { primary: themeA },
      gestures: [{ key: "wave", svg: waveSvg }],
      instrument: {
        defaultValue: 40,
        ramp: ["#00ff00", "#00ff00", "#00ff00", "#00ff00", "#00ff00"],
      },
    };
    const sanitized = sanitizeSvg(previewSvgFromPack(pack));
    expect(sanitized).toContain("--ms-top:#111111");
    expect(sanitized).toContain("--ms-signal:40");
    expect(sanitized).toContain("--ms-signal-color:#00ff00");
  });
});
