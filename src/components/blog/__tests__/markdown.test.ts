import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogMarkdown } from "@/components/blog/markdown";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

function renderMarkdown(content: string): string {
  return renderToStaticMarkup(
    createElement(BlogMarkdown, { content })
  );
}

describe("BlogMarkdown", () => {
  it("does not nest figures inside paragraphs (hydration-safe HTML)", () => {
    const html = renderMarkdown(
      [
        "Intro paragraph.",
        "",
        "![Alt text](/blog/figures/mascotai-before-after-1x1.png)",
        "",
        "Follow-up paragraph.",
      ].join("\n")
    );

    expect(html).not.toMatch(/<p[^>]*>\s*<figure/);
    expect(html).toContain("<figure");
    expect(html).toContain("Intro paragraph.");
    expect(html).toContain("Follow-up paragraph.");
  });

  it("renders every published post without p>figure nesting", () => {
    for (const meta of getAllPosts()) {
      const post = getPostBySlug(meta.slug);
      expect(post).toBeTruthy();
      const html = renderMarkdown(post!.content);
      expect(html, meta.slug).not.toMatch(/<p[^>]*>\s*<figure/);
    }
  });
});
