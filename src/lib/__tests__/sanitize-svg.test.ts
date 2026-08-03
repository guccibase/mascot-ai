import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "@/lib/sanitize-svg";

describe("sanitizeSvg", () => {
  it("keeps a safe production SVG", () => {
    const input = `<svg viewBox="0 0 420 520" xmlns="http://www.w3.org/2000/svg"><g id="ms-hit"><rect width="10" height="10" fill="transparent"/></g><g class="ms-eyes" data-ms-part="eyes"><circle cx="1" cy="1" r="2"/></g></svg>`;
    const out = sanitizeSvg(input);
    expect(out).toContain("<svg");
    expect(out).toContain('data-ms-part="eyes"');
    expect(out).toContain("ms-hit");
  });

  it("strips script and foreignObject with their contents", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><body onclick="evil()">x</body></foreignObject><circle r="3"/></svg>`;
    const out = sanitizeSvg(input);
    expect(out).not.toContain("script");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("foreignObject");
    expect(out).not.toContain("onclick");
    expect(out).toContain("<circle");
  });

  it("drops event handlers and javascript: URLs", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)" onclick="x()"><path d="M0 0"/></a><image href="https://evil.test/x.png"/></svg>`;
    const out = sanitizeSvg(input);
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("<image");
    expect(out).toContain("<path");
  });

  it("allows fragment hrefs used by gradients", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><rect fill="url(#g)" width="1" height="1"/><use href="#g"/></svg>`;
    const out = sanitizeSvg(input);
    expect(out).toContain('href="#g"');
    expect(out).toContain("linearGradient");
  });

  it("returns empty for non-svg input", () => {
    expect(sanitizeSvg("<div>hi</div>")).toBe("");
    expect(sanitizeSvg("")).toBe("");
  });

  it("repairs unclosed groups so exports stay well-formed", () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg"><g><circle cx="1" cy="1" r="2"/></svg>`;
    const out = sanitizeSvg(broken);
    expect(out).toMatch(/<\/g>\s*<\/svg>$/);
  });

  it("repairs JSON-escaped attribute quotes without bypassing URL filtering", () => {
    const input = String.raw`<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 420 520\"><defs><linearGradient id=\"g\"><stop offset=\"0%\"/></linearGradient></defs><rect x=\"10\" y=\"20\" width=\"40\" height=\"50\" fill=\"url(#g)\"/><use href=\"javascript:alert(1)\"/></svg>`;
    const out = sanitizeSvg(input);

    expect(out).toContain('viewBox="0 0 420 520"');
    expect(out).toContain('offset="0%"');
    expect(out).toContain('x="10"');
    expect(out).toContain('height="50"');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("\\");
  });

  it("does not rewrite escaped quotes in SVG text content", () => {
    const input = String.raw`<svg viewBox=\"0 0 420 520\"><text>Keep \"quoted\" text</text></svg>`;
    const out = sanitizeSvg(input);

    expect(out).toContain(String.raw`Keep \"quoted\" text`);
  });
});
