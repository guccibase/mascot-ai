/**
 * Capacity left for a new hold: wallet minus open authorization holds.
 * Mirrors Stripe auth/capture — holds earmark capacity without charging.
 */
export function spendableTokens(
  walletTotal: number,
  openHoldTotal: number
): number {
  return Math.max(
    0,
    Math.floor(walletTotal) - Math.max(0, Math.floor(openHoldTotal))
  );
}

/** True when this reservation used deferred debit (charge on settle only). */
export function isDeferredReservation(reservation: {
  deferred?: boolean;
}): boolean {
  return reservation.deferred === true;
}

/**
 * After a deferred hold is deleted, capture may not exceed capacity still
 * earmarked by *other* open holds (refine overrun stays within leftover wallet).
 */
export function deferredCaptureCeiling(
  walletTotal: number,
  otherOpenHolds: number,
  requestedCharge: number
): { toCharge: number; writeoff: number } {
  const requested = Math.max(0, Math.ceil(requestedCharge));
  const maxCapture = spendableTokens(walletTotal, otherOpenHolds);
  const toCharge = Math.min(requested, maxCapture);
  return { toCharge, writeoff: requested - toCharge };
}

/**
 * Deferred holds stay readable for late settle after TTL so a sweep cannot
 * turn a successful generation into a free ride. Capacity ignores them once
 * `expiresAt` has passed (`sumOpenHoldAmount` uses `expiresAt >= now`).
 */
export const DEFERRED_SETTLE_GRACE_MS = 30 * 60 * 1000;

/** Whether an expired deferred hold may still be hard-deleted. */
export function canHardDeleteDeferredHold(
  expiresAt: number,
  now: number,
  graceMs = DEFERRED_SETTLE_GRACE_MS
): boolean {
  return now >= expiresAt + graceMs;
}

/** Ledger / idempotency key for a reservation settle (incl. orphan capture). */
export function settleEventId(reservationId: string): string {
  return `token_settle:${reservationId}`;
}
