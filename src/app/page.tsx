import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, Download, Sparkles, Wand2 } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MascotExampleCard } from "@/components/mascot-example-card";
import { buttonVariants } from "@/components/ui/button";
import { MASCOTS } from "@/lib/mascots";
import { PROOF_POINTS, PROOF_QUOTE } from "@/lib/proof";
import { buildPageMetadata, homeJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { HomePricingTeaser } from "@/components/home-pricing-teaser";

export const metadata = buildPageMetadata({
  title: "Give your app a personality",
  description:
    "Generate animated SVG mascots for web and mobile apps. Gestures, themes, and download-ready packs you can ship straight into product.",
  path: "/",
  absoluteTitle: true,
});

const STEPS = [
  {
    icon: Wand2,
    title: "Write a short brief",
    body: "Tell us what you're building and how it should feel. That is the whole input. No design files needed.",
  },
  {
    icon: Sparkles,
    title: "Pick your look",
    body: "Three different directions come back in seconds. Choose one and we build the full gesture set around it.",
  },
  {
    icon: Download,
    title: "Ship it",
    body: "Download animated SVGs and paste them into your codebase. Add gestures or change things later.",
  },
] as const;

const ctaClass = cn(
  buttonVariants({ size: "lg" }),
  "bg-[var(--brand-accent)] px-8 text-[#12141c] hover:bg-[var(--brand-accent)]/90"
);

/** Sends visitors to sign-up and existing customers straight to the builder. */
function PrimaryCta({ label }: { label: string }) {
  return (
    <Show
      when="signed-in"
      fallback={
        <Link href="/sign-up" className={ctaClass}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      }
    >
      <Link href="/create" className={ctaClass}>
        {label}
        <ArrowRight className="size-4" />
      </Link>
    </Show>
  );
}

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto max-w-6xl px-5 sm:px-8 lg:px-12", className)}
    >
      {children}
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <JsonLd data={homeJsonLd()} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[820px] bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.16),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.12),transparent_50%)]" />

      <div className="relative">
        <SiteHeader />

        <main>
        {/* Hero */}
        <Section className="pb-16 pt-10 sm:pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
            Animated mascot studios
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Every great app has a personality
          </h1>
          <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-[var(--brand-muted)]">
            <p>
              Duolingo has Duo. Mailchimp has Freddie. Most teams settle for a
              static logo or a generic AI blob.
            </p>
            <p className="text-white/90">
              We used AI to build mascot studios for real products, then opened
              the same process to anyone shipping an app. Animated, gestural,
              downloadable, and ready to drop into product.
            </p>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryCta label="Build your mascot" />
            <Link
              href="#examples"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/15 bg-transparent text-white hover:bg-white/10"
              )}
            >
              See four we built
            </Link>
          </div>

          <p className="mt-4 text-sm text-[var(--brand-muted)]">
            Nothing to sign up for yet. Every studio below is live, so go poke
            at them first.
          </p>
        </Section>

        {/* Examples */}
        <Section id="examples" className="scroll-mt-8 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                Four we already built
              </h2>
              <p className="mt-3 max-w-xl text-[var(--brand-muted)]">
                Each of these was made for an actual product. Open one and click
                around. They are fully interactive and you do not need an
                account.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {MASCOTS.map((mascot, index) => (
              <MascotExampleCard
                key={mascot.slug}
                mascot={mascot}
                index={index}
              />
            ))}
          </div>
        </Section>

        {/* How it works */}
        <Section className="py-16">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
            How it works
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10">
                      <Icon className="size-4 text-[var(--brand-accent)]" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Proof */}
        <Section className="py-16">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
            Why bother with a mascot?
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--brand-muted)]">
            Brand research keeps finding the same thing: characters stick.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROOF_POINTS.map((item) => (
              <div
                key={item.stat}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
              >
                <p className="font-[family-name:var(--font-display)] text-4xl tabular-nums text-[var(--brand-accent)]">
                  {item.stat}
                </p>
                <p className="mt-2 font-medium">{item.claim}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
                  {item.detail}
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/35">
                  {item.source}
                </p>
              </div>
            ))}
          </div>

          <blockquote className="mt-8 max-w-2xl border-l-2 border-[var(--brand-accent)]/60 pl-5 text-[15px] leading-relaxed text-white/85">
            “{PROOF_QUOTE.text}”
            <footer className="mt-2 text-sm text-[var(--brand-muted)]">
              {PROOF_QUOTE.attribution}
            </footer>
          </blockquote>
        </Section>

        {/* Pricing teaser */}
        <Section className="py-16">
          <HomePricingTeaser />
        </Section>

        {/* Closing CTA */}
        <Section className="pb-24 pt-4 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
            Give your app a face
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--brand-muted)]">
            A short brief in, a full animated studio out. Yours to keep.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryCta label="Get started" />
          </div>
        </Section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
