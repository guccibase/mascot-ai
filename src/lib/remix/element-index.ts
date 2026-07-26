import { parseAttrs, tokenize, type Token } from "@/lib/svg/tokenize";
import { contentId } from "./hash";
import type { IndexedElement, ManifestRow } from "./types";

const PAINTABLE = new Set([
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "g",
]);

const GEOM_ATTRS = [
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "width",
  "height",
  "points",
  "transform",
] as const;

function classFromAttrs(attrs: Record<string, string>): string {
  const cls = attrs.class ?? attrs.classname ?? "";
  return cls.trim();
}

function geomSignature(tag: string, attrs: Record<string, string>): string {
  const parts = [tag];
  for (const key of GEOM_ATTRS) {
    const v = attrs[key];
    if (v) parts.push(`${key}=${v}`);
  }
  return parts.join("|");
}

function paintSignature(attrs: Record<string, string>): { fill?: string; stroke?: string } {
  const fill = attrs.fill;
  const stroke = attrs.stroke;
  return {
    fill: fill && fill !== "none" ? fill : undefined,
    stroke: stroke && stroke !== "none" ? stroke : undefined,
  };
}

function isPaintable(tag: string, attrs: Record<string, string>): boolean {
  if (!PAINTABLE.has(tag)) return false;
  if (tag === "g") {
    return Boolean(
      attrs.fill ||
        attrs.stroke ||
        attrs["fill-opacity"] ||
        attrs["stroke-width"]
    );
  }
  return true;
}

type StackFrame = { classes: string[] };

/**
 * Walk SVG tokens and index paintable elements with stable content ids.
 * Injects `data-ms-id` into opening tags so later patch passes can find them.
 */
export function indexSvg(svg: string): { svg: string; elements: IndexedElement[] } {
  const tokens = tokenize(svg);
  const elements: IndexedElement[] = [];
  const stack: StackFrame[] = [{ classes: [] }];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind !== "tag") continue;

    const { name, closing, selfClosing, attrs: attrStr, raw } = token;
    const attrs = parseAttrs(attrStr);
    const cls = classFromAttrs(attrs);
    const frame = stack[stack.length - 1]!;

    if (closing) {
      stack.pop();
      continue;
    }

    const ancestorClasses = frame.classes.filter(Boolean).join(" ");
    const ownClasses = cls ? [...frame.classes, cls].filter(Boolean) : frame.classes;
    if (!selfClosing) {
      stack.push({ classes: ownClasses });
    }

    if (!isPaintable(name, attrs)) continue;

    const geom = geomSignature(name, attrs);
    const paint = paintSignature(attrs);
    // Geometry-only id: the same path data is one editable shape across poses
    // even when parent gesture classes differ.
    const id = contentId([name, geom]);

    elements.push({
      id,
      tokenIndex: i,
      tag: name,
      fill: paint.fill,
      stroke: paint.stroke,
      geom,
      ancestorClasses,
      shared: false,
    });

    if (!raw.includes("data-ms-id=")) {
      token.raw = raw.replace(/\s*\/?>$/, (m) => ` data-ms-id="${id}"${m}`);
    }
  }

  const out = tokens
    .map((t) => (t.kind === "tag" ? t.raw : t.value))
    .join("");

  return { svg: out, elements };
}

/** Compact manifest rows for the model. Geometry truncated to save tokens. */
export function toManifestRows(elements: IndexedElement[]): ManifestRow[] {
  return elements.map((el) => ({
    id: el.id,
    tag: el.tag,
    fill: el.fill,
    stroke: el.stroke,
    geom: el.geom.length > 120 ? `${el.geom.slice(0, 117)}…` : el.geom,
  }));
}

/** Find all opening tags with the given data-ms-id. */
export function findAllTokenIndicesById(tokens: Token[], id: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t?.kind !== "tag" || t.closing) continue;
    const attrs = parseAttrs(t.attrs);
    if (attrs["data-ms-id"] === id) indices.push(i);
  }
  return indices;
}

/** Find a token's opening tag by data-ms-id without re-indexing. */
export function findTokenById(tokens: Token[], id: string): number {
  const [first] = findAllTokenIndicesById(tokens, id);
  return first ?? -1;
}
