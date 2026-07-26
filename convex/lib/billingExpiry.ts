import { addCycle, type Plan } from "./plans";

const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

/** RevenueCat sometimes sends expiration_at_ms as 0 or omits it; derive from the plan. */
export function resolveSubscriptionExpiry(
  plan: Plan,
  purchasedAt: number,
  expiresAtMs?: number
): number {
  if (expiresAtMs !== undefined && expiresAtMs > 0) {
    return expiresAtMs;
  }
  if (plan.term === "week") {
    return purchasedAt + MS_WEEK;
  }
  if (plan.term === "month") {
    return addCycle(purchasedAt, "month");
  }
  const end = new Date(purchasedAt);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end.getTime();
}
