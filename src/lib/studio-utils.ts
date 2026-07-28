import {
  ensurePartAttributes,
  extractPartsFromMascot,
} from "@/lib/mascot-parts";
import { sanitizeSvgOrThrow } from "@/lib/sanitize-svg";
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

export function normalizeSignal(value: unknown, fallback = 50): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return fallback;
}

export function mergeSvgClassNames(
  current: string | null | undefined,
  ...required: string[]
): string {
  return [
    ...new Set(
      `${current ?? ""} ${required.join(" ")}`
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    ),
  ].join(" ");
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

export const TRACK_KEYS = new Set([
  "idle",
  "listening",
  "thinking",
  "ready",
  "encourage",
  "guiding",
]);

export function defaultTrackForGesture(key: string): boolean {
  return TRACK_KEYS.has(key);
}

export function defaultDelightForGesture(key: string): boolean {
  return DELIGHT_KEYS.has(key);
}

function normalizeHex(input: unknown, fallback: string) {
  if (typeof input !== "string") return fallback;
  const m = input.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
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
  const blush = theme.blush
    ? normalizeHex(theme.blush, "#E8A8A0")
    : undefined;
  const blushVar = blush ? `--ms-blush:${blush};` : "";
  return `
.ms-root{--ms-top:${theme.top};--ms-mid:${theme.mid};--ms-base:${theme.base};--ms-core:${theme.core};--ms-stage:${theme.stage};--ms-features:${features};--ms-accent:${accent};${blushVar}--ms-signal:68;--ms-signal-color:${accent};--ms-glow:.45}
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
  if (theme.blush) pairs.push([theme.blush, "var(--ms-blush)"]);

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

  // Merge the root class instead of emitting a second `class` attribute.
  const rootTag = out.match(/<svg\b[^>]*>/)?.[0] ?? "";
  if (!/\bclass=["']/.test(rootTag)) {
    out = out.replace(/<svg\b/, '<svg class="ms-root"');
  } else if (!/\bclass=["'][^"']*\bms-root\b/.test(rootTag)) {
    out = out.replace(
      /(<svg\b[^>]*\bclass=["'])([^"']*)(["'])/,
      "$1$2 ms-root$3"
    );
  }

  const styleBlock = `<style>${themeVarsStyle(theme, accent)}</style>`;
  if (out.includes("</style>")) {
    out = out.replace("</style>", `${themeVarsStyle(theme, accent)}</style>`);
  } else {
    out = out.replace(/<svg([^>]*)>/, `<svg$1>${styleBlock}`);
  }

  // Eye group for cursor tracking. Wrap common eye patterns if missing
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
        // incomplete wrap. Skip rather than break SVG
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
      ? "One 0 to 100 input tints props, halo, and the spectrogram strip, same product pattern as Lyra."
      : "One 0 to 100 input drives accent tint and the live spectrogram strip under the stage.",
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
      ...(t.blush
        ? { blush: normalizeHex(t.blush, "#E8A8A0") }
        : {}),
    };
  }

  const primary = themes[themeEntries[0]![0]]!;
  const accent = normalizeHex(raw.accent, primary.mid);
  const instrumentHidden = raw.instrument?.hidden === true;
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
    // Spreading defaults must not resurrect a Signal slider the pack hid.
    hidden: instrumentHidden ? true : raw.instrument?.hidden,
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
      svg: ensurePartAttributes(
        applyThemeContract(
          sanitizeSvgOrThrow(got.svg, `gesture "${req.key}"`),
          primary,
          accent
        )
      ),
    };
  });

  const draft: GeneratedMascot = {
    name: raw.name,
    tagline: raw.tagline,
    product: raw.product,
    accent,
    glowLabel: raw.glowLabel || "Spotlight",
    themes,
    instrument,
    gestures,
    parts: raw.parts ?? [],
  };

  return {
    ...draft,
    parts: extractPartsFromMascot(draft),
  };
}

/** Normalize one newly generated gesture against an existing mascot pack. */
export function normalizeSingleGesture(
  mascot: GeneratedMascot,
  req: {
    key: string;
    label: string;
    cat: string;
    tip: string;
    use: string;
  },
  raw: Partial<GeneratedGesture> & { svg: string }
): GeneratedGesture {
  const themeEntries = Object.entries(mascot.themes ?? {});
  if (themeEntries.length === 0) {
    throw new Error("Mascot pack missing themes");
  }
  const primaryKey = themeEntries[0]![0];
  const primary = {
    ...mascot.themes[primaryKey]!,
    top: normalizeHex(mascot.themes[primaryKey]!.top, "#FFE9AE"),
    mid: normalizeHex(mascot.themes[primaryKey]!.mid, "#FFB35C"),
    base: normalizeHex(mascot.themes[primaryKey]!.base, "#F4744E"),
    core: normalizeHex(mascot.themes[primaryKey]!.core, "#FFF6CF"),
    stage: normalizeHex(mascot.themes[primaryKey]!.stage, "#1A2438"),
    features: normalizeHex(
      mascot.themes[primaryKey]!.features ?? "#2A1A0C",
      "#2A1A0C"
    ),
  };
  const accent = normalizeHex(mascot.accent, primary.mid);

  return {
    key: req.key,
    label: req.label,
    cat: req.cat,
    tip: req.tip,
    use: req.use,
    track:
      typeof raw.track === "boolean"
        ? raw.track
        : TRACK_KEYS.has(req.key),
    delight:
      typeof raw.delight === "boolean"
        ? raw.delight
        : DELIGHT_KEYS.has(req.key),
    signal: typeof raw.signal === "number" ? clamp(raw.signal) : undefined,
    svg: ensurePartAttributes(
      applyThemeContract(
        sanitizeSvgOrThrow(raw.svg, `gesture "${req.key}"`),
        primary,
        accent
      )
    ),
  };
}

/**
 * Bake live theme / signal / glow into a gesture SVG string for offline export
 * (works without a mounted DOM node).
 */
export function bakeGestureExport(
  svgMarkup: string,
  opts: {
    gestureKey: string;
    theme: ThemeSwatch;
    accent: string;
    signal: number;
    glow: number;
    ramp: string[];
    enabledParts?: ReadonlySet<string>;
  }
): string {
  if (typeof DOMParser === "undefined") {
    // Server fallback. Return markup as-is with an XML header
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgMarkup;
  }
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgMarkup;
  }
  const gestureClass = `ms-g-${opts.gestureKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  svg.setAttribute(
    "class",
    mergeSvgClassNames(svg.getAttribute("class"), "ms-root", gestureClass)
  );
  svg.setAttribute("width", "420");
  svg.setAttribute("height", "520");
  svg.removeAttribute("data-paused");
  svg.querySelectorAll(".ms-eyes, .bd-pupils").forEach((element) => {
    (element as SVGElement).style.transform = "";
  });
  if (opts.enabledParts) {
    svg.querySelectorAll("[data-ms-part]").forEach((element) => {
      const key = element.getAttribute("data-ms-part");
      if (key && !opts.enabledParts?.has(key)) element.remove();
    });
  }
  svg.querySelectorAll('[data-ms-hidden="1"]').forEach((el) => el.remove());
  const baked = [
    `--ms-top:${opts.theme.top}`,
    `--ms-mid:${opts.theme.mid}`,
    `--ms-base:${opts.theme.base}`,
    `--ms-core:${opts.theme.core}`,
    `--ms-features:${opts.theme.features ?? "#2A1A0C"}`,
    `--ms-accent:${opts.accent}`,
    `--ms-signal:${Math.round(opts.signal)}`,
    `--ms-signal-color:${rampColor(opts.signal, opts.ramp)}`,
    `--ms-glow:${opts.glow}`,
  ].join(";");
  svg.setAttribute("style", baked);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(svg)
  );
}
