import { describe, expect, it } from "vitest";
import {
  blogPath,
  categoryLabel,
  formatBlogDate,
  getAllPosts,
  getPostBySlug,
  getPostSlugs,
} from "@/lib/blog";
import { blogSitemapEntries } from "@/lib/blog-seo";

describe("blog content", () => {
  it("lists published posts newest-first with required fields", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(5);
    expect(posts.every((post) => !post.draft)).toBe(true);
    expect(posts.every((post) => post.title && post.description)).toBe(true);

    for (let i = 1; i < posts.length; i++) {
      expect(Date.parse(posts[i - 1]!.date)).toBeGreaterThanOrEqual(
        Date.parse(posts[i]!.date)
      );
    }
  });

  it("loads a post by slug including markdown body", () => {
    const post = getPostBySlug("why-app-mascots-matter");
    expect(post).toBeTruthy();
    expect(post!.slug).toBe("why-app-mascots-matter");
    expect(post!.category).toBe("guide");
    expect(post!.content.length).toBeGreaterThan(200);
    expect(post!.content.startsWith("#")).toBe(false);
  });

  it("returns null for missing or invalid slugs", () => {
    expect(getPostBySlug("does-not-exist")).toBeNull();
    expect(getPostBySlug("../package")).toBeNull();
    expect(getPostBySlug("foo/bar")).toBeNull();
  });

  it("exposes review metadata for app reviews", () => {
    const duo = getPostBySlug("duolingo-duo-mascot-review");
    expect(duo?.app).toBe("Duolingo");
    expect(duo?.mascot).toBe("Duo");
    expect(duo?.metrics?.length).toBeGreaterThan(0);
  });

  it("keeps slug helpers stable", () => {
    expect(blogPath()).toBe("/blog");
    expect(blogPath("introducing-mascotai")).toBe(
      "/blog/introducing-mascotai"
    );
    expect(getPostSlugs()).toEqual(getAllPosts().map((post) => post.slug));
    expect(categoryLabel("review")).toBe("App review");
    expect(formatBlogDate("2026-08-02")).toBe("August 2, 2026");
  });

  it("emits sitemap entries for every published post", () => {
    const entries = blogSitemapEntries();
    expect(entries.length).toBe(getAllPosts().length);
    expect(entries.map((entry) => entry.path)).toContain(
      "/blog/duolingo-duo-mascot-review"
    );
  });
});
