"use client";

import { useTokenBalance } from "@/lib/use-token-balance";

export type Affordability = {
  /** Refuse the metered action until a balance can cover the reservation. */
  blocked: boolean;
  /** No plan and no purchased tokens: the customer needs to pick a plan. */
  needsPlan: boolean;
  /** Tokens missing for one run, 0 when the balance covers it. */
  shortfall: number;
  /** Balance query still in flight — never allow spend until it resolves. */
  loading: boolean;
};

/**
 * Whether the signed-in customer can pay for one run of a metered action.
 *
 * `reservation` must be the same worst-case quote the API route reserves
 * (`estimateTokens(...).max`), so the UI refuses exactly what the server would.
 *
 * Fail closed: while the balance is loading (`undefined`) or missing (`null`),
 * the action stays blocked so a zero-credit session cannot submit a refine.
 */
export function useAffordability(
  reservation: number,
  enabled = true
): Affordability {
  const balance = useTokenBalance(enabled);
  if (!enabled) {
    return {
      blocked: true,
      needsPlan: false,
      shortfall: 0,
      loading: false,
    };
  }
  if (balance === undefined) {
    return {
      blocked: true,
      needsPlan: false,
      shortfall: 0,
      loading: true,
    };
  }
  if (balance === null) {
    return {
      blocked: true,
      needsPlan: true,
      shortfall: reservation,
      loading: false,
    };
  }

  const shortfall = Math.max(0, reservation - balance.total);
  return {
    blocked: !balance.hasAccess || shortfall > 0,
    needsPlan: !balance.hasAccess,
    shortfall,
    loading: false,
  };
}
