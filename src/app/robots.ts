import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/create",
          "/library",
          "/onboarding",
          "/remix/",
          "/sign-in",
          "/sign-up",
          "/account",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    // Hostname only — Yandex Host directive; Google ignores this field.
    host: new URL(origin).host,
  };
}
