import { tokenize } from "@/lib/svg/tokenize";

type OpenTag = { name: string; rawName: string };

/**
 * Balance mismatched / unclosed SVG tags so strict XML parsers (Sharp/libvips)
 * can rasterize model-authored markup that browsers still paint.
 */
export function repairSvgStructure(input: string): string {
  if (typeof input !== "string" || !input.includes("<svg")) return input;

  const tokens = tokenize(input);
  const out: string[] = [];
  const stack: OpenTag[] = [];

  for (const token of tokens) {
    if (token.kind === "text") {
      out.push(token.value);
      continue;
    }

    const { name, rawName, closing, selfClosing, raw } = token;

    if (selfClosing) {
      out.push(raw);
      continue;
    }

    if (closing) {
      if (stack.length === 0) continue;

      let matchIdx = stack.length - 1;
      while (matchIdx >= 0 && stack[matchIdx]!.name !== name) matchIdx--;

      if (matchIdx < 0) continue;

      while (stack.length - 1 > matchIdx) {
        const popped = stack.pop()!;
        out.push(`</${popped.rawName}>`);
      }

      stack.pop();
      out.push(`</${rawName}>`);
      continue;
    }

    stack.push({ name, rawName });
    out.push(raw);
  }

  while (stack.length > 0) {
    const popped = stack.pop()!;
    out.push(`</${popped.rawName}>`);
  }

  return out.join("").trim();
}
