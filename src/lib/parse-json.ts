/** Strip markdown fences and extract the outermost JSON object/array. */
export function parseJsonObject(raw: string): unknown {
  let text = raw.trim();
  if (!text) throw new Error("Empty model output");

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  const attempts = [text];
  const startObj = text.indexOf("{");
  const endObj = text.lastIndexOf("}");
  if (startObj >= 0 && endObj > startObj) {
    attempts.push(text.slice(startObj, endObj + 1));
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (err) {
      lastError = err;
    }
  }

  // Salvage gesture/sample packs when SVG quotes break JSON.parse
  const salvaged = salvageJsonWithSvg(text);
  if (salvaged) return salvaged;

  const msg =
    lastError instanceof Error ? lastError.message : "Invalid JSON";
  const preview = text.slice(0, 180).replace(/\s+/g, " ");
  throw new Error(`${msg} (len=${text.length}, preview="${preview}…")`);
}

/**
 * When models emit raw SVG inside JSON without escaping quotes, rebuild a
 * minimal object by pulling the <svg>…</svg> blob out and JSON-stringifying it.
 */
function salvageJsonWithSvg(text: string): Record<string, unknown> | null {
  const svgMatch = text.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (!svgMatch) return null;

  const svg = svgMatch[0];
  const before = text.slice(0, svgMatch.index ?? 0);

  const readString = (key: string) => {
    const m = before.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
    return m?.[1] ? unescapeJsonString(m[1]) : undefined;
  };
  const readBool = (key: string) => {
    const m = before.match(new RegExp(`"${key}"\\s*:\\s*(true|false)`));
    return m?.[1] === "true" ? true : m?.[1] === "false" ? false : undefined;
  };
  const readNum = (key: string) => {
    const m = before.match(new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`));
    return m?.[1] != null ? Number(m[1]) : undefined;
  };

  const key = readString("key");
  const out: Record<string, unknown> = { svg };
  if (key) out.key = key;
  for (const k of ["label", "cat", "tip", "use", "title", "rationale", "id"] as const) {
    const v = readString(k);
    if (v != null) out[k] = v;
  }
  const track = readBool("track");
  if (track != null) out.track = track;
  const delight = readBool("delight");
  if (delight != null) out.delight = delight;
  const signal = readNum("signal");
  if (signal != null) out.signal = signal;

  // samples pack: multiple svgs. Preserve nearby title/rationale/id when possible
  if (!key && /"samples"\s*:/.test(text)) {
    const samples: Array<Record<string, unknown>> = [];
    const re = /<svg\b[\s\S]*?<\/svg>/gi;
    let m: RegExpExecArray | null;
    let i = 0;
    let searchFrom = 0;
    while ((m = re.exec(text)) && i < 3) {
      const svgStart = m.index;
      const chunk = text.slice(searchFrom, svgStart);
      const id =
        chunk.match(/"id"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1] ??
        ["a", "b", "c"][i]!;
      const titleRaw = chunk.match(/"title"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
      const rationaleRaw = chunk.match(
        /"rationale"\s*:\s*"((?:\\.|[^"\\])*)"/
      )?.[1];
      samples.push({
        id: unescapeJsonString(id),
        title: titleRaw
          ? unescapeJsonString(titleRaw)
          : `Look ${["A", "B", "C"][i]}`,
        rationale: rationaleRaw ? unescapeJsonString(rationaleRaw) : "",
        svg: m[0],
      });
      searchFrom = (m.index ?? 0) + m[0].length;
      i++;
    }
    if (samples.length >= 1) return { samples };
  }

  return out;
}

function unescapeJsonString(s: string) {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}
