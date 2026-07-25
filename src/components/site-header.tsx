import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/" className="group flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-[1.75rem]">
          Mascot
          <span className="text-[var(--brand-accent)]">AI</span>
        </span>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--brand-muted)] sm:inline">
          Studios
        </span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/#examples"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-[var(--brand-ink)]/80 hover:bg-white/10 hover:text-[var(--brand-ink)]"
          )}
        >
          Examples
        </Link>
        <Link
          href="/create"
          className={cn(
            buttonVariants(),
            "bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
          )}
        >
          Create mascot
        </Link>
      </nav>
    </header>
  );
}
