import Link from "next/link";
import type { MascotMeta } from "@/lib/mascots";
import { cn } from "@/lib/utils";

export function MascotExampleCard({
  mascot,
  index,
}: {
  mascot: MascotMeta;
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
      <div
        className="absolute inset-0 opacity-80 transition duration-500 group-hover:opacity-100"
        style={{
          background: `
            radial-gradient(90% 70% at 70% 0%, ${mascot.accent}33, transparent 55%),
            linear-gradient(160deg, ${mascot.stage} 0%, #0b1020 75%)
          `,
        }}
      />
      <Link
        href={`/studio/${mascot.slug}`}
        className="relative flex min-h-[280px] flex-col justify-between p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] sm:p-7"
      >
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
            Open studio →
          </p>
        </div>
      </Link>
      <div className="relative border-t border-white/10 px-6 py-3 sm:px-7">
        <Link
          href={`/remix/${mascot.slug}`}
          className="text-sm font-semibold text-[var(--brand-accent)] transition hover:text-white"
        >
          Remix this mascot →
        </Link>
      </div>
    </article>
  );
}
