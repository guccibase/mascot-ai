import { NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import { authedConvexClient } from "@/lib/convex-server";
import {
  REFINE_MARGIN_MULTIPLIER,
  billUsageTokens,
  estimateTokens,
  fallbackTokens,
  refineHoldTokens,
  tokensForUsage,
  type MeteredAction,
  type ProviderUsage,
} from "@/lib/token-pricing";
import type { MascotModelId } from "@/lib/types";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type TokenMeta = {
  /** Billing tokens actually charged for this request. */
  tokens: number;
  /** Balance left after settling. */
  balance: number;
  /** What the estimate panel quoted, for client-side reconciliation. */
  estimated: number;
  /** False when Convex settle did not complete (hold may still be open). */
  committed: boolean;
};

/** Omit token fields from API meta when settle did not commit. */
export function tokenMetaFields(
  meta: TokenMeta
): { tokens: number; balance: number } | Record<string, never> {
  if (!meta.committed) return {};
  return { tokens: meta.tokens, balance: meta.balance };
}

export type Meter = {
  /**
   * Record one completed model call. Calls that threw are simply never
   * recorded, so a failed run only bills for the work that finished.
   */
  record(usage: ProviderUsage | undefined, actualApiModel?: string): void;
  /** Charge a call that succeeded but reported no usage. */
  recordFallback(action: MeteredAction): void;
  /**
   * Drop every recorded charge so the next `settle()` fully refunds the hold.
   * Required for atomic outcomes (e.g. Ask AI refine) where the user gets
   * nothing usable unless the whole request succeeds.
   */
  forgive(): void;
  /** Close the hold. Safe to call twice; the second call is a no-op. */
  settle(): Promise<TokenMeta>;
};

function paymentRequired(
  code: string,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: message, code, ...extra }, { status: 402 });
}

function errorData(err: unknown): Record<string, unknown> | null {
  if (err instanceof ConvexError && typeof err.data === "object" && err.data) {
    return err.data as Record<string, unknown>;
  }
  return null;
}

/**
 * Reserve the worst-case cost of `action` before running it. The caller must
 * always `settle()` in a `finally`. Non-atomic routes bill each recorded call;
 * atomic routes (refine) call `forgive()` on failure so settle refunds the hold.
 */
export async function openMeter(
  action: MeteredAction,
  model: MascotModelId
): Promise<
  { ok: true; meter: Meter } | { ok: false; response: NextResponse }
> {
  const client = await authedConvexClient();
  if (!client) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in to generate", code: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    };
  }

  const estimate = estimateTokens(action, model);
  // Refine: practical hold (typical×buffer). Other actions: absolute max.
  const reserveAmount =
    action.kind === "refine" ? refineHoldTokens(estimate) : estimate.max;
  // Proves these calls came from the server, not from a browser holding the
  // same user's Clerk token. Optional so an unconfigured deployment still runs.
  const serverSecret = process.env.GENERATION_SERVER_SECRET;

  let reservationId: Id<"tokenReservations">;
  try {
    const reservation = await client.mutation(api.tokens.reserve, {
      amount: reserveAmount,
      action: action.kind,
      model,
      serverSecret,
    });
    reservationId = reservation.reservationId;
  } catch (err) {
    const data = errorData(err);
    const code = typeof data?.code === "string" ? data.code : null;

    if (code === "NO_SUBSCRIPTION") {
      return {
        ok: false,
        response: paymentRequired(
          code,
          "Choose a plan to start generating mascots"
        ),
      };
    }
    if (code === "INSUFFICIENT_TOKENS") {
      return {
        ok: false,
        response: paymentRequired(
          code,
          "Not enough tokens for this generation. Top up or pick a lighter model",
          { required: data?.required, available: data?.available }
        ),
      };
    }
    if (code === "RESERVATION_TOO_LARGE") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "This edit is too large to price in one run. Try a smaller pack, a lighter model, or a shorter message.",
            code,
            required: data?.required,
            max: data?.max,
          },
          { status: 413 }
        ),
      };
    }
    if (code === "INVALID_AMOUNT") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Invalid token reservation amount", code },
          { status: 400 }
        ),
      };
    }
    if (code === "UNAUTHENTICATED" || code === "USER_NOT_FOUND") {
      // An auth problem the customer can act on, not a transient backend
      // failure, so it must not be dressed up as one and retried.
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Sign in again to continue", code },
          { status: 401 }
        ),
      };
    }
    console.error("token reservation failed:", err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Could not check your token balance" },
        { status: 503 }
      ),
    };
  }

  let charged = 0;
  let settled: TokenMeta | null = null;
  const refineMargin =
    action.kind === "refine" ? REFINE_MARGIN_MULTIPLIER : 1;

  const meter: Meter = {
    record(usage, actualApiModel) {
      charged += billUsageTokens(
        tokensForUsage(usage, model, actualApiModel),
        refineMargin
      );
    },
    recordFallback(fallbackAction) {
      // fallbackTokens → estimateTokens; refine estimates already include margin.
      charged += fallbackTokens(fallbackAction, model);
    },
    forgive() {
      charged = 0;
    },
    async settle() {
      if (settled) return settled;
      try {
        const result = await client.mutation(api.tokens.settle, {
          reservationId,
          actualTokens: charged,
          model,
          serverSecret,
        });
        settled = {
          tokens: result.charged,
          balance: result.balance,
          estimated: estimate.typical,
          committed: true,
        };
        return settled;
      } catch (err) {
        // Do not mark settled — `finally` may retry. Hold still expires on its
        // own if every settle attempt fails, so the customer is not stuck.
        console.error("token settle failed:", err);
        return {
          tokens: 0,
          balance: -1,
          estimated: estimate.typical,
          committed: false,
        };
      }
    },
  };

  return { ok: true, meter };
}
