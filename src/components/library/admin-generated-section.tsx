"use client";

import Link from "next/link";
import { ADMIN_GENERATED_EXAMPLES } from "@/lib/mascots";
import { cn } from "@/lib/utils";

/**
 * Virtual catalog of non-public example packs for admins.
 * Parent mounts this only when `marketplace.isAdmin` is true.
 * Links to gated /studio/[slug] — no Convex rows, no delete.
 */
export function AdminGeneratedSection() {
  if (ADMIN_GENERATED_EXAMPLES.length === 0) return null;

  return (
    <section className="mt-16 border-t border-white/10 pt-12">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
          Generated
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
          Admin example packs
        </h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          Internal studios from the catalog. Not public — only admins can open
          these.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_GENERATED_EXAMPLES.map((mascot) => (
          <article
            key={mascot.slug}
            className={cn(
              "group overflow-hidden rounded-[1.5rem] border border-white/10",
              "bg-white/[0.04] transition hover:border-white/25"
            )}
          >
            <Link href={`/studio/${mascot.slug}`} className="block">
              <div
                className="flex min-h-[160px] items-end p-5"
                style={{
                  background: `
                    radial-gradient(90% 70% at 70% 0%, ${mascot.accent}33, transparent 55%),
                    linear-gradient(160deg, ${mascot.stage} 0%, #0b1020 75%)
                  `,
                }}
              >
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: mascot.accent }}
                  >
                    {mascot.product}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-white">
                    {mascot.name}
                  </h3>
                </div>
              </div>
              <div className="space-y-1 border-t border-white/10 p-4">
                <p className="line-clamp-2 text-sm text-[var(--brand-muted)]">
                  {mascot.tagline}
                </p>
                <p className="pt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  {mascot.poseCount} poses · open studio
                </p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
