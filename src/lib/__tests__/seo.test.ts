import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  buildPageMetadata,
  homeJsonLd,
  publicSitemapEntries,
  studioMetadata,
} from "@/lib/seo";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getMascot } from "@/lib/mascots";

describe("seo helpers", () => {
  it("uses the serving host in absolute URLs, robots and sitemap", () => {
    expect(absoluteUrl("/")).toBe("https://www.appmascot.ai/");
    expect(robots().sitemap).toBe("https://www.appmascot.ai/sitemap.xml");
    const urls = sitemap();
    expect(urls.every(({ url }) => url.startsWith("https://www.appmascot.ai/"))).toBe(true);
    expect(urls.find(({ url }) => url.endsWith("/pricing"))?.lastModified).toBeUndefined();
    expect(urls.find(({ url }) => url.endsWith("/why-app-mascots-matter"))?.lastModified)
      .toEqual(new Date("2026-08-02"));
  });

  it("lists only public indexable routes in the sitemap", () => {
    const paths = publicSitemapEntries().map((entry) => entry.path);
    expect(paths).toEqual([
      "/",
      "/pricing",
      "/marketplace",
      "/blog",
      "/privacy",
      "/terms",
      "/studio/lyra",
      "/studio/sol",
      "/studio/bud",
      "/studio/fanous",
    ]);
  });

  it("uses relative canonicals so metadataBase can resolve them", () => {
    const meta = buildPageMetadata({
      title: "Pricing",
      description: "Plans",
      path: "/pricing",
    });
    expect(meta.alternates?.canonical).toBe("/pricing");
  });

  it("marks private pages as noindex", () => {
    const meta = buildPageMetadata({
      title: "Create",
      description: "Private",
      path: "/create",
      index: false,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("supports absolute titles for the root page", () => {
    const meta = buildPageMetadata({
      title: "Give your app a personality",
      description: "Home",
      path: "/",
      absoluteTitle: true,
    });
    expect(meta.title).toEqual({
      absolute: "Give your app a personality | MascotAI",
    });
    expect(meta.openGraph?.title).toBe(
      "Give your app a personality | MascotAI"
    );
  });

  it("builds studio metadata with canonical and social tags", () => {
    const lyra = getMascot("lyra");
    expect(lyra).toBeTruthy();
    const meta = studioMetadata(lyra!);
    expect(meta.title).toBe("Lyra Studio · Animated SVG Mascot");
    expect(meta.alternates?.canonical).toBe("/studio/lyra");
    expect(meta.openGraph?.images).toBeTruthy();
  });

  it("builds a single homepage @graph for lean JSON-LD", () => {
    const graph = homeJsonLd();
    expect(graph["@graph"]).toHaveLength(3);
    const types = graph["@graph"].map(
      (node: { "@type": string }) => node["@type"]
    );
    expect(types).toEqual([
      "Organization",
      "WebSite",
      "ItemList",
    ]);
    const list = graph["@graph"].find(
      (node: { "@type": string }) => node["@type"] === "ItemList"
    ) as { itemListElement: Array<{ url: string }> };
    expect(list.itemListElement).toHaveLength(4);
    expect(list.itemListElement.map((item) => item.url)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/studio\/lyra$/),
        expect.stringMatching(/\/studio\/sol$/),
        expect.stringMatching(/\/studio\/bud$/),
        expect.stringMatching(/\/studio\/fanous$/),
      ])
    );
  });
});

describe("JsonLd serialization", () => {
  it("escapes < to prevent script breakout", async () => {
    const { JsonLd } = await import("@/components/json-ld");
    const element = JsonLd({
      data: { name: "A <script>alert(1)</script> mascot" },
    });
    const html = element.props.dangerouslySetInnerHTML.__html as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("\\u003cscript>");
  });
});
