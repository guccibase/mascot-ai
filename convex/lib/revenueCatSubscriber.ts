/**
 * Map RevenueCat REST subscriber payloads into the snapshot shape consumed by
 * `billing.applySubscriberSnapshot`. Pure — unit-tested without network I/O.
 */

export type SubscriberSnapshot = {
  subscriptions: Array<{
    productId: string;
    purchasedAtMs: number;
    expiresAtMs?: number;
    store?: string;
    environment?: string;
  }>;
  topups: Array<{
    productId: string;
    transactionId: string;
    purchasedAtMs: number;
    store?: string;
    environment?: string;
  }>;
};

type V1Subscription = {
  expires_date?: string | null;
  purchase_date?: string | null;
  store?: string | null;
  is_sandbox?: boolean;
};

type V1NonSub = {
  id?: string;
  purchase_date?: string | null;
  store?: string | null;
  is_sandbox?: boolean;
};

export type V1SubscriberResponse = {
  subscriber?: {
    subscriptions?: Record<string, V1Subscription>;
    non_subscriptions?: Record<string, V1NonSub[]>;
  };
};

function envFromSandbox(isSandbox: boolean | undefined): string {
  return isSandbox ? "SANDBOX" : "PRODUCTION";
}

function parseMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

/** Convert a RevenueCat v1 `/subscribers/{id}` payload into grant snapshots. */
export function snapshotFromV1Subscriber(
  payload: V1SubscriberResponse
): SubscriberSnapshot {
  const subscriptions: SubscriberSnapshot["subscriptions"] = [];
  const topups: SubscriberSnapshot["topups"] = [];

  const subs = payload.subscriber?.subscriptions ?? {};
  for (const [productId, sub] of Object.entries(subs)) {
    const purchasedAtMs = parseMs(sub.purchase_date);
    if (purchasedAtMs === undefined) continue;
    subscriptions.push({
      productId,
      purchasedAtMs,
      expiresAtMs: parseMs(sub.expires_date),
      store: sub.store ?? undefined,
      environment: envFromSandbox(sub.is_sandbox),
    });
  }

  const nonSubs = payload.subscriber?.non_subscriptions ?? {};
  for (const [productId, purchases] of Object.entries(nonSubs)) {
    for (const purchase of purchases) {
      const purchasedAtMs = parseMs(purchase.purchase_date);
      const transactionId = purchase.id?.trim();
      if (purchasedAtMs === undefined || !transactionId) continue;
      topups.push({
        productId,
        transactionId,
        purchasedAtMs,
        store: purchase.store ?? undefined,
        environment: envFromSandbox(purchase.is_sandbox),
      });
    }
  }

  return { subscriptions, topups };
}
