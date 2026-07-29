export function isAccessGateBalancePending(
  needsBalance: boolean,
  balance: unknown,
  balanceHasResolved: boolean
): boolean {
  return needsBalance && balance === undefined && !balanceHasResolved;
}
