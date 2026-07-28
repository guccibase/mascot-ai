"use client";

import Link from "next/link";
import { usePaginatedQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AdminListingsPanel } from "@/components/marketplace/admin-listings-panel";
import { MascotCardGridSkeleton, MascotCardSkeleton } from "@/components/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function LibraryPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.mascots.listMine,
    {},
    { initialNumItems: 12 }
  );
  const remove = useMutation(api.mascots.remove);

  const onDelete = async (id: Id<"mascots">, name: string) => {
    if (!window.confirm(`Delete “${name}”? This can’t be undone.`)) return;
    try {
      await remove({ mascotId: id });
      toast.success("Mascot deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.14),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.1),transparent_50%)]" />
      <div className="relative">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
                Your library
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
                Saved mascots
              </h1>
              <p className="mt-3 max-w-xl text-[var(--brand-muted)]">
                Reopen any studio to download, add gestures, or keep editing.
              </p>
            </div>
            <Link
              href="/create"
              className={cn(
                buttonVariants(),
                "bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
              )}
            >
              <Plus className="size-4" />
              New mascot
            </Link>
          </div>

          {status === "LoadingFirstPage" && <MascotCardGridSkeleton />}

          {status !== "LoadingFirstPage" && results.length === 0 && (
            <div className="mt-16 rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.03] px-8 py-16 text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl">
                No mascots yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-[var(--brand-muted)]">
                Create your first animated SVG studio. It’ll show up here
                automatically.
              </p>
              <Link
                href="/create"
                className={cn(
                  buttonVariants(),
                  "mt-6 inline-flex bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
                )}
              >
                Create mascot
              </Link>
            </div>
          )}

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((m) => (
              <article
                key={m._id}
                className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] transition hover:border-white/25"
              >
                <Link href={`/library/${m._id}`} className="block">
                  <div className="flex min-h-[220px] items-center justify-center bg-[#0c1322] p-4 [&_svg]:h-auto [&_svg]:max-h-[200px] [&_svg]:w-full">
                    <div
                      className="w-full max-w-[180px]"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeSvg(m.previewSvg),
                      }}
                    />
                  </div>
                  <div className="space-y-1 border-t border-white/10 p-4">
                    <h2 className="font-[family-name:var(--font-display)] text-lg">
                      {m.name}
                    </h2>
                    <p className="line-clamp-2 text-sm text-[var(--brand-muted)]">
                      {m.tagline}
                    </p>
                    <p className="pt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                      {m.gestureCount} poses ·{" "}
                      {new Date(m.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <div className="flex justify-end border-t border-white/10 px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-red-300/90 hover:bg-red-500/10"
                    onClick={() => void onDelete(m._id, m.name)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {status === "LoadingMore" &&
              Array.from({ length: 3 }, (_, i) => (
                <MascotCardSkeleton key={`more-${i}`} />
              ))}
          </div>

          {status === "CanLoadMore" && (
            <div className="mt-8 flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-transparent"
                onClick={() => loadMore(12)}
              >
                Load more
              </Button>
            </div>
          )}

          <AdminListingsPanel />
        </main>
      </div>
    </div>
  );
}
