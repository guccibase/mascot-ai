/**
 * Pure billing policy helpers — testable without Convex context.
 */

/** True when a RevenueCat SANDBOX event must be acknowledged but not grant tokens. */
export function shouldIgnoreSandboxBilling(
  environment: string | undefined,
  allowSandboxBilling: boolean
): boolean {
  const sandbox = (environment ?? "").toUpperCase() === "SANDBOX";
  return sandbox && !allowSandboxBilling;
}

/**
 * Events that revoke access. At equal timestamps, prefer keeping the grant
 * already applied (a same-ms EXPIRATION must not undo a RENEWAL).
 */
const DESTRUCTIVE_ORDERED_TYPES = new Set([
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
  "TRANSFER",
]);

/** True when an ordered webhook should be dropped as stale. */
export function isStaleBillingEvent(
  eventAt: number,
  lastEventAt: number | undefined,
  orderedTypes: ReadonlySet<string>,
  eventType: string
): boolean {
  if (!orderedTypes.has(eventType)) return false;
  if (lastEventAt === undefined) return false;
  if (eventAt < lastEventAt) return true;
  if (eventAt === lastEventAt && DESTRUCTIVE_ORDERED_TYPES.has(eventType)) {
    return true;
  }
  return false;
}

/** Alias event id so webhook top-ups and REST sync share one idempotency key. */
export function topupSyncEventId(transactionId: string): string {
  return `sync:topup:${transactionId.trim()}`;
}
