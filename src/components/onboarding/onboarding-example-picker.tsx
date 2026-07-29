"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ExampleIdlePreview } from "@/components/example-idle-preview";
import type { PublicExampleMeta } from "@/lib/mascots";
import { cn } from "@/lib/utils";

type Props = {
  examples: PublicExampleMeta[];
  favorite: string | null;
  onFavoriteChange: (slug: string | null) => void;
};

export function OnboardingExamplePicker({
  examples,
  favorite,
  onFavoriteChange,
}: Props) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-[var(--brand-muted)]">
          {examples.length} live example studios we built for real products. Tap
          one for inspiration, or skip and start clean.
        </p>
        <Link
          href="/#examples"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-accent)]/85"
        >
          Browse full studios
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {examples.map((m) => {
          const on = favorite === m.slug;
          return (
            <button
              key={m.slug}
              type="button"
              onClick={() => onFavoriteChange(on ? null : m.slug)}
              aria-pressed={on}
              className={cn(
                "overflow-hidden rounded-[1.35rem] border text-left transition",
                on
                  ? "border-[var(--brand-accent)] ring-2 ring-[var(--brand-accent)]/35"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25"
              )}
            >
              <ExampleIdlePreview
                slug={m.slug}
                accent={m.accent}
                stage={m.stage}
              />
              <div className="space-y-1 border-t border-white/10 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: m.accent }}
                  >
                    {m.name}
                  </p>
                  <p className="text-[11px] text-[var(--brand-muted)]">
                    {m.poseCount} poses
                  </p>
                </div>
                <p className="font-[family-name:var(--font-display)] text-base leading-snug">
                  {m.tagline}
                </p>
                <p className="line-clamp-2 text-xs text-[var(--brand-muted)]">
                  {m.blurb}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
