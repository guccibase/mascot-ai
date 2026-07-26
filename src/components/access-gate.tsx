"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTokenBalance } from "@/lib/use-token-balance";
import { api } from "../../convex/_generated/api";

const ONBOARDING_PATH = "/onboarding";
const PRICING_PATH = "/pricing";
const LIBRARY_PATH = "/library";

/**
 * The public side of the site. Nobody gets redirected away from these. A
 * half-onboarded customer is still allowed to read the pitch and the examples.
 * `/` is matched exactly, since every path starts with a slash.
 */
const UNGATED_PATHS = ["/sign-in", "/sign-up", "/studio"];

/**
 * Routes that spend tokens. Saved work stays readable without a plan; the
 * generate API routes are the real enforcement point, this is just the UX.
 */
const PAID_PATHS = ["/create", "/remix"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Keeps signed-in users on the right side of onboarding and the paywall.
 * Renders a spinner rather than a flash of the page it is about to leave.
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const ungated = pathname === "/" || matches(pathname, UNGATED_PATHS);
  const gated = isAuthenticated && !ungated;
  const onPaidPath = matches(pathname, PAID_PATHS);
  const onOnboardingPath = pathname === ONBOARDING_PATH;

  const me = useQuery(api.users.me, gated ? {} : "skip");
  const onboardingDone = me?.onboardingCompletedAt != null;
  // Only fetch balance on onboarding after completion (redirect to pricing/library).
  // Fetching it during the flow remounts the page every minute when balanceClock
  // ticks, wiping in-progress step state.
  const needsBalance =
    gated && (onPaidPath || (onOnboardingPath && onboardingDone));

  const balance = useTokenBalance(needsBalance);

  const loading =
    gated &&
    (authLoading || me === undefined || (needsBalance && balance === undefined));

  // `me === null` means the Convex row has not synced yet; EnsureConvexUser is
  // still retrying, so hold the current route rather than bouncing anywhere.
  let destination: string | null = null;
  if (!loading && gated && me) {
    if (me.onboardingCompletedAt == null) {
      destination = onOnboardingPath ? null : ONBOARDING_PATH;
    } else if (onOnboardingPath) {
      destination = balance?.hasAccess ? LIBRARY_PATH : PRICING_PATH;
    } else if (onPaidPath && balance && !balance.hasAccess) {
      destination = PRICING_PATH;
    }
  }

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (loading || destination) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-bg)] text-[var(--brand-muted)]">
        <Loader2 className="size-6 animate-spin text-[var(--brand-accent)]" />
      </div>
    );
  }

  return children;
}
