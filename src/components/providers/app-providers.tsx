"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { toast } from "sonner";
import { AccessGate } from "@/components/access-gate";
import { RevenueCatProvider } from "@/components/providers/revenuecat-provider";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

function EnsureConvexUser({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    let cancelled = false;
    const run = async () => {
      const delays = [0, 400, 1200];
      for (const delay of delays) {
        if (cancelled) return;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        try {
          await ensure({});
          return;
        } catch {
          /* JWT may still be propagating. Retry. */
        }
      }
      if (!cancelled) {
        toast.error("Couldn’t sync your account. Refresh and try again.");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, ensure]);

  return children;
}

/**
 * Client-side providers. `ClerkProvider` deliberately lives in the root layout
 * instead: as a server component it injects the resolved session into the first
 * render, so public pages ship the correct signed-in/out header in their HTML.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <EnsureConvexUser>
        <RevenueCatProvider>
          <AccessGate>{children}</AccessGate>
        </RevenueCatProvider>
      </EnsureConvexUser>
    </ConvexProviderWithClerk>
  );
}
