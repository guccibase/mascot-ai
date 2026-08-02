"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  MascotCardGridSkeleton,
  MascotCardSkeleton,
} from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import {
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceCategoryKey,
} from "@/lib/marketplace/format";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

const CATEGORIES = Object.keys(
  MARKETPLACE_CATEGORY_LABELS
) as MarketplaceCategoryKey[];

export default function MarketplacePage() {
  const [category, setCategory] = useState<MarketplaceCategoryKey | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const categoryArg = category === "all" ? undefined : category;

  const browsing = usePaginatedQuery(
    api.marketplace.listAvailable,
    deferredSearch ? "skip" : { category: categoryArg },
    { initialNumItems: 12 }
  );

  const searchHits = useQuery(
    api.marketplace.searchAvailable,
    deferredSearch
      ? { query: deferredSearch, category: categoryArg }
      : "skip"
  );

  const items = (deferredSearch ? searchHits : browsing.results) as
    | Array<{
        _id: string;
        slug: string;
        name: string;
        tagline: string;
        description: string;
        category: MarketplaceCategoryKey;
        previewSvg: string;
        accent: string;
        gestureCount: number;
        updatedAt: number;
      }>
    | undefined;
  const loading =
    deferredSearch
      ? searchHits === undefined
      : browsing.status === "LoadingFirstPage";

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.14),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.1),transparent_50%)]" />
      <div className="relative">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
              Marketplace
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
              Ready-made mascots
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              Preview every pose. Remix for $4.99, or buy to own for $49.99 —
              exclusive ownership removes it from the marketplace.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 shrink-0 -translate-y-1/2 text-[var(--brand-muted)]"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mascots, poses, app categories…"
                className="h-11 border-white/15 bg-white/[0.04] pl-10"
              />
            </label>
            <label className="block shrink-0 sm:w-64">
              <span className="sr-only">Category</span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as MarketplaceCategoryKey | "all"
                  )
                }
                className="h-11 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-accent)]"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {MARKETPLACE_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading && <MascotCardGridSkeleton />}

          {!loading && items && items.length === 0 && (
            <div className="mt-16 rounded-[1.75rem] border border-dashed border-white/15 px-8 py-16 text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl">
                Nothing listed yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-[var(--brand-muted)]">
                Check back soon — admins publish available mascots here.
              </p>
            </div>
          )}

          {items && items.length > 0 && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((listing) => (
                <Link
                  key={listing._id}
                  href={`/marketplace/${listing.slug}`}
                  className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--brand-panel)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--brand-accent)_40%,transparent)]"
                >
                  <div
                    className="flex h-44 items-center justify-center bg-[#0b1020] p-4 [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-full"
                    style={{
                      background: `radial-gradient(70% 80% at 50% 20%, ${listing.accent}33, #0b1020 70%)`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeSvg(listing.previewSvg),
                    }}
                  />
                  <div className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                      {MARKETPLACE_CATEGORY_LABELS[listing.category]}
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                      {listing.name}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--brand-muted)]">
                      {listing.tagline}
                    </p>
                    <p className="mt-4 text-sm font-semibold text-white/80 transition group-hover:text-[var(--brand-accent)]">
                      Open studio →
                    </p>
                  </div>
                </Link>
              ))}
              {!deferredSearch &&
                browsing.status === "LoadingMore" &&
                Array.from({ length: 3 }, (_, i) => (
                  <MascotCardSkeleton key={`more-${i}`} />
                ))}
            </div>
          )}

          {!deferredSearch && browsing.status === "CanLoadMore" && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }))}
                onClick={() => browsing.loadMore(12)}
              >
                Load more
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
