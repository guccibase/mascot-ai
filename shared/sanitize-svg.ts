/**
 * Whitelist sanitizer for model-authored SVG.
 *
 * Model output is untrusted markup that we mount with innerHTML, so it has to
 * be scrubbed before it ever reaches the DOM or an export file. Pure string
 * logic (no DOM) so the same pass runs in route handlers and in the browser.
 */

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "defs",
  "style",
  "title",
  "desc",
  "symbol",
  "use",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textpath",
  "clippath",
  "mask",
  "pattern",
  "marker",
  "lineargradient",
  "radialgradient",
  "stop",
  "filter",
  "feblend",
  "fecolormatrix",
  "fecomponenttransfer",
  "fecomposite",
  "feconvolvematrix",
  "fediffuselighting",
  "fedisplacementmap",
  "fedropshadow",
  "feflood",
  "fefunca",
  "fefuncb",
  "fefuncg",
  "fefuncr",
  "fegaussianblur",
  "feimage",
  "femerge",
  "femergenode",
  "femorphology",
  "feoffset",
  "fepointlight",
  "fespecularlighting",
  "fespotlight",
  "fetile",
  "feturbulence",
  "animate",
  "animatetransform",
  "animatemotion",
  "mpath",
  "set",
]);

/** Dropped along with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "annotation-xml",
  "audio",
  "video",
  "handler",
  "link",
  "meta",
  "base",
  "image",
]);

const URL_ATTRS = new Set(["href", "xlink:href", "src", "from", "to", "values"]);

const DANGEROUS_CSS = /@import|expression\s*\(|javascript:|behavior\s*:|-moz-binding/gi;

type Token =
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
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      tokens.push({ kind: "text", value: input.slice(i) });
      break;
    }
    if (lt > i) tokens.push({ kind: "text", value: input.slice(i, lt) });

    // Comments, CDATA, doctype — skip entirely
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

function isSafeUrl(value: string): boolean {
  const v = value.trim();
  // Only same-document references (gradients, filters, SMIL targets)
  if (v.startsWith("#")) return true;
  return false;
}

function sanitizeStyleValue(value: string): string | null {
  if (DANGEROUS_CSS.test(value)) {
    DANGEROUS_CSS.lastIndex = 0;
    return null;
  }
  DANGEROUS_CSS.lastIndex = 0;
  // Allow url(#fragment) only
  const badUrl = /url\(\s*['"]?(?!#)/i.test(value);
  return badUrl ? null : value;
}

function sanitizeAttrs(attrs: string, tagName: string): string {
  const out: string[] = [];
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(attrs))) {
    const name = m[1]!.toLowerCase();
    const value = m[3] ?? m[4] ?? m[5] ?? "";

    // Event handlers of any kind
    if (name.startsWith("on")) continue;
    // Namespace/scripting escape hatches
    if (name === "xmlns:xlink" || name === "xmlns") {
      out.push(`${m[1]}="${escapeAttr(value)}"`);
      continue;
    }
    if (URL_ATTRS.has(name)) {
      // SMIL from/to/values are only URLs on animateMotion-ish elements;
      // treat them as plain values elsewhere.
      const isUrlContext =
        name === "href" || name === "xlink:href" || name === "src";
      if (isUrlContext && !isSafeUrl(value)) continue;
      out.push(`${m[1]}="${escapeAttr(value)}"`);
      continue;
    }
    if (name === "style") {
      const safe = sanitizeStyleValue(value);
      if (safe === null) continue;
      out.push(`style="${escapeAttr(safe)}"`);
      continue;
    }
    if (name === "begin" || name === "end") {
      // SMIL event syntax like "ms-hit.click" is fine; block script-ish values
      if (/javascript:/i.test(value)) continue;
      out.push(`${m[1]}="${escapeAttr(value)}"`);
      continue;
    }
    if (/javascript:/i.test(value)) continue;

    out.push(`${m[1]}="${escapeAttr(value)}"`);
    void tagName;
  }

  return out.length ? ` ${out.join(" ")}` : "";
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeCssText(css: string): string {
  let out = css.replace(DANGEROUS_CSS, "");
  DANGEROUS_CSS.lastIndex = 0;
  out = out.replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, "none");
  return out;
}

/**
 * Returns sanitized SVG markup, or an empty string when nothing salvageable
 * remains. Callers should treat "" as a generation failure.
 */
export function sanitizeSvg(input: string): string {
  if (typeof input !== "string" || !input.includes("<svg")) return "";

  const tokens = tokenize(input);
  const pieces: string[] = [];

  let dropDepth = 0;
  let dropName: string | null = null;
  let inStyle = false;

  for (const token of tokens) {
    if (token.kind === "text") {
      if (dropDepth > 0) continue;
      pieces.push(inStyle ? sanitizeCssText(token.value) : token.value);
      continue;
    }

    const { name, rawName, closing, selfClosing, attrs } = token;
    const outName = rawName || name;

    if (dropDepth > 0) {
      if (name === dropName) {
        if (closing) dropDepth--;
        else if (!selfClosing) dropDepth++;
        if (dropDepth === 0) dropName = null;
      }
      continue;
    }

    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !selfClosing) {
        dropDepth = 1;
        dropName = name;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(name)) {
      // Unknown element: unwrap (drop the tag, keep any children)
      continue;
    }

    if (name === "style") inStyle = !closing;

    if (closing) {
      pieces.push(`</${outName}>`);
    } else {
      pieces.push(
        `<${outName}${sanitizeAttrs(attrs, name)}${selfClosing ? "/" : ""}>`
      );
    }
  }

  const out = pieces.join("").trim();
  return out.includes("<svg") ? out : "";
}

/** Sanitize and throw a descriptive error when the SVG is unusable. */
export function sanitizeSvgOrThrow(input: string, label: string): string {
  const out = sanitizeSvg(input);
  if (!out) throw new Error(`Unsafe or empty SVG for ${label}`);
  return out;
}
