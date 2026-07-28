import {
  assertPack,
  MAX_PACK_JSON_BYTES,
} from "../../../convex/lib/marketplace";
import { restoreSharedCss } from "@/lib/example-poses/types";
import type { PosePackMeta } from "@/lib/example-poses/types";
import { getMascot } from "@/lib/mascots";
import { extractPartsFromMascot } from "@/lib/mascot-parts";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import type {
  GeneratedGesture,
  GeneratedMascot,
  StudioInstrument,
  ThemeSwatch,
} from "@/lib/types";

/**
 * Parse an admin-uploaded marketplace pack:
 * - GeneratedMascot JSON
 * - pose-pack JSON from `npm run mascot:export` (`{ slug, css, poses }`)
 * - JSX/TS exporting `MARKETPLACE_PACK = { ... }` (never evaluated as code)
 *
 * Studio `*-mascot.jsx` files are rejected — export to JSON first.
 */
export function parseMarketplacePackFile(text: string): GeneratedMascot {
  const trimmed = text.trim().replace(/^\uFEFF/, "");
  if (!trimmed) throw new Error("File is empty");

  if (looksLikeStudioJsx(trimmed)) {
    throw new Error(
      "Upload pose-pack JSON, not studio JSX. Export first: npm run mascot:export -- <mascot>"
    );
  }

  // Raw JSON (GeneratedMascot or pose pack)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return coerceToPack(parseJson(trimmed));
  }

  // JSX/TS that embeds MARKETPLACE_PACK = { ... }
  const match = trimmed.match(
    /(?:export\s+const|const|module\.exports\.|exports\.)\s*MARKETPLACE_PACK\s*=\s*/
  );
  if (match && match.index != null) {
    const start = trimmed.indexOf("{", match.index + match[0].length);
    if (start >= 0) {
      const json = extractBalancedObject(trimmed, start);
      return coerceToPack(parseJson(json));
    }
  }

  // Trailing JSON blob in the file
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return coerceToPack(
        parseJson(trimmed.slice(firstBrace, lastBrace + 1))
      );
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid pack JSON") {
        /* fall through */
      } else {
        throw err;
      }
    }
  }

  throw new Error(
    "Could not parse a mascot pack. Upload pose-pack JSON from npm run mascot:export."
  );
}

/** Sanitize SVGs and enforce gesture/size limits before Convex upsert. */
export function finalizeMarketplacePack(pack: GeneratedMascot): GeneratedMascot {
  const gestures = pack.gestures.map((g) => {
    const svg = sanitizeSvg(g.svg);
    if (!svg.trim()) {
      throw new Error(`Gesture “${g.key}” SVG was empty after sanitize`);
    }
    return { ...g, svg };
  });
  const next: GeneratedMascot = { ...pack, gestures };
  assertPack(next);
  const bytes = JSON.stringify(next).length;
  if (bytes > MAX_PACK_JSON_BYTES) {
    throw new Error(
      `Pack is too large to save (${Math.round(bytes / 1024)}KB). Max is ${Math.round(MAX_PACK_JSON_BYTES / 1024)}KB.`
    );
  }
  return next;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid pack JSON");
  }
}

function looksLikeStudioJsx(text: string): boolean {
  return (
    /\bexport\s+const\s+POSE_SOURCE\b/.test(text) ||
    (/\bconst\s+GESTURES\s*=/.test(text) &&
      /\brenderPose\s*:/.test(text) &&
      !/\bMARKETPLACE_PACK\b/.test(text))
  );
}

function coerceToPack(raw: unknown): GeneratedMascot {
  if (!raw || typeof raw !== "object") throw new Error("Pack must be an object");
  const obj = raw as Record<string, unknown>;

  // Example pose pack: { slug, css, poses: [{ key, svg, ... }] }
  if (Array.isArray(obj.poses)) {
    return validatePack(posePackToGeneratedMascot(obj));
  }

  return validatePack(obj);
}

function posePackToGeneratedMascot(
  raw: Record<string, unknown>
): GeneratedMascot {
  const poses = raw.poses as Array<Record<string, unknown>>;
  if (!poses.length) throw new Error("Pose pack has no poses");

  const css = typeof raw.css === "string" ? raw.css : "";
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  const embedded = parsePosePackMeta(raw.meta);
  const catalog = slug ? getMascot(slug) : undefined;

  const seen = new Set<string>();
  const gestures: GeneratedGesture[] = poses.map((p, i) => {
    const key = typeof p.key === "string" ? p.key : `pose_${i}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate pose key “${key}”`);
    }
    seen.add(key);
    const svg = typeof p.svg === "string" ? p.svg : "";
    if (!svg.includes("<svg")) {
      throw new Error(`Pose “${key}” is missing svg`);
    }
    return {
      key,
      label: typeof p.label === "string" ? p.label : key,
      cat: typeof p.cat === "string" ? p.cat : "Core",
      tip: typeof p.tip === "string" ? p.tip : "",
      use: typeof p.use === "string" ? p.use : "",
      track: Boolean(p.track),
      signal: typeof p.signal === "number" ? p.signal : undefined,
      svg: restoreSharedCss(svg, css),
    };
  });

  const accent = embedded?.accent ?? catalog?.accent ?? "#F5B34F";
  const stage = embedded?.stage ?? catalog?.stage ?? "#1a1f2e";
  const draft: GeneratedMascot = {
    name:
      embedded?.name ??
      catalog?.name ??
      (slug ? titleCase(slug) : "Marketplace mascot"),
    tagline:
      embedded?.tagline ?? catalog?.tagline ?? "Marketplace mascot",
    product: embedded?.product ?? catalog?.product,
    accent,
    glowLabel: embedded?.glowLabel,
    themes: embedded?.themes ?? { primary: flatTheme(accent, stage) },
    // A pose pack is a snapshot: nothing in it can answer a live signal
    // slider unless the studio drew `.ms-signal-fan` markup and said so.
    instrument: embedded?.instrument ?? hiddenInstrument(accent),
    gestures,
    parts: [],
  };
  draft.parts = extractPartsFromMascot(draft);
  return draft;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Single swatch for packs whose studio did not declare its palette. */
