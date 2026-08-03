import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BlogCta() {
  return (
    <aside className="mt-14 rounded-2xl border border-[var(--brand-accent)]/25 bg-[radial-gradient(500px_220px_at_10%_0%,rgba(245,179,79,0.16),transparent_60%),rgba(255,255,255,0.03)] p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
        Build your own
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
        Give your app a face that can ship
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
        Explore live example studios free, then generate an animated SVG gesture
        pack from a short product brief.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/#examples"
          className={cn(
            buttonVariants(),
            "bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
          )}
        >
          Try live examples
        </Link>
        <Link
          href="/create"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-white/20 bg-transparent text-white hover:bg-white/10"
          )}
        >
          Create a mascot
        </Link>
      </div>
    </aside>
  );
}
