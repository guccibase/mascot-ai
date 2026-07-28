import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export const legalLinkClass =
  "font-medium text-[var(--brand-accent)] underline decoration-[var(--brand-accent)]/35 underline-offset-4 transition hover:decoration-[var(--brand-accent)]";

export function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(800px_440px_at_15%_-5%,rgba(245,179,79,0.14),transparent_58%),radial-gradient(680px_400px_at_92%_0%,rgba(88,140,255,0.1),transparent_55%)]" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="MascotAI home">
          <BrandLogo tagline="Studios" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to MascotAI
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/80">
            {summary}
          </p>
          <p className="mt-4 text-sm text-[var(--brand-muted)]">
            Effective and last updated: {effectiveDate}
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <nav
              aria-label={`${title} contents`}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                On this page
              </p>
              <ol className="mt-4 space-y-2.5">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group flex gap-2 text-sm leading-snug text-white/60 transition hover:text-white"
                    >
                      <span className="w-5 shrink-0 tabular-nums text-white/30 group-hover:text-[var(--brand-accent)]">
                        {index + 1}.
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={`scroll-mt-8 ${
                  index === 0
                    ? ""
                    : "mt-12 border-t border-white/10 pt-12"
                }`}
              >
                <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-[15px] leading-7 text-white/70 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-white/90 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>Questions about these terms?</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
