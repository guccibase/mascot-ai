import type {
  GeneratedMascot,
  MascotPart,
  StudioInstrument,
  ThemeSwatch,
} from "@/lib/types";
import type { RemixEdit } from "./types";

export function coerceRemixEdits(raw: unknown): RemixEdit[] {
  if (!Array.isArray(raw)) return [];
  const out: RemixEdit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id) continue;
    const edit: RemixEdit = { id: o.id };
    if (typeof o.fill === "string") edit.fill = o.fill;
    if (typeof o.stroke === "string") edit.stroke = o.stroke;
    if (typeof o.d === "string") edit.d = o.d;
    if (typeof o.part === "string") edit.part = o.part;
    out.push(edit);
  }
  return out;
}

function coerceTheme(raw: unknown): ThemeSwatch | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as ThemeSwatch;
  if (
    typeof t.top !== "string" ||
    typeof t.mid !== "string" ||
    typeof t.base !== "string" ||
    typeof t.core !== "string" ||
    typeof t.stage !== "string"
  ) {
    return null;
  }
  return {
    name: typeof t.name === "string" ? t.name : "Primary",
    top: t.top,
    mid: t.mid,
    base: t.base,
    core: t.core,
    stage: t.stage,
    features: typeof t.features === "string" ? t.features : undefined,
  };
}

function coerceInstrument(raw: unknown): StudioInstrument | null {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as StudioInstrument;
  if (typeof i.label !== "string" || !Array.isArray(i.ramp) || i.ramp.length !== 5) {
    return null;
  }
  return {
    label: i.label,
    description: typeof i.description === "string" ? i.description : "",
    lowLabel: typeof i.lowLabel === "string" ? i.lowLabel : "Low",
    midLabel: typeof i.midLabel === "string" ? i.midLabel : "Mid",
    highLabel: typeof i.highLabel === "string" ? i.highLabel : "High",
    defaultValue:
      typeof i.defaultValue === "number" ? i.defaultValue : 68,
    ramp: i.ramp as StudioInstrument["ramp"],
  };
}

function coerceParts(raw: unknown): MascotPart[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is MascotPart => {
      if (!p || typeof p !== "object") return false;
      const o = p as MascotPart;
      return typeof o.key === "string" && typeof o.label === "string";
    })
    .map((p) => ({
      key: p.key,
      label: p.label,
      category: p.category ?? "Accessory",
      description: p.description,
      essential: p.essential,
    }));
}

export function coerceRemixIdentity(
  parsed: unknown,
  fallbackName: string
): {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  instrument: StudioInstrument;
  themes: Record<string, ThemeSwatch>;
  palette: Record<string, string>;
  edits: RemixEdit[];
  parts: MascotPart[];
} | null {
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as Record<string, unknown>;

  const primary = coerceTheme(
    (v.themes as Record<string, unknown> | undefined)?.primary ?? v.themes
  );
  const instrument = coerceInstrument(v.instrument);
  if (!primary || !instrument) return null;

  const themes: Record<string, ThemeSwatch> = { primary };
  if (v.themes && typeof v.themes === "object") {
    for (const [key, t] of Object.entries(v.themes as Record<string, unknown>)) {
      if (key === "primary") continue;
      const coerced = coerceTheme(t);
      if (coerced) themes[key] = coerced;
    }
  }

  const palette: Record<string, string> = {};
  if (v.palette && typeof v.palette === "object") {
    for (const [k, val] of Object.entries(v.palette as Record<string, unknown>)) {
      if (typeof val === "string") palette[k] = val;
    }
  }

  return {
    name: typeof v.name === "string" && v.name.trim() ? v.name.trim() : fallbackName,
    tagline: typeof v.tagline === "string" ? v.tagline : "",
    product: typeof v.product === "string" ? v.product : undefined,
    accent: typeof v.accent === "string" ? v.accent : primary.mid,
    glowLabel: typeof v.glowLabel === "string" ? v.glowLabel : undefined,
    instrument,
    themes,
    palette,
    edits: coerceRemixEdits(v.edits),
    parts: coerceParts(v.parts),
  };
}

export function coerceRemixPose(
  parsed: unknown,
  key: string
): {
  key: string;
  edits: RemixEdit[];
  track?: boolean;
  delight?: boolean;
  signal?: number;
} | null {
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as Record<string, unknown>;
  return {
    key,
    edits: coerceRemixEdits(v.edits),
    track: typeof v.track === "boolean" ? v.track : undefined,
    delight: typeof v.delight === "boolean" ? v.delight : undefined,
    signal: typeof v.signal === "number" ? v.signal : undefined,
  };
}

export function toGeneratedMascot(args: {
  identity: ReturnType<typeof coerceRemixIdentity>;
  gestures: GeneratedMascot["gestures"];
}): GeneratedMascot | null {
  const id = args.identity;
  if (!id) return null;
  return {
    name: id.name,
    tagline: id.tagline,
    product: id.product,
    accent: id.accent,
    glowLabel: id.glowLabel,
    instrument: id.instrument,
    themes: id.themes,
    gestures: args.gestures,
    parts: id.parts,
  };
}
