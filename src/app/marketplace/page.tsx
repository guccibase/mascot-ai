import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { MarketplaceCatalog } from "./marketplace-catalog";

// Listings can become unavailable during checkout or after publication.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function MarketplacePage() {
  const { page } = await fetchQuery(api.marketplace.listAvailable, {
    paginationOpts: { cursor: null, numItems: PAGE_SIZE },
  });
  const initialListings = page.map(
    ({ _id, slug, name, tagline, category, accent }) => ({
      _id,
      slug,
      name,
      tagline,
      category,
      accent,
    })
  );

  return (
    <MarketplaceCatalog initialListings={initialListings} pageSize={PAGE_SIZE} />
  );
}
