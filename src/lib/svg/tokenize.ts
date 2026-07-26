/**
 * Quote-aware scanner for SVG markup.
 *
 * Shared by the sanitizer and the remix patcher. Both need to walk markup
 * element by element without a DOM, and the remix patcher additionally needs
 * to put it back together byte-for-byte: tokens carry their original `raw`
 * text, so any element left untouched is re-emitted exactly as it arrived.
 */

export type Token =
  | { kind: "text"; value: string }
  | {
      kind: "tag";
      raw: string;
      name: string;
      /** Original casing from the source markup. */
      rawName: string;
      closing: boolean;
      selfClosing: boolean;
      attrs: string;
    };

/** Scan markup into text/tag tokens, respecting quoted attribute values. */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      tokens.push({ kind: "text", value: input.slice(i) });
      break;
    }
    if (lt > i) tokens.push({ kind: "text", value: input.slice(i, lt) });

    // Comments, CDATA, doctype: skip entirely
    if (input.startsWith("<!--", lt)) {
      const end = input.indexOf("-->", lt + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith("<![CDATA[", lt)) {
      const end = input.indexOf("]]>", lt + 9);
      const value = input.slice(lt + 9, end === -1 ? input.length : end);
      tokens.push({ kind: "text", value });
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith("<!", lt) || input.startsWith("<?", lt)) {
      const end = input.indexOf(">", lt);
      i = end === -1 ? input.length : end + 1;
      continue;
    }

    // Read to the closing '>' that sits outside quotes
    let j = lt + 1;
    let quote: string | null = null;
    while (j < input.length) {
      const ch = input[j]!;
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      j++;
    }
    if (j >= input.length) {
      break;
    }

    const raw = input.slice(lt, j + 1);
    const inner = input.slice(lt + 1, j).trim();
    const closing = inner.startsWith("/");
    const selfClosing = inner.endsWith("/");
    const body = inner.replace(/^\//, "").replace(/\/$/, "").trim();
    const nameMatch = body.match(/^([A-Za-z_:][-A-Za-z0-9_:.]*)/);
    const rawName = nameMatch?.[1] ?? "";
    const name = rawName.toLowerCase();
    const attrs = body.slice(rawName.length);

    tokens.push({
      kind: "tag",
      raw,
      name,
      rawName,
      closing,
      selfClosing,
      attrs,
    });
    i = j + 1;
  }

  return tokens;
}

const ATTR_RE = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

/** Parse a tag's attribute string into a plain map, lowercasing names. */
export function parseAttrs(attrs: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(attrs))) {
    out[m[1]!.toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return out;
}

function escapeAttrValue(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Rewrite a single attribute inside a raw tag, preserving every other byte.
 * Adds the attribute when it is missing, removes it when `value` is null.
 */
export function setRawAttr(
  raw: string,
  name: string,
  value: string | null
): string {
  const pattern = new RegExp(
    `\\s${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'>]+)`,
    "i"
  );

  if (value === null) return raw.replace(pattern, "");
  if (pattern.test(raw)) {
    return raw.replace(pattern, ` ${name}="${escapeAttrValue(value)}"`);
  }

  // Insert before the tag close, keeping any self-closing slash in place.
  return raw.replace(
    /\s*(\/?)>$/,
    (_full, slash: string) => ` ${name}="${escapeAttrValue(value)}"${slash ? " /" : ""}>`
  );
}
