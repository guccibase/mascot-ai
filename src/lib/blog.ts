import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export { blogPath, formatBlogDate, isSvgAsset } from "@/lib/blog-utils";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BLOG_CATEGORIES = ["guide", "review", "product"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type BlogMetric = {
  label: string;
  value: string;
};

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  cover?: string;
  coverAlt?: string;
  category: BlogCategory;
  tags: string[];
  draft: boolean;
  /** Review posts only — app being discussed. */
  app?: string;
  /** Review posts only — mascot name. */
  mascot?: string;
  metrics?: BlogMetric[];
};

export type BlogPost = BlogPostMeta & {
  content: string;
};

function isBlogCategory(value: unknown): value is BlogCategory {
  return (
    typeof value === "string" &&
    (BLOG_CATEGORIES as readonly string[]).includes(value)
  );
}

function asString(value: unknown, field: string, slug: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Blog post "${slug}" is missing required field: ${field}`);
  }
  return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  return value.trim();
}

function asMetrics(value: unknown, slug: string): BlogMetric[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Blog post "${slug}" has invalid metrics (expected array)`);
  }
  return value.map((item, index) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as BlogMetric).label !== "string" ||
      typeof (item as BlogMetric).value !== "string"
    ) {
      throw new Error(`Blog post "${slug}" has invalid metrics[${index}]`);
    }
    return {
      label: (item as BlogMetric).label.trim(),
      value: (item as BlogMetric).value.trim(),
    };
  });
}

function parsePostFile(filename: string): BlogPost {
  const slug = filename.replace(/\.md$/, "");
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Blog filename "${filename}" must be a lowercase kebab-case slug.md`
    );
  }

  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
  const { data, content } = matter(raw);

  if (!isBlogCategory(data.category)) {
    throw new Error(
      `Blog post "${slug}" needs category: guide | review | product`
    );
  }

  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  const date = asString(data.date, "date", slug);
  if (Number.isNaN(Date.parse(date))) {
    throw new Error(`Blog post "${slug}" has invalid date: ${date}`);
  }

  const updated = asOptionalString(data.updated);
  if (updated && Number.isNaN(Date.parse(updated))) {
    throw new Error(`Blog post "${slug}" has invalid updated: ${updated}`);
  }

  return {
    slug,
    title: asString(data.title, "title", slug),
    description: asString(data.description, "description", slug),
    date,
    updated,
    cover: asOptionalString(data.cover),
    coverAlt: asOptionalString(data.coverAlt),
    category: data.category,
    tags,
    draft: data.draft === true,
    app: asOptionalString(data.app),
    mascot: asOptionalString(data.mascot),
    metrics: asMetrics(data.metrics, slug),
    content: content.trim(),
  };
}

function listMarkdownFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"));
}

function toMeta(post: BlogPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    updated: post.updated,
    cover: post.cover,
    coverAlt: post.coverAlt,
    category: post.category,
    tags: post.tags,
    draft: post.draft,
    app: post.app,
    mascot: post.mascot,
    metrics: post.metrics,
  };
}

/** All published posts, newest first. Drafts are excluded. */
export function getAllPosts(): BlogPostMeta[] {
  return listMarkdownFiles()
    .map((filename) => toMeta(parsePostFile(filename)))
    .filter((post) => !post.draft)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export function getPostBySlug(slug: string): BlogPost | null {
  // Reject path traversal / invalid slugs before touching the filesystem.
  if (!SLUG_RE.test(slug)) return null;
  const filename = `${slug}.md`;
  const fullPath = path.resolve(BLOG_DIR, filename);
  if (!fullPath.startsWith(path.resolve(BLOG_DIR) + path.sep)) return null;
  if (!fs.existsSync(fullPath)) return null;
  const post = parsePostFile(filename);
  if (post.draft) return null;
  return post;
}

export function categoryLabel(category: BlogCategory): string {
  switch (category) {
    case "guide":
      return "Guide";
    case "review":
      return "App review";
    case "product":
      return "Product";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}
