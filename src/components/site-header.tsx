"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { Coins } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { formatTokens } from "@/lib/token-pricing";
import { useTokenBalance } from "@/lib/use-token-balance";
import { cn } from "@/lib/utils";

const ghostLink = cn(
  buttonVariants({ variant: "ghost" }),
  "text-[var(--brand-ink)]/80 hover:bg-white/10 hover:text-[var(--brand-ink)]"
);

const accentLink = cn(
  buttonVariants(),
  "bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
);

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
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium tabular-nums text-white/80 transition hover:border-white/30 hover:text-white"
    >
      <Coins className="size-3.5 text-[var(--brand-accent)]" />
      {balance.hasAccess ? formatTokens(balance.total) : "Upgrade"}
    </Link>
  );
}

export function SiteHeader() {
  // `useAuth` is client-only, so server-rendered HTML always shows the visitor
  // nav, the right default for the public pages. The signed-in routes sit
  // behind AccessGate, which already waits for auth before rendering children.
  const { isSignedIn } = useAuth();

  return (
    // Same container as every page's <main>, so the logo lines up with the
    // content beneath it on wide screens.
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/" className="group">
        <BrandLogo tagline="Studios" />
      </Link>

      <nav className="flex min-h-9 items-center gap-1.5 sm:gap-3">
        {isSignedIn ? (
          <>
            <TokenBalance />
            <Link
              href="/library"
              className={cn(ghostLink, "hidden sm:inline-flex")}
            >
              Library
            </Link>
            <Link href="/create" className={accentLink}>
              Create
            </Link>
            <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
          </>
        ) : (
          <>
            <Link
              href="/#examples"
              className={cn(ghostLink, "hidden sm:inline-flex")}
            >
              Examples
            </Link>
            <Link
              href="/pricing"
              className={cn(ghostLink, "hidden sm:inline-flex")}
            >
              Pricing
            </Link>
            <Link href="/sign-in" className={ghostLink}>
              Sign in
            </Link>
            <Link href="/sign-up" className={accentLink}>
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
