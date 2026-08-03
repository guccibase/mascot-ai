import type { MetadataRoute } from "next";
import { blogSitemapEntries } from "@/lib/blog-seo";
import { absoluteUrl, publicSitemapEntries } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const fallbackModified = new Date();
  const entries = [...publicSitemapEntries(), ...blogSitemapEntries()];
  return entries.map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: entry.lastModified ?? fallbackModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
