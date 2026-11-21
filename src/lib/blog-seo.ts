import type { Metadata } from "next";
import { getAllPosts, type BlogPostMeta } from "@/lib/blog";
import { toBlogIsoDate } from "@/lib/blog-utils";
import {
  absoluteUrl,
  buildPageMetadata,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

/** Server-only blog SEO helpers (reads the filesystem via `@/lib/blog`). */

export function blogSitemapEntries(): Array<{
  path: string;
  changeFrequency: "monthly";
  priority: number;
  lastModified: Date;
}> {
  return getAllPosts().map((post) => ({
    path: `/blog/${post.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
    lastModified: new Date(`${post.updated ?? post.date}T00:00:00.000Z`),
  }));
}

export function blogPostMetadata(post: BlogPostMeta): Metadata {
  return buildPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogType: "article",
    publishedTime: toBlogIsoDate(post.date),
    modifiedTime: toBlogIsoDate(post.updated ?? post.date),
    image: post.cover
      ? {
          url: post.cover,
          alt: post.coverAlt ?? post.title,
        }
      : undefined,
  });
}

export function blogPostingJsonLd(post: BlogPostMeta) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: toBlogIsoDate(post.date),
    dateModified: toBlogIsoDate(post.updated ?? post.date),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: post.cover
      ? [absoluteUrl(post.cover)]
      : [absoluteUrl("/opengraph-image.png")],
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl(),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl(),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/brand/icon-512.png"),
      },
    },
    isPartOf: {
      "@type": "Blog",
      "@id": `${SITE_URL}/blog#blog`,
      name: `${SITE_NAME} Blog`,
      url: absoluteUrl("/blog"),
    },
  };
}

export function blogIndexJsonLd(posts: BlogPostMeta[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: `${SITE_NAME} Blog`,
    description:
      "App mascot reviews and guides: how characters help products earn downloads, retention, and revenue.",
    url: absoluteUrl("/blog"),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl(),
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: toBlogIsoDate(post.date),
      description: post.description,
    })),
  };
}
