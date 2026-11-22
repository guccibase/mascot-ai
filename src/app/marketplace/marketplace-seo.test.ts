import { fetchQuery } from "convex/nextjs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarketplaceListingPage, { generateMetadata } from "./[slug]/page";
import MarketplacePage from "./page";

vi.mock("convex/nextjs", () => ({ fetchQuery: vi.fn() }));
vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  usePaginatedQuery: () => ({ status: "LoadingFirstPage", results: [] }),
  useQuery: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: false }) }));
vi.mock("@/components/generated-studio", () => ({ GeneratedStudio: () => null }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => null }));

const fetchPublicListings = vi.mocked(fetchQuery);
const listing = {
  _id: "listing-1",
  slug: "test-mascot",
  name: "Test Mascot",
  tagline: "A mascot for a product demo",
  description: "An animated companion for your onboarding flow.",
  category: "productivity",
  accent: "#ffac38",
  gestureCount: 6,
  previewSvg: "<svg id=\"browser-preview\"/>",
  pack: { fixture: "interactive-pack-data" },
};

const listingProps = () => ({ params: Promise.resolve({ slug: listing.slug }) });

describe("Marketplace search rendering", () => {
  beforeEach(() => {
    fetchPublicListings.mockReset();
  });

  it("renders the first page of listing links before the browser subscribes", async () => {
    fetchPublicListings.mockResolvedValue({ page: [listing] });

    const element = await MarketplacePage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('href="/marketplace/test-mascot"');
    expect(html).toContain("Test Mascot");
    expect(html).not.toContain("browser-preview");
    expect(fetchPublicListings).toHaveBeenCalledWith(expect.anything(), {
      paginationOpts: { cursor: null, numItems: 12 },
    });
  });

  it("renders listing-specific metadata and a summary without embedding the pack", async () => {
    fetchPublicListings.mockResolvedValue(listing);

    const meta = await generateMetadata(listingProps());
    const element = await MarketplaceListingPage(listingProps());
    const html = renderToStaticMarkup(element);

    expect(meta.title).toBe("Test Mascot Animated SVG Mascot Pack");
    expect(meta.description).toBe(listing.description);
    expect(meta.alternates?.canonical).toBe("/marketplace/test-mascot");
    expect(html).toContain("Test Mascot</h1>");
    expect(html).toContain(listing.description);
    expect(JSON.stringify(element.props)).not.toContain("interactive-pack-data");
  });

  it("returns a 404 for an unavailable listing", async () => {
    fetchPublicListings.mockResolvedValue(null);

    await expect(MarketplaceListingPage(listingProps())).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("propagates backend failures instead of treating them as missing listings", async () => {
    const failure = new Error("Convex unreachable");
    fetchPublicListings.mockRejectedValue(failure);

    await expect(MarketplaceListingPage(listingProps())).rejects.toBe(failure);
  });
});
