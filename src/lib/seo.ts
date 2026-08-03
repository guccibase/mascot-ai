import type { Metadata } from "next";
import { PUBLIC_EXAMPLES, type MascotMeta } from "@/lib/mascots";

export const SITE_NAME = "MascotAI";

export const SITE_TAGLINE =
  "Animated SVG mascot studios for web and mobile apps";

export const DEFAULT_DESCRIPTION =
  "Build animated SVG mascots for web and mobile apps. Explore Lyra, Sol, Bud, and Fanous, then generate your own gesture studio.";

const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "MascotAI — animated SVG mascot studios",
} as const;

/** Absolute site origin used for sitemap, robots, and JSON-LD. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function studioPath(slug: string): string {
  return `/studio/${slug}`;
}

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  /** When false, search engines should not index the page. */
  index?: boolean;
  /**
   * Use a fully resolved document title (bypasses the root `%s | Brand`
   * template). Needed for the root page, where the template is not applied.
   */
  absoluteTitle?: boolean;
  /** Defaults to website; use article for blog posts. */
  ogType?: "website" | "article";
  /** Optional OG/Twitter image override (path or absolute URL). */
  image?: { url: string; width?: number; height?: number; alt?: string };
  publishedTime?: string;
  modifiedTime?: string;
};

/** Shared page metadata: relative canonical (via metadataBase), OG, Twitter, robots. */
export function buildPageMetadata({
  title,
  description,
  path,
  index = true,
  absoluteTitle = false,
  ogType = "website",
  image,
  publishedTime,
  modifiedTime,
}: PageMetaInput): Metadata {
  const brandedTitle = absoluteTitle ? `${title} | ${SITE_NAME}` : title;
  const robots = index
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false };

  const ogImage = image
    ? {
        url: image.url,
        width: image.width ?? 1200,
        height: image.height ?? 630,
        alt: image.alt ?? brandedTitle,
      }
    : OG_IMAGE;

  return {
    title: absoluteTitle ? { absolute: brandedTitle } : brandedTitle,
    description,
    // Relative so metadataBase resolves correctly in every environment.
    alternates: { canonical: path === "/" ? "/" : path },
    robots,
    openGraph: {
      title: brandedTitle,
      description,
      url: path === "/" ? "/" : path,
      siteName: SITE_NAME,
      type: ogType,
      locale: "en_US",
      images: [ogImage],
      ...(ogType === "article"
        ? {
            publishedTime,
            modifiedTime: modifiedTime ?? publishedTime,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [ogImage.url],
    },
  };
}

export function studioMetadata(mascot: MascotMeta): Metadata {
  return buildPageMetadata({
    title: `${mascot.name} studio`,
    description: `${mascot.blurb} Interactive animated SVG mascot for ${mascot.product} — ${mascot.poseCount} gestures you can explore live.`,
    path: studioPath(mascot.slug),
  });
}

export function publicSitemapEntries(): Array<{
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
  lastModified?: Date;
}> {
  return [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
    { path: "/marketplace", changeFrequency: "weekly", priority: 0.85 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.85 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
    ...PUBLIC_EXAMPLES.map((mascot) => ({
      path: studioPath(mascot.slug),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
  ];
}

/** Single @graph for the homepage — one script tag, multiple entities. */
export function homeJsonLd() {
  const origin = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: SITE_NAME,
        url: origin,
        logo: absoluteUrl("/brand/icon-512.png"),
        description: SITE_TAGLINE,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: SITE_NAME,
        url: origin,
        description: DEFAULT_DESCRIPTION,
        publisher: { "@id": `${origin}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#app`,
        name: SITE_NAME,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        url: origin,
        description: DEFAULT_DESCRIPTION,
        isPartOf: { "@id": `${origin}/#website` },
        offers: {
          "@type": "Offer",
          url: absoluteUrl("/pricing"),
          priceCurrency: "USD",
          description:
            "Explore live example studios free; paid token plans for generation",
        },
      },
      {
        "@type": "ItemList",
        name: "MascotAI example studios",
        itemListElement: PUBLIC_EXAMPLES.map((mascot, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${mascot.name} studio`,
          url: absoluteUrl(studioPath(mascot.slug)),
          description: mascot.blurb,
        })),
      },
    ],
  };
}

export function studioSoftwareJsonLd(mascot: MascotMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${mascot.name} — ${SITE_NAME} studio`,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: absoluteUrl(studioPath(mascot.slug)),
    description: mascot.blurb,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}
