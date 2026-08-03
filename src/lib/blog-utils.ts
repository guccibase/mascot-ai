/** Client-safe blog helpers (no Node.js filesystem APIs). */

export function blogPath(slug?: string): string {
  return slug ? `/blog/${slug}` : "/blog";
}

/** Covers/figures served as SVG use <img>, not next/image. */
export function isSvgAsset(src: string): boolean {
  return /\.svg(?:$|\?)/i.test(src);
}

export function formatBlogDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}

export function toBlogIsoDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}
