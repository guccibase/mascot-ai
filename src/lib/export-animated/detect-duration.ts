const STYLE_BLOCK_RE = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const SMIL_DUR_RE =
  /<(?:animate|animateTransform|animateMotion|set)\b[^>]*\bdur="([^"]+)"/gi;
/** Full animation / animation-duration declarations (may list multiple times). */
const CSS_ANIM_DECL_RE = /animation(?:-duration)?\s*:\s*([^;{}]+)/gi;
const CSS_SEC_RE = /(\d+(?:\.\d+)?)\s*s\b/gi;

/** Longest animation period found in CSS or SMIL (export captures one full loop). */
export function detectAnimationLoopSec(markup: string): number {
  let maxSec = 0;

  for (const m of markup.matchAll(SMIL_DUR_RE)) {
    maxSec = Math.max(maxSec, parseSmilDur(m[1]!));
  }

  let styleMatch: RegExpExecArray | null;
  STYLE_BLOCK_RE.lastIndex = 0;
  while ((styleMatch = STYLE_BLOCK_RE.exec(markup)) !== null) {
    const css = styleMatch[1] ?? "";
    CSS_ANIM_DECL_RE.lastIndex = 0;
    for (const decl of css.matchAll(CSS_ANIM_DECL_RE)) {
      const value = decl[1] ?? "";
      CSS_SEC_RE.lastIndex = 0;
      for (const sec of value.matchAll(CSS_SEC_RE)) {
        maxSec = Math.max(maxSec, parseFloat(sec[1]!));
      }
    }
  }

  if (maxSec <= 0) return 2;
  return Math.min(6, Math.max(2, Math.ceil(maxSec * 10) / 10));
}

function parseSmilDur(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.endsWith("ms")) {
    return parseFloat(trimmed) / 1000;
  }
  if (trimmed.endsWith("s")) {
    return parseFloat(trimmed);
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  return 0;
}
