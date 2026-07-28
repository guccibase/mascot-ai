const RC_API = "https://api.revenuecat.com/v2";

type RcList<T> = { object: "list"; items: T[] };

type RcCustomer = { id: string };

type RcSubscription = {
  id: string;
  gives_access: boolean;
  status: string;
  ends_at: number;
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
  return candidates.sort((a, b) => b.ends_at - a.ends_at)[0] ?? null;
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
  const encodedUser = encodeURIComponent(appUserId);

  const customers = await rcFetch<RcList<RcCustomer>>(
    `/projects/${projectId}/customers?search=${encodedUser}`,
    apiKey
  );
  const customer = customers.items[0];
  if (!customer) return null;

  const environment =
    process.env.ALLOW_SANDBOX_BILLING === "true" ? "sandbox" : "production";
  const subs = await rcFetch<RcList<RcSubscription>>(
    `/projects/${projectId}/customers/${customer.id}/subscriptions?environment=${environment}`,
    apiKey
  );

  const subscription = pickManageableSubscription(subs.items);
  if (!subscription) return null;

  const portal = await rcFetch<RcManagementUrl>(
    `/projects/${projectId}/subscriptions/${subscription.id}/authenticated_management_url`,
    apiKey
  );
  return portal.management_url?.trim() || null;
}

export function isRevenueCatManagementConfigured(): boolean {
  return revenueCatConfig() !== null;
}
