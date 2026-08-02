/**
 * Card / listing preview: first studio gesture + first theme + instrument defaults.
 * Matches GeneratedStudio on open (gestures[0], Object.keys(themes)[0],
 * instrument.defaultValue, glow 0.45).
 *
 * Theme vars are applied as root <svg style="…"> (not a document <style>
 * `.ms-root` rule). Inline SVG stylesheets leak across cards on the same page:
 * https://jordemort.dev/blog/fixing-leaky-svg-style-tags/
 *
 * Color / ramp math mirrors `src/lib/studio-utils.ts` (Convex cannot import
 * from `src/`; keep the two in sync when changing signal/ramp behavior).
 */

export type PreviewTheme = {
  name: string;
  top: string;
  mid: string;
  base: string;
  core: string;
  stage: string;
  features?: string;
};

export type PreviewPackLike = {
  accent: string;
  themes: Record<string, PreviewTheme>;
  gestures: Array<{ key: string; svg: string }>;
  instrument?: {
    defaultValue?: number;
    ramp?: string[];
  };
};

const HEX_COLOR =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const FALLBACK_TOP = "#C8CCD4";
const FALLBACK_MID = "#8B93A7";
const FALLBACK_BASE = "#5C657A";
const FALLBACK_CORE = "#1A1F2E";
const FALLBACK_STAGE = "#0c1322";
const FALLBACK_FEATURES = "#2A1A0C";
const FALLBACK_ACCENT = "#F5B34F";
const DEFAULT_RAMP = [
  "#7B6CFF",
  "#A46CFF",
  "#E07A5F",
  "#F0A35A",
  "#F5B34F",
] as const;

/** Empty placeholder so one bad pack cannot break listMine / marketplace cards. */
export const EMPTY_PREVIEW_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 520" class="ms-root"></svg>';

/** Only allow hex colors into injected CSS (blocks style breakout). */
export function safeCssColor(value: string, fallback: string): string {
  const v = value.trim();
  return HEX_COLOR.test(v) ? v : fallback;
}

function clampSignal(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Same rules as studio-utils normalizeSignal. */
export function normalizePreviewSignal(
  value: unknown,
  fallback = 50
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampSignal(value);
  }
  return fallback;
}

function hx(h: string): [number, number, number] {
  const s = h.replace("#", "");
  const v =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s.slice(0, 6);
  return [
    parseInt(v.slice(0, 2), 16) || 0,
    parseInt(v.slice(2, 4), 16) || 0,
    parseInt(v.slice(4, 6), 16) || 0,
  ];
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hx(a);
  const [r2, g2, b2] = hx(b);
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r1 + (r2 - r1) * t)}${to(g1 + (g2 - g1) * t)}${to(
    b1 + (b2 - b1) * t
  )}`;
}

/** Same math as studio-utils rampColor (hex stops only). */
export function previewRampColor(
  score: number,
  ramp: string[] = [...DEFAULT_RAMP]
): string {
  const stops = ramp.map((c) => safeCssColor(c, FALLBACK_ACCENT));
  if (stops.length === 0) return FALLBACK_ACCENT;
  if (stops.length === 1) return stops[0]!;
  const s = clampSignal(score) / 100;
  const max = stops.length - 1;
  const x = s * max;
  const i = Math.min(Math.floor(x), max - 1);
  const t = x - i;
  return mixHex(stops[i]!, stops[i + 1] ?? stops[i]!, t);
}

/** Same theme key selection as GeneratedStudio's initial themeKey. */
function studioDefaultTheme(pack: PreviewPackLike): PreviewTheme | null {
  const firstKey = Object.keys(pack.themes)[0];
  if (!firstKey) return null;
  return pack.themes[firstKey] ?? null;
}

/** Remove baked theme var rules that would leak via global SVG <style> tags. */
function stripLeakingThemeRules(svg: string): string {
  return svg
    .replace(/\/\*ms-theme-vars\*\/[\s\S]*?\/\*\/ms-theme-vars\*\//g, "")
    .replace(/\.ms-root\s*\{[^}]*--ms-[^}]*\}/g, "");
}

function mergeRootSvgStyle(svg: string, vars: string): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    if (/\sstyle\s*=/i.test(attrs)) {
      const nextAttrs = attrs.replace(
        /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i,
        (_m: string, _quoted: string, double: string, single: string) => {
          const prev = double ?? single ?? "";
          const cleaned = prev
            .replace(/--ms-[a-z-]+:[^;]*;?/gi, "")
            .replace(/;\s*;/g, ";")
            .replace(/^\s*;\s*|\s*;\s*$/g, "")
            .trim();
          const merged = cleaned ? `${cleaned};${vars}` : vars;
          return ` style="${merged}"`;
        }
      );
      return `<svg${nextAttrs}>`;
    }
    return `<svg${attrs} style="${vars}">`;
  });
}

/**
 * Apply theme + instrument CSS vars on the root <svg> inline style.
 * Per-element vars are required so library/marketplace grids do not cross-paint.
 */
export function applyPrimaryThemeToPreviewSvg(
  svg: string,
  theme: PreviewTheme,
  accent: string,
  opts?: { signal?: number; ramp?: string[]; glow?: number }
): string {
  const top = safeCssColor(theme.top, FALLBACK_TOP);
  const mid = safeCssColor(theme.mid, FALLBACK_MID);
  const base = safeCssColor(theme.base, FALLBACK_BASE);
  const core = safeCssColor(theme.core, FALLBACK_CORE);
  const stage = safeCssColor(theme.stage, FALLBACK_STAGE);
  const features = safeCssColor(
    theme.features ?? FALLBACK_FEATURES,
    FALLBACK_FEATURES
  );
  const accentSafe = safeCssColor(accent, FALLBACK_ACCENT);
  const signal = normalizePreviewSignal(opts?.signal, 50);
  const glow =
    typeof opts?.glow === "number" && Number.isFinite(opts.glow)
      ? Math.max(0, Math.min(1, opts.glow))
      : 0.45;
  const signalColor = previewRampColor(signal, opts?.ramp);

  const vars =
    `--ms-top:${top};` +
    `--ms-mid:${mid};` +
    `--ms-base:${base};` +
    `--ms-core:${core};` +
    `--ms-stage:${stage};` +
    `--ms-features:${features};` +
    `--ms-accent:${accentSafe};` +
    `--ms-signal:${signal};` +
    `--ms-signal-color:${signalColor};` +
    `--ms-glow:${glow}`;

  return mergeRootSvgStyle(stripLeakingThemeRules(svg), vars);
}

/** SVG for library / marketplace cards: gestures[0] with studio-default theme vars. */
export function previewSvgFromPack(pack: PreviewPackLike): string {
  const gesture = pack.gestures[0];
  if (!gesture?.svg) throw new Error("Pack has no previewable gesture");
  const theme = studioDefaultTheme(pack);
  if (!theme) return gesture.svg;
  return applyPrimaryThemeToPreviewSvg(gesture.svg, theme, pack.accent, {
    signal: normalizePreviewSignal(pack.instrument?.defaultValue, 50),
    ramp: pack.instrument?.ramp,
    glow: 0.45,
  });
}

/**
 * Card-safe preview: never throws. Falls back to raw first gesture, then empty SVG.
 * Use on list/detail reads so one corrupt pack cannot take down the page.
 */
export function previewSvgForCard(pack: PreviewPackLike): string {
  try {
    return previewSvgFromPack(pack);
  } catch {
    const raw = pack.gestures[0]?.svg;
    if (raw?.includes("<svg")) return raw;
    return EMPTY_PREVIEW_SVG;
  }
}
