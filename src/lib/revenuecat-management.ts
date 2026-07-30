const RC_API = "https://api.revenuecat.com/v2";

type RcList<T> = { object: "list"; items: T[] };

type RcSubscription = {
  id: string;
  gives_access: boolean;
  status: string;
  ends_at: number | null;
};

type RcManagementUrl = {
  object: "authenticated_management_url";
  management_url: string | null;
};

function revenueCatConfig():
  | { apiKey: string; projectId: string }
  | null {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return { apiKey, projectId };
}

async function rcFetch<T>(
  path: string,
  apiKey: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${RC_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RevenueCat ${res.status}: ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

function pickManageableSubscription(
  subscriptions: RcSubscription[]
): RcSubscription | null {
  const candidates = subscriptions.filter(
    (sub) =>
      sub.gives_access ||
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "grace_period"
  );
  if (candidates.length === 0) return null;
  return (
    candidates.sort((a, b) => (b.ends_at ?? 0) - (a.ends_at ?? 0))[0] ?? null
  );
}

/** Environments to query — production first; sandbox only when explicitly allowed. */
export function billingEnvironments(): Array<"production" | "sandbox"> {
  return process.env.ALLOW_SANDBOX_BILLING === "true"
    ? ["production", "sandbox"]
    : ["production"];
}

/**
 * Returns a single-use RevenueCat Web Billing portal URL so the customer can
 * cancel, change plan, or update payment details without digging through email.
 */
export async function getSubscriptionManagementUrl(
  appUserId: string
): Promise<string | null> {
  const config = revenueCatConfig();
  if (!config) return null;

  const { apiKey, projectId } = config;
  // RC v2 accepts the app user id as customer_id — avoid fuzzy search.
  const encodedUser = encodeURIComponent(appUserId);

  for (const environment of billingEnvironments()) {
    let subs: RcList<RcSubscription>;
    try {
      subs = await rcFetch<RcList<RcSubscription>>(
        `/projects/${projectId}/customers/${encodedUser}/subscriptions?environment=${environment}`,
        apiKey
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      // 404 = no customer in this environment; try the next.
      if (message.includes("RevenueCat 404")) continue;
      throw err;
    }

    const subscription = pickManageableSubscription(subs.items);
    if (!subscription) continue;

    const portal = await rcFetch<RcManagementUrl>(
      `/projects/${projectId}/subscriptions/${subscription.id}/authenticated_management_url`,
      apiKey
    );
    const url = portal.management_url?.trim();
    if (url) return url;
  }

  return null;
}

export function isRevenueCatManagementConfigured(): boolean {
  return revenueCatConfig() !== null;
}
