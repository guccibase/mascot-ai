"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import {
  Coins,
  LayoutGrid,
  Library,
  LogIn,
  Menu,
  Shield,
  Store,
  Tag,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatTokens } from "@/lib/token-pricing";
import { useTokenBalance } from "@/lib/use-token-balance";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

const ghostLink = cn(
  buttonVariants({ variant: "ghost" }),
  "text-[var(--brand-ink)]/80 hover:bg-white/10 hover:text-[var(--brand-ink)]"
);

const accentLink = cn(
  buttonVariants(),
  "bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
);

type NavLink = { href: string; label: string; icon: LucideIcon };

const VISITOR_SECONDARY: NavLink[] = [
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/#examples", label: "Examples", icon: LayoutGrid },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/sign-in", label: "Sign in", icon: LogIn },
];

const SIGNED_IN_SECONDARY: NavLink[] = [
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/library", label: "Library", icon: Library },
];

/** Balance chip that doubles as the way into plans and top-ups. */
function TokenBalance() {
  const { isAuthenticated } = useConvexAuth();
  const balance = useTokenBalance(isAuthenticated);
  if (!balance) return null;

  return (
    <Link
      href="/pricing"
      title={
        balance.hasAccess
          ? `${balance.total.toLocaleString()} tokens left`
          : "Choose a plan"
      }
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium tabular-nums text-white/80 transition hover:border-white/30 hover:text-white sm:px-3"
    >
      <Coins className="size-3.5 text-[var(--brand-accent)]" />
      {balance.hasAccess ? formatTokens(balance.total) : "Upgrade"}
    </Link>
  );
}

function MobileNavMenu({
  links,
  adminHref,
}: {
  links: NavLink[];
  adminHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-[var(--brand-ink)]/80 hover:bg-white/10 hover:text-[var(--brand-ink)] sm:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(100%,20rem)] gap-0 border-white/10 bg-[var(--brand-bg)] text-[var(--brand-ink)]"
      >
        <SheetHeader className="border-b border-white/10 pr-12">
          <SheetTitle className="text-sm font-semibold tracking-wide text-white/50 uppercase">
            Menu
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation links
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 py-3" aria-label="Mobile">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center gap-3 rounded-lg px-3 text-base font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="size-4 shrink-0 text-[var(--brand-accent)]" />
                {link.label}
              </Link>
            );
          })}
          {adminHref ? (
            <Link
              href={adminHref}
              onClick={() => setOpen(false)}
              className="inline-flex min-h-12 items-center gap-3 rounded-lg px-3 text-base font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              <Shield className="size-4 shrink-0 text-[var(--brand-accent)]" />
              Admin
            </Link>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function SiteHeader() {
  // `useAuth` is client-only, so server-rendered HTML always shows the visitor
  // nav, the right default for the public pages. The signed-in routes sit
  // behind AccessGate, which already waits for auth before rendering children.
  const { isSignedIn } = useAuth();
  const isAdmin = useQuery(api.marketplace.isAdmin, isSignedIn ? {} : "skip");

  return (
    // Same container as every page's <main>, so the logo lines up with the
    // content beneath it on wide screens.
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:gap-4 sm:px-8 sm:py-5 lg:px-12">
      <Link href="/" className="group min-w-0 shrink">
        <BrandLogo tagline="Studios" />
      </Link>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {isSignedIn ? (
          <>
            {/* Desktop secondary nav */}
            <nav
              className="hidden items-center gap-1.5 sm:flex sm:gap-3"
              aria-label="Primary"
            >
              <TokenBalance />
              {SIGNED_IN_SECONDARY.map((link) => (
                <Link key={link.href} href={link.href} className={ghostLink}>
                  {link.label}
                </Link>
              ))}
              {isAdmin ? (
                <Link href="/admin" className={ghostLink} title="Admin">
                  <Shield className="size-4" />
                  <span className="ml-1.5">Admin</span>
                </Link>
              ) : null}
            </nav>

            {/* Mobile: tokens + primary CTA stay visible */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <TokenBalance />
            </div>

            <Link href="/create" className={accentLink}>
              Create
            </Link>

            <MobileNavMenu
              links={SIGNED_IN_SECONDARY}
              adminHref={isAdmin ? "/admin" : undefined}
            />

            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
          </>
        ) : (
          <>
            <nav
              className="hidden items-center gap-1.5 sm:flex sm:gap-3"
              aria-label="Primary"
            >
              {VISITOR_SECONDARY.map((link) => (
                <Link key={link.href} href={link.href} className={ghostLink}>
                  {link.label}
                </Link>
              ))}
            </nav>

            <MobileNavMenu links={VISITOR_SECONDARY} />

            <Link href="/sign-up" className={accentLink}>
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
