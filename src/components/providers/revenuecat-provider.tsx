"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import type { Package, Purchases } from "@revenuecat/purchases-js";
import { trackEvent } from "@/lib/analytics";
import {
  indexPackages,
  lookupPackage,
  priceFromPackage,
  type CatalogPrice,
} from "@/lib/catalog-prices";

type Status = "loading" | "ready" | "unavailable";

type RevenueCatValue = {
  status: Status;
  /** Purchasable packages keyed by normalised RevenueCat product id. */
  packages: Record<string, Package>;
  /** Product id currently in checkout, or null. */
  purchasing: string | null;
  getPrice: (productId: string) => CatalogPrice | null;
  purchase: (productId: string) => Promise<boolean>;
};

const RevenueCatContext = createContext<RevenueCatValue>({
  status: "loading",
  packages: {},
  purchasing: null,
  getPrice: () => null,
  purchase: async () => false,
});

export function useRevenueCat(): RevenueCatValue {
  return useContext(RevenueCatContext);
}

/** Stable anonymous id for loading the public catalog before sign-in. */
const CATALOG_USER_ID = "$RCAnonymousID:mascot-catalog";

/**
 * Loads the RevenueCat Web SDK lazily on the client and exposes the current
 * offering. Entitlements are read from Convex (kept in sync by webhooks), so
 * this provider only handles catalogue and checkout.
 */
export function RevenueCatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const [loaded, setLoaded] = useState<Status>("loading");
  const [packages, setPackages] = useState<Record<string, Package>>({});
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const clientRef = useRef<Purchases | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
  const signedInUserId = user?.id ?? null;
  const appUserId = signedInUserId ?? CATALOG_USER_ID;
  const status: Status = apiKey ? loaded : "unavailable";

  useEffect(() => {
    if (!isLoaded || !apiKey) return;

    let cancelled = false;
    (async () => {
      try {
        const { Purchases: SDK } = await import("@revenuecat/purchases-js");
        const client = SDK.isConfigured()
          ? SDK.getSharedInstance()
          : SDK.configure({ apiKey, appUserId });

        if (client.getAppUserId() !== appUserId) {
          await client.changeUser(appUserId);
        }
        if (cancelled) return;
        clientRef.current = client;

        const offerings = await client.getOfferings();
        if (cancelled) return;

        const available = offerings.current?.availablePackages ?? [];
        setPackages(indexPackages(available));
        setLoaded(available.length > 0 ? "ready" : "unavailable");
      } catch (err) {
        if (cancelled) return;
        console.error("[revenuecat] setup failed:", err);
        setLoaded("unavailable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, apiKey, appUserId]);

  const getPrice = useCallback(
    (productId: string) => {
      const pkg = lookupPackage(packages, productId);
      return pkg ? priceFromPackage(pkg) : null;
    },
    [packages]
  );

  const purchase = useCallback(
    async (productId: string) => {
      const client = clientRef.current;
      const rcPackage = lookupPackage(packages, productId);
      if (!client || !rcPackage) return false;
      if (!signedInUserId) return false;

      setPurchasing(productId);
      try {
        await client.purchase({
          rcPackage,
          customerEmail: user?.primaryEmailAddress?.emailAddress,
        });
        return true;
      } catch (err) {
        const code = (err as { errorCode?: number } | null)?.errorCode;
        if (code === 1) {
          trackEvent("checkout_cancelled", { product: productId });
        } else {
          console.error("[revenuecat] purchase failed:", err);
          trackEvent("checkout_failed", { product: productId, errorCode: code ?? 0 });
        }
        return false;
      } finally {
        setPurchasing(null);
      }
    },
    [packages, signedInUserId, user]
  );

  const value = useMemo(
    () => ({ status, packages, purchasing, getPrice, purchase }),
    [status, packages, purchasing, getPrice, purchase]
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}
