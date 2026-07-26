import { parseAttrs, setRawAttr, tokenize, type Token } from "@/lib/svg/tokenize";
import { findAllTokenIndicesById } from "./element-index";
import type { RemixEdit } from "./types";

const PROTECTED_TAGS = new Set([
  "animate",
  "animatetransform",
  "animatemotion",
  "set",
  "style",
]);

const PATH_CMD = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/;

function isValidPathD(d: string): boolean {
  if (d.length < 2 || d.length > 8000) return false;
  return PATH_CMD.test(d);
}

/** Rough bbox drift check. Reject edits that change path length wildly. */
function pathDriftOk(before: string, after: string): boolean {
  const ratio = after.length / Math.max(before.length, 1);
  return ratio >= 0.35 && ratio <= 2.8;
}

export type PatchResult = {
  svg: string;
  applied: number;
  skipped: string[];
};

function applyEditToToken(raw: string, edit: RemixEdit): string | null {
  let out = raw;
  if (edit.d !== undefined) {
    const attrs = parseAttrs(raw);
    const before = attrs.d ?? "";
    if (!isValidPathD(edit.d) || !pathDriftOk(before, edit.d)) return null;
    out = setRawAttr(out, "d", edit.d);
  }
  if (edit.fill !== undefined) {
    out = setRawAttr(out, "fill", edit.fill);
  }
  if (edit.stroke !== undefined) {
    out = setRawAttr(out, "stroke", edit.stroke);
  }
  if (edit.part) {
    out = setRawAttr(out, "data-ms-part", edit.part);
  }
  return out;
}

/** Apply model edits to indexed SVG tokens. Unknown ids are ignored. */
export function applyEdits(svg: string, edits: RemixEdit[]): PatchResult {
  const tokens = tokenize(svg);
  const skipped: string[] = [];
  let applied = 0;

  for (const edit of edits) {
    if (!edit?.id) continue;
    const indices = findAllTokenIndicesById(tokens, edit.id);
    if (indices.length === 0) {
      skipped.push(`unknown id ${edit.id}`);
      continue;
    }

    for (const idx of indices) {
      const token = tokens[idx]!;
      if (token.kind !== "tag") continue;

      const next = applyEditToToken(token.raw, edit);
      if (!next) {
        skipped.push(`rejected edit for ${edit.id}`);
        continue;
      }
      token.raw = next;
      applied++;
    }
  }

  const out = tokens.map((t) => (t.kind === "tag" ? t.raw : t.value)).join("");
  return { svg: out, applied, skipped };
}

/**
 * Assert animation/style/viewBox tokens are byte-identical before and after.
 * Returns false when a protected region was touched.
 */
export function preservationGate(before: string, after: string): boolean {
  const a = tokenize(before);
  const b = tokenize(after);

  const protectedSlice = (tokens: Token[]) =>
    tokens
      .filter(
        (t) =>
          t.kind === "tag" &&
          (PROTECTED_TAGS.has(t.name) ||
            (t.name === "svg" && /viewBox/i.test(t.attrs)))
      )
      .map((t) => (t.kind === "tag" ? t.raw : ""))
      .join("\n");

  return protectedSlice(a) === protectedSlice(b);
}

/** Merge shared + pose-specific edits, deduping by id (pose wins). */
export function mergeEdits(shared: RemixEdit[], pose: RemixEdit[]): RemixEdit[] {
  const byId = new Map<string, RemixEdit>();
  for (const e of shared) byId.set(e.id, e);
  for (const e of pose) {
    const prev = byId.get(e.id);
    byId.set(e.id, prev ? { ...prev, ...e } : e);
  }
  return [...byId.values()];
}
