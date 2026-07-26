"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Coarse clock for the balance query. Convex caches a query against its
 * arguments, so a raw `Date.now()` would mint a fresh cache entry on every
 * read; rounding to the minute lets every caller share one subscription while
 * still letting a cycle rollover show up promptly.
 */
export function balanceClock(): number {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

/**
 * The signed-in user's spendable balance. `undefined` while loading, `null`
 * when there is nobody to bill.
 */
export function useTokenBalance(enabled = true) {
  return useQuery(api.tokens.balance, enabled ? { now: balanceClock() } : "skip");
}
