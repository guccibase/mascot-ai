const HEX_RE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

function normalizeHex(hex: string): string {
  const h = hex.replace("#", "").toUpperCase();
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return `#${h}`;
}

export type PaletteEntry = {
  hex: string;
  count: number;
};

/** Collect distinct hex colours from SVG markup with usage counts. */
export function collectPalette(svgs: string[]): PaletteEntry[] {
  const counts = new Map<string, number>();
  for (const svg of svgs) {
    HEX_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = HEX_RE.exec(svg))) {
      const norm = normalizeHex(m[0]);
      if (seen.has(norm)) continue;
      seen.add(norm);
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count);
}

/** Apply an old→new hex map across markup (3- and 6-digit, case-insensitive). */
export function applyPaletteMap(svg: string, palette: Record<string, string>): string {
  let out = svg;
  for (const [oldHex, newHex] of Object.entries(palette)) {
    const norm = normalizeHex(oldHex);
    const esc = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "gi"), normalizeHex(newHex));
    if (norm.length === 7) {
      const short = `#${norm[1]}${norm[3]}${norm[5]}`;
      const shortEsc = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(shortEsc, "gi"), normalizeHex(newHex));
    }
  }
  return out;
}

/** Validate palette entries are well-formed hex pairs. */
export function sanitizePalette(
  input: unknown,
  allowedOld: Set<string>
): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [oldHex, newHex] of Object.entries(input as Record<string, unknown>)) {
    const oldNorm = normalizeHex(String(oldHex));
    if (!allowedOld.has(oldNorm)) continue;
    if (typeof newHex !== "string" || !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(newHex.trim())) {
      continue;
    }
    out[oldNorm] = normalizeHex(newHex.trim());
  }
  return out;
}

export { normalizeHex };
