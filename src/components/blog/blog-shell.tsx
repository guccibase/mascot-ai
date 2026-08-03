import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Shared chrome for blog index + article pages. */
export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(800px_440px_at_15%_-5%,rgba(245,179,79,0.14),transparent_58%),radial-gradient(680px_400px_at_92%_0%,rgba(88,140,255,0.1),transparent_55%)]" />
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