function flatTheme(accent: string, stage: string): ThemeSwatch {
  return {
    name: "Primary",
    top: accent,
    mid: accent,
    base: accent,
    core: accent,
    stage,
  };
}

/** Ramp for sparks and accents, with no slider offered. */
function hiddenInstrument(accent: string): StudioInstrument {
  return {
    label: "Signal",
    description: "Intensity",
    lowLabel: "Low",
    midLabel: "Mid",
    highLabel: "High",
    defaultValue: 50,
    ramp: [
      accent,
      shade(accent, 0.15),
      shade(accent, 0.3),
      shade(accent, 0.45),
      shade(accent, 0.6),
    ],
    hidden: true,
  };
}

/**
 * Read a pose pack's `meta`. Every field is optional: built-ins fall back to
 * the mascot catalog, and anything a studio does declare wins, because it
 * describes the artwork the snapshot was actually rendered from.
 */
function parsePosePackMeta(raw: unknown): PosePackMeta | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;

  const meta: PosePackMeta = {};
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;

  meta.name = text(obj.name);
  meta.tagline = text(obj.tagline);
  meta.product = text(obj.product);
  meta.accent = text(obj.accent);
  meta.stage = text(obj.stage);
  meta.glowLabel = text(obj.glowLabel);
  meta.themes = parseThemes(obj.themes);
  meta.instrument = parseInstrument(obj.instrument);

  return meta;
}

const SWATCH_KEYS = ["top", "mid", "base", "core", "stage"] as const;

function parseThemes(raw: unknown): Record<string, ThemeSwatch> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const themes: Record<string, ThemeSwatch> = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      throw new Error(`Theme “${key}” must be an object`);
    }
    const swatch = value as Record<string, unknown>;
    for (const field of SWATCH_KEYS) {
      if (typeof swatch[field] !== "string" || !swatch[field]) {
        throw new Error(`Theme “${key}” is missing ${field}`);
      }
    }
    themes[key] = {
      name: typeof swatch.name === "string" && swatch.name ? swatch.name : key,
      top: swatch.top as string,
      mid: swatch.mid as string,
      base: swatch.base as string,
      core: swatch.core as string,
      stage: swatch.stage as string,
      features:
        typeof swatch.features === "string" && swatch.features
          ? swatch.features
          : undefined,
    };
  }

  return Object.keys(themes).length > 0 ? themes : undefined;
}

/** `null` is a declaration that the studio has no signal control. */
function parseInstrument(raw: unknown): StudioInstrument | null | undefined {
  if (raw === null) return null;
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const ramp = obj.ramp;
  if (!Array.isArray(ramp) || ramp.length !== 5) {
    throw new Error("Pack meta instrument.ramp must have 5 colors");
  }
  if (typeof obj.label !== "string" || !obj.label.trim()) {
    throw new Error("Pack meta instrument needs a label");
  }
  const stops = ramp.map((color) => {
    if (typeof color !== "string" || !color.trim()) {
      throw new Error("Pack meta instrument.ramp must be 5 color strings");
    }
    return color;
  }) as StudioInstrument["ramp"];

  return {
    label: obj.label.trim(),
    description: typeof obj.description === "string" ? obj.description : "",
    lowLabel: typeof obj.lowLabel === "string" ? obj.lowLabel : "Low",
    midLabel: typeof obj.midLabel === "string" ? obj.midLabel : "Mid",
    highLabel: typeof obj.highLabel === "string" ? obj.highLabel : "High",
    defaultValue:
      typeof obj.defaultValue === "number" && Number.isFinite(obj.defaultValue)
        ? obj.defaultValue
        : 50,
    ramp: stops,
  };
}

/** Darken a hex color toward black by t∈[0,1]. */
function shade(hex: string, t: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return hex;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - t))));
  return (
    "#" +
    [mix(r), mix(g), mix(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

function extractBalancedObject(source: string, start: number): string {
  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced MARKETPLACE_PACK object");
}

function validatePack(raw: unknown): GeneratedMascot {
  if (!raw || typeof raw !== "object") throw new Error("Pack must be an object");
  const pack = raw as Partial<GeneratedMascot>;
  if (typeof pack.name !== "string" || !pack.name.trim()) {
    throw new Error("Pack needs a name");
  }
  if (typeof pack.tagline !== "string") throw new Error("Pack needs a tagline");
  if (typeof pack.accent !== "string") throw new Error("Pack needs an accent");
  if (!pack.themes || typeof pack.themes !== "object") {
    throw new Error("Pack needs themes");
  }
  if (
    !pack.instrument ||
    !Array.isArray(pack.instrument.ramp) ||
    pack.instrument.ramp.length !== 5
  ) {
    throw new Error("Pack instrument.ramp must have 5 colors");
  }
  if (!Array.isArray(pack.gestures) || pack.gestures.length < 1) {
    throw new Error("Pack needs at least one gesture");
  }
  for (const g of pack.gestures) {
    if (!g?.key || !g.svg) throw new Error("Each gesture needs key and svg");
  }
  if (!Array.isArray(pack.parts)) throw new Error("Pack needs parts array");
  return pack as GeneratedMascot;
}
