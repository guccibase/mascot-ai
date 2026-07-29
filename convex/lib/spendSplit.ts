/**
 * How a token hold is drawn from subscription vs top-up buckets.
 * Subscription allowance is always spent first so purchased top-ups roll over.
 */
export function splitTokenHold(
  amount: number,
  subscriptionTokens: number,
  topupTokens: number
): {
  fromSubscription: number;
  fromTopup: number;
  totalAvailable: number;
  sufficient: boolean;
} {
  const sub = Math.max(0, subscriptionTokens);
  const top = Math.max(0, topupTokens);
  const totalAvailable = sub + top;
  const hold = Math.max(0, Math.ceil(amount));
  const fromSubscription = Math.min(sub, hold);
  const fromTopup = hold - fromSubscription;
  return {
    fromSubscription,
    fromTopup,
    totalAvailable,
    sufficient: totalAvailable >= hold && hold > 0,
  };
}

/** Refund unused hold back to buckets (top-up first, matching settle). */
export function refundTokenHold(
  holdAmount: number,
  charged: number,
  fromTopup: number
): { subscriptionBack: number; topupBack: number } {
  const refund = Math.max(0, holdAmount - Math.max(0, charged));
  const topupBack = Math.min(refund, Math.max(0, fromTopup));
  const subscriptionBack = refund - topupBack;
  return { subscriptionBack, topupBack };
}
