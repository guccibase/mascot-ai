import type { GeneratedMascot, MascotPart } from "@/lib/types";

const STRUCTURAL_PARTS: Array<{
  match: RegExp;
  key: string;
  label: string;
  category: string;
  essential?: boolean;
}> = [
  {
    match: /class=["'][^"']*\bms-eyes\b/,
    key: "eyes",
    label: "Eyes",
    category: "Face",
    essential: true,
  },
  {
    match: /class=["'][^"']*\bms-signal-fan\b/,
    key: "instrument",
    label: "Instrument / fan",
    category: "Instrument",
  },
  {
    match: /class=["'][^"']*\bms-glow-halo\b/,
    key: "halo",
    label: "Glow halo",
    category: "Light",
  },
];

/** Ensure known structural groups carry data-ms-part for toggling. */
export function ensurePartAttributes(svg: string): string {
  let out = svg;
  const tags: Array<[RegExp, string]> = [
    [/(<g\b[^>]*class=["'][^"']*\bms-eyes\b[^"']*["'][^>]*)(>)/i, "eyes"],
    [
      /(<g\b[^>]*class=["'][^"']*\bms-signal-fan\b[^"']*["'][^>]*)(>)/i,
      "instrument",
    ],
    [
      /(<ellipse\b[^>]*class=["'][^"']*\bms-glow-halo\b[^"']*["'][^>]*)(>)/i,
      "halo",
    ],
    [/(<g\b[^>]*class=["'][^"']*\bms-glow-halo\b[^"']*["'][^>]*)(>)/i, "halo"],
  ];
  for (const [re, key] of tags) {
    out = out.replace(re, (full, open: string, close: string) => {
      if (/data-ms-part=/.test(open)) return full;
      return `${open} data-ms-part="${key}"${close}`;
    });
  }
  return out;
}

/** Collect data-ms-part keys from SVG markup. */
export function listPartKeysInSvg(svg: string): string[] {
  const keys = new Set<string>();
  const re = /data-ms-part=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    if (m[1]) keys.add(m[1]);
  }
  return [...keys];
}

export function extractPartsFromMascot(
  mascot: Pick<GeneratedMascot, "gestures" | "parts" | "instrument">
): MascotPart[] {
  const byKey = new Map<string, MascotPart>();

  for (const p of mascot.parts ?? []) {
    if (p?.key) byKey.set(p.key, p);
  }

  for (const g of mascot.gestures) {
    const svg = g.svg ?? "";
    for (const key of listPartKeysInSvg(svg)) {
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          label: key
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          category: "Details",
        });
      }
    }
    for (const s of STRUCTURAL_PARTS) {
      if (s.match.test(svg) && !byKey.has(s.key)) {
        byKey.set(s.key, {
          key: s.key,
          label:
            s.key === "instrument"
              ? mascot.instrument?.label || s.label
              : s.label,
          category: s.category,
          essential: s.essential,
        });
      }
    }
  }

  // Drop catalog entries that never appear in any gesture SVG
  const present = new Set<string>();
  for (const g of mascot.gestures) {
    const svg = g.svg ?? "";
    for (const key of listPartKeysInSvg(svg)) present.add(key);
    for (const s of STRUCTURAL_PARTS) {
      if (s.match.test(svg)) present.add(s.key);
    }
  }
  for (const key of [...byKey.keys()]) {
    if (!present.has(key)) byKey.delete(key);
  }

  const order = [
    "Core",
    "Face",
    "Instrument",
    "Light",
    "Details",
    "System",
  ];
  return [...byKey.values()].sort((a, b) => {
    const ca = order.indexOf(a.category);
    const cb = order.indexOf(b.category);
    if (ca !== cb) return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
    return a.label.localeCompare(b.label);
  });
}

/** Hide/show [data-ms-part] nodes live in the mounted SVG. */
export function applyPartVisibility(
  root: ParentNode | null,
  enabled: Set<string>
) {
  if (!root) return;
  const nodes = root.querySelectorAll<SVGElement>("[data-ms-part]");
  nodes.forEach((el) => {
    const key = el.getAttribute("data-ms-part");
    if (!key) return;
    const on = enabled.has(key);
    el.style.display = on ? "" : "none";
    el.setAttribute("data-ms-hidden", on ? "0" : "1");
  });
}
