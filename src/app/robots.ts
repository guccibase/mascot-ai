import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
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
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
