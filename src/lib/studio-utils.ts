import type {
  GeneratedGesture,
  GeneratedMascot,
  StudioInstrument,
  ThemeSwatch,
} from "@/lib/types";

export const DEFAULT_RAMP: StudioInstrument["ramp"] = [
  "#7B6CFF",
  "#A46CFF",
  "#E07A5F",
  "#F0A35A",
  "#F5B34F",
];

export const SPARK_PATHS = {
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  drop: "M0,7 Q-5,-1 0,-7 Q5,-1 0,7 Z",
  note: "M-2,4 L-2,-8 L6,-6 L6,2 C6,4.2 4.2,6 2,6 C-0.2,6 -2,4.2 -2,2 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
} as const;

export type SparkKind = keyof typeof SPARK_PATHS;

export function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

export function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2.4);
}

export function rampColor(score: number, ramp: string[] = DEFAULT_RAMP) {
  const s = clamp(score) / 100;
  const stops = ramp.length - 1;
  const x = s * stops;
  const i = Math.min(Math.floor(x), stops - 1);
  const t = x - i;
  return mixHex(ramp[i] ?? ramp[0]!, ramp[i + 1] ?? ramp[i]!, t);
}

function hx(h: string): [number, number, number] {
  const s = h.replace("#", "");
  const v =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

export function mixHex(a: string, b: string, t: number) {
  const [r1, g1, b1] = hx(a);
  const [r2, g2, b2] = hx(b);
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r1 + (r2 - r1) * t)}${to(g1 + (g2 - g1) * t)}${to(b1 + (b2 - b1) * t)}`;
}

export function rgba(c: string, a: number) {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
}

/** Nine-bar spectrogram, same math spirit as Lyra's feather fan. */
export function computeSignalBars(score: number) {
  const e = easeOut(clamp(score) / 100);
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const arch = 1 - Math.abs(t - 0.5) * 1.35;
    const h = 8 + e * 34 * Math.max(0.25, arch) + Math.sin(i * 1.7) * 2;
    return {
      i,
      h,
      color: rampColor(score + (t - 0.5) * 22),
      x: 10 + i * 12,
    };
  });
}

export function zoneForSignal(score: number) {
  if (score < 34) return "Flat";
  if (score < 67) return "Building";
  return "Commanding";
}

const DELIGHT_KEYS = new Set([
  "celebrate",
  "love",
  "proud",
  "bravo",
  "milestone",
  "wave",
  "alarm",
  "eid",
  "happy",
]);

const TRACK_KEYS = new Set([
  "idle",
  "listening",
  "thinking",
  "ready",
  "encourage",
  "guiding",
]);

function normalizeHex(input: string, fallback: string) {
  const m = input?.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  const s = m[1]!;
  if (s.length === 3) {
    return `#${s
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  return `#${s.toUpperCase()}`;
}

function themeVarsStyle(theme: ThemeSwatch, accent: string) {
  const features = normalizeHex(theme.features ?? "#2A1A0C", "#2A1A0C");
  return `
.ms-root{--ms-top:${theme.top};--ms-mid:${theme.mid};--ms-base:${theme.base};--ms-core:${theme.core};--ms-stage:${theme.stage};--ms-features:${features};--ms-accent:${accent};--ms-signal:68;--ms-signal-color:${accent};--ms-glow:.45}
.ms-eyes{transition:transform .12s ease-out}
.ms-glow-halo,.ms-signal-glow{opacity:calc(.18 + var(--ms-glow) * .72)}
.ms-signal-tint{fill:var(--ms-signal-color);stroke:var(--ms-signal-color)}
`.trim();
}

