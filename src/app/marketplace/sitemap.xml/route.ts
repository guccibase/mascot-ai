import { fetchQuery } from "convex/nextjs";
import type { FunctionReturnType } from "convex/server";
import { absoluteUrl } from "@/lib/seo";
import { api } from "../../../../convex/_generated/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const slugs = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;

  try {
    while (true) {
      const result: FunctionReturnType<typeof api.marketplace.listAvailable> =
        await fetchQuery(api.marketplace.listAvailable, {
          paginationOpts: { cursor, numItems: 12 },
        });
      for (const { slug } of result.page) slugs.add(slug);
      if (result.isDone) break;
      cursor = result.continueCursor;
      if (!cursor || cursors.has(cursor)) {
        throw new Error("Marketplace sitemap pagination did not advance");
      }
      cursors.add(cursor);
    }
  } catch (error) {
    console.error("Could not build the marketplace sitemap", error);
    return new Response("Marketplace sitemap temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }

  const entries = [...slugs].map((slug) => {
    const url = absoluteUrl(`/marketplace/${encodeURIComponent(slug)}`);
    return `  <url><loc>${url}</loc></url>`;
  });
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
