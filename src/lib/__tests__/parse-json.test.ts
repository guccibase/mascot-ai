import { describe, expect, it } from "vitest";
import { parseJsonObject } from "@/lib/parse-json";

describe("parseJsonObject", () => {
  it("parses clean JSON", () => {
    const out = parseJsonObject('{"key":"idle","svg":"<svg></svg>"}') as {
      key: string;
    };
    expect(out.key).toBe("idle");
  });

  it("strips markdown fences", () => {
    const out = parseJsonObject(
      '```json\n{"key":"wave","svg":"<svg></svg>"}\n```'
    ) as { key: string };
    expect(out.key).toBe("wave");
  });

  it("salvages SVG when quotes inside the path break JSON", () => {
    const broken = `{"key":"idle","label":"Idle","svg":"<svg><g id="ms-hit"><path d="M0 0"/></g></svg>"}`;
    const out = parseJsonObject(broken) as { key?: string; svg: string };
    expect(out.svg).toContain("<svg");
    expect(out.svg).toContain("ms-hit");
    expect(out.key).toBe("idle");
  });

  it("preserves sample titles when salvaging a samples pack", () => {
    const broken = `{"samples":[{"id":"a","title":"Moss Fox","rationale":"Soft","svg":"<svg><circle r="3"/></svg>"},{"id":"b","title":"Lantern Fox","rationale":"Warm","svg":"<svg><rect width="1" height="1"/></svg>"}]}`;
    const out = parseJsonObject(broken) as {
      samples: Array<{ id: string; title: string; svg: string }>;
    };
    expect(out.samples).toHaveLength(2);
    expect(out.samples[0]!.title).toBe("Moss Fox");
    expect(out.samples[1]!.title).toBe("Lantern Fox");
    expect(out.samples[0]!.svg).toContain("<svg");
  });
});
