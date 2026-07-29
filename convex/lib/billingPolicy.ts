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

/** True when an ordered webhook should be dropped as stale. */
export function isStaleBillingEvent(
  eventAt: number,
  lastEventAt: number | undefined,
  orderedTypes: ReadonlySet<string>,
  eventType: string
): boolean {
  if (!orderedTypes.has(eventType)) return false;
  if (lastEventAt === undefined) return false;
  return eventAt < lastEventAt;
}
