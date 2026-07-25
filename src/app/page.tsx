import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { MascotExampleCard } from "@/components/mascot-example-card";
import { MASCOTS } from "@/lib/mascots";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_520px_at_50%_-120px,rgba(245,179,79,0.18),transparent_60%),radial-gradient(700px_420px_at_95%_20%,rgba(88,140,255,0.12),transparent_55%),linear-gradient(180deg,#101526_0%,#0b1020_55%,#070b14_100%)]" />
        <div className="absolute left-[8%] top-[22%] h-64 w-64 rounded-full bg-[rgba(245,179,79,0.08)] blur-3xl motion-safe:animate-[drift_18s_ease-in-out_infinite]" />
        <div className="absolute right-[6%] top-[40%] h-72 w-72 rounded-full bg-[rgba(80,120,220,0.1)] blur-3xl motion-safe:animate-[drift_22s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="relative">
        <SiteHeader />

        <main>
          <section className="relative px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12">
            <div className="mx-auto grid max-w-6xl items-end gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="motion-safe:animate-[rise_0.9s_ease-out_both]">
                <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.4rem,9vw,6.5rem)] leading-[0.92] tracking-[-0.03em]">
                  Mascot
                  <span className="text-[var(--brand-accent)]">AI</span>
                </h1>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--brand-muted)] sm:text-xl">
                  Animated SVG companions for your product — gestures, themes,
                  and downloadable studio exports.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/create"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "bg-[var(--brand-accent)] px-5 text-[#12141c] hover:bg-[var(--brand-accent)]/90"
                    )}
                  >
                    Create a mascot
                  </Link>
                  <Link
                    href="/#examples"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "border-white/15 bg-white/5 px-5 text-[var(--brand-ink)] hover:bg-white/10"
                    )}
                  >
                    Try examples
                  </Link>
                </div>
              </div>

              <div className="relative motion-safe:animate-[rise_1.1s_ease-out_0.1s_both]">
                <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_50%_30%,rgba(245,179,79,0.2),transparent_65%)] blur-xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,#1a2438,#0d1426)] shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F5B34F]">
                      Live pattern
                    </span>
                    <span className="text-xs text-white/45">SVG · SMIL · poses</span>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-white/10">
                    {MASCOTS.map((m) => (
                      <Link
                        key={m.slug}
                        href={`/studio/${m.slug}`}
                        className="group relative min-h-[120px] bg-[#101526] p-4 transition hover:bg-[#141c32]"
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: m.accent }}
                        >
                          {m.name}
                        </p>
                        <p className="mt-2 text-sm leading-snug text-white/70 group-hover:text-white">
                          {m.tagline}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="examples" className="scroll-mt-8 px-5 pb-24 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
                  Examples
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                  Play with Lyra, Sol, Bud & Fanous
                </h2>
                <p className="mt-3 text-[var(--brand-muted)]">
                  Full interactive studios — switch themes, flip through gestures,
                  pause motion, download SVG.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {MASCOTS.map((mascot, index) => (
                  <MascotExampleCard
                    key={mascot.slug}
                    mascot={mascot}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
                  Ready for your own companion?
                </h2>
                <p className="mt-2 text-[var(--brand-muted)]">
                  Describe the character, pick gestures, generate a studio pack.
                </p>
              </div>
              <Link
                href="/create"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-[var(--brand-accent)] px-5 text-[#12141c] hover:bg-[var(--brand-accent)]/90"
                )}
              >
                Start creating
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
