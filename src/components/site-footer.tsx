import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MASCOTS } from "@/lib/mascots";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

const FOOTER_LINKS = [
  { href: "/#examples", label: "Examples" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sign-up", label: "Get started" },
  { href: "/sign-in", label: "Sign in" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <BrandLogo tagline="Studios" />
            <p className="mt-3 text-sm leading-relaxed text-[var(--brand-muted)]">
              {SITE_TAGLINE}. Explore live examples, then generate your own
              gesture pack.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid gap-8 sm:grid-cols-2 sm:gap-12"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Product
              </p>
              <ul className="mt-3 space-y-2">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/75 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Studios
              </p>
              <ul className="mt-3 space-y-2">
                {MASCOTS.map((mascot) => (
                  <li key={mascot.slug}>
                    <Link
                      href={`/studio/${mascot.slug}`}
                      className="text-sm text-white/75 transition hover:text-white"
                    >
                      {mascot.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <p className="text-xs text-white/35">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
