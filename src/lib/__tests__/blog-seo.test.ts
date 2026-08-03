import { describe, expect, it } from "vitest";
import { getPostBySlug } from "@/lib/blog";
import { blogPostMetadata, blogPostingJsonLd } from "@/lib/blog-seo";

describe("blog SEO", () => {
  it("emits article metadata with ISO timestamps and cover image", () => {
    const post = getPostBySlug("duolingo-duo-mascot-review");
    expect(post).toBeTruthy();

    const meta = blogPostMetadata(post!);
    expect(meta.openGraph?.type).toBe("article");
    expect(meta.openGraph?.publishedTime).toBe("2026-08-01T00:00:00.000Z");
    expect(meta.openGraph?.modifiedTime).toBe("2026-08-02T00:00:00.000Z");
    expect(meta.alternates?.canonical).toBe(
      "/blog/duolingo-duo-mascot-review"
    );
    expect(meta.openGraph?.images?.[0]).toMatchObject({
      url: "/blog/figures/duolingo/duo-notifications-cover.png",
    });
  });

  it("serializes BlogPosting JSON-LD with ISO dates", () => {
    const post = getPostBySlug("why-app-mascots-matter");
    expect(post).toBeTruthy();

    const jsonLd = blogPostingJsonLd(post!);
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.datePublished).toBe("2026-07-28T00:00:00.000Z");
    expect(jsonLd.dateModified).toBe("2026-08-02T00:00:00.000Z");
    expect(jsonLd.url).toMatch(/\/blog\/why-app-mascots-matter$/);
  });
});
