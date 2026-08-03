import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function localAssetPaths(markdown: string): string[] {
  const matches = markdown.matchAll(/!\[[^\]]*]\((\/[^)\s]+)\)/g);
  return [...matches].map((match) => match[1]!).filter(Boolean);
}

describe("blog assets", () => {
  it("every published post cover and inline local image exists on disk", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);

    for (const meta of posts) {
      if (meta.cover) {
        const coverPath = path.join(PUBLIC_DIR, meta.cover.replace(/^\//, ""));
        expect(fs.existsSync(coverPath), `missing cover ${meta.cover}`).toBe(
          true
        );
      }

      const post = getPostBySlug(meta.slug);
      expect(post).toBeTruthy();
      for (const asset of localAssetPaths(post!.content)) {
        const assetPath = path.join(PUBLIC_DIR, asset.replace(/^\//, ""));
        expect(fs.existsSync(assetPath), `missing ${asset} in ${meta.slug}`).toBe(
          true
        );
      }
    }
  });

  it("rejects path-traversal slugs", () => {
    expect(getPostBySlug("../package")).toBeNull();
    expect(getPostBySlug("..")).toBeNull();
    expect(getPostBySlug("foo/bar")).toBeNull();
  });
});
