"use client";

import Link from "next/link";
import { ExampleIdlePreview } from "@/components/example-idle-preview";
import type { PublicExampleMeta } from "@/lib/mascots";
import { cn } from "@/lib/utils";

export function MascotExampleCard({
  mascot,
  index,
}: {
  mascot: PublicExampleMeta;
  index: number;
}) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] border border-white/10",
        "bg-[var(--brand-panel)] transition duration-500",
        "hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--brand-accent)_45%,transparent)]"
      )}
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      <Link
        href={`/studio/${mascot.slug}`}
        className="relative flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
      >
        <ExampleIdlePreview
          slug={mascot.slug}
          accent={mascot.accent}
          stage={mascot.stage}
          className="rounded-none border-0"
          minHeightClassName="min-h-[200px] sm:min-h-[220px]"
          maxWidthClassName="max-w-[168px]"
        />
        <div className="flex flex-col justify-between gap-4 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: mascot.accent }}
              >
                {mascot.product}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white">
                {mascot.name}
              </h3>
            </div>
            <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white/70">
              {mascot.poseCount} poses
            </span>
          </div>

          <div>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              {mascot.blurb}
            </p>
            <p className="mt-4 text-sm font-semibold text-white transition group-hover:text-[var(--brand-accent)]">
              Browse studio →
            </p>
          </div>
        </div>
      </Link>
      <div className="relative border-t border-white/10 px-6 py-3 text-xs text-white/50 sm:px-7">
        Preview only — remix owned mascots from your library or the marketplace.
      </div>
    </article>
  );
}