/** Replace literal theme hexes with CSS variables so themes/custom colours work live. */
export function applyThemeContract(
  svg: string,
  theme: ThemeSwatch,
  accent: string
): string {
  let out = svg.trim();
  if (!out.includes("<svg")) return out;

  const pairs: Array<[string, string]> = [
    [theme.top, "var(--ms-top)"],
    [theme.mid, "var(--ms-mid)"],
    [theme.base, "var(--ms-base)"],
    [theme.core, "var(--ms-core)"],
    [accent, "var(--ms-accent)"],
  ];
  if (theme.features) pairs.push([theme.features, "var(--ms-features)"]);

  for (const [hex, cssVar] of pairs) {
    const h = normalizeHex(hex, "");
    if (!h) continue;
    const esc = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "gi"), cssVar);
    if (h.length === 7) {
      const short = `#${h[1]}${h[3]}${h[5]}`;
      const shortEsc = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(shortEsc, "gi"), cssVar);
    }
  }

  // Ensure root class + style contract
  if (!/class=["'][^"']*\bms-root\b/.test(out)) {
    out = out.replace(/<svg\b/, '<svg class="ms-root"');
  } else if (!out.includes("ms-root")) {
    out = out.replace(/class=["']([^"']*)["']/, 'class="$1 ms-root"');
  }

  const styleBlock = `<style>${themeVarsStyle(theme, accent)}</style>`;
  if (out.includes("</style>")) {
    out = out.replace("</style>", `${themeVarsStyle(theme, accent)}</style>`);
  } else {
    out = out.replace(/<svg([^>]*)>/, `<svg$1>${styleBlock}`);
  }

  // Eye group for cursor tracking — wrap common eye patterns if missing
  if (!out.includes("ms-eyes")) {
    out = out.replace(
      /(<g[^>]*id=["']eyes["'][^>]*>)/i,
      '<g class="ms-eyes" id="eyes">'
    );
    if (!out.includes("ms-eyes")) {
      // last resort: annotate first group that looks like a face cluster comment
      out = out.replace(
        /<!--\s*eyes\s*-->/i,
        '<!-- eyes --><g class="ms-eyes">'
      );
      if (out.includes('<g class="ms-eyes">') && !out.includes("</g><!-- /ms-eyes -->")) {
        // incomplete wrap — skip rather than break SVG
      }
    }
  }

  return out;
}

function defaultInstrument(product?: string): StudioInstrument {
  const coaching = /speech|coach|orator|voice|present/i.test(product ?? "");
  return {
    label: coaching ? "Delivery" : "Signal",
    description: coaching
      ? "One 0–100 input tints props, halo, and the spectrogram strip — same product pattern as Lyra."
      : "One 0–100 input drives accent tint and the live spectrogram strip under the stage.",
    lowLabel: "Flat",
    midLabel: "Building",
    highLabel: "Commanding",
    defaultValue: 68,
    ramp: DEFAULT_RAMP,
  };
}

export function normalizeGeneratedMascot(
  raw: GeneratedMascot,
  requested: Array<{
    key: string;
    label: string;
    cat: string;
    tip: string;
    use: string;
  }>
): GeneratedMascot {
  const themeEntries = Object.entries(raw.themes ?? {});
  if (themeEntries.length === 0) {
    throw new Error("Mascot pack missing themes");
  }

  const themes: Record<string, ThemeSwatch> = {};
  for (const [key, t] of themeEntries) {
    themes[key] = {
      name: t.name || key,
      top: normalizeHex(t.top, "#FFE9AE"),
      mid: normalizeHex(t.mid, "#FFB35C"),
      base: normalizeHex(t.base, "#F4744E"),
      core: normalizeHex(t.core, "#FFF6CF"),
      stage: normalizeHex(t.stage, "#1A2438"),
      features: t.features
        ? normalizeHex(t.features, "#2A1A0C")
        : "#2A1A0C",
    };
  }

  const primary = themes[themeEntries[0]![0]]!;
  const accent = normalizeHex(raw.accent, primary.mid);
  const instrument: StudioInstrument = {
    ...defaultInstrument(raw.product),
    ...(raw.instrument ?? {}),
    ramp:
      raw.instrument?.ramp?.length === 5
        ? (raw.instrument.ramp.map((c) =>
            normalizeHex(c, accent)
          ) as StudioInstrument["ramp"])
        : DEFAULT_RAMP,
    defaultValue: clamp(raw.instrument?.defaultValue ?? 68),
  };

  const byKey = new Map(
    (raw.gestures ?? []).map((g) => [g.key, g] as const)
  );

  const gestures: GeneratedGesture[] = requested.map((req) => {
    const got = byKey.get(req.key);
    if (!got?.svg?.includes("<svg")) {
      throw new Error(`Missing gesture SVG for "${req.key}"`);
    }
    const track =
      typeof got.track === "boolean"
        ? got.track
        : TRACK_KEYS.has(req.key);
    const delight =
      typeof got.delight === "boolean"
        ? got.delight
        : DELIGHT_KEYS.has(req.key);
    const signal =
      typeof got.signal === "number" ? clamp(got.signal) : undefined;

    return {
      key: req.key,
      label: req.label,
      cat: req.cat,
      tip: req.tip,
      use: req.use,
      track,
      delight,
      signal,
      svg: applyThemeContract(got.svg, primary, accent),
    };
  });

  return {
    name: raw.name,
    tagline: raw.tagline,
    product: raw.product,
    accent,
    glowLabel: raw.glowLabel || "Spotlight",
    themes,
    instrument,
    gestures,
  };
}
