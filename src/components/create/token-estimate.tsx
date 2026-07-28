"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Coins, TrendingDown, TriangleAlert } from "lucide-react";
import {
  MASCOT_MODEL_OPTIONS,
  mascotModelOption,
} from "@/lib/mascot-model-options";
import {
  estimateTokens,
  formatTokens,
  runsRemaining,
} from "@/lib/token-pricing";
import type { MascotModelId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenBalance } from "@/lib/use-token-balance";
import { cn } from "@/lib/utils";

type Props = {
  model: MascotModelId | null;
  gestures: number;
  /**
   * "full" quotes samples plus the studio build (the brief step); "studio"
   * quotes only what is left to spend after samples have been generated;
   * "remix" quotes example remix (identity + per-pose edits).
   */
  scope: "full" | "studio" | "remix";
  /** Pose count for remix scope. */
  poses?: number;
  /** Measured prompt payload for remix (manifests + brief). */
  payloadChars?: number;
  /** Extra gestures added after remix via `/api/generate/gesture`. */
  extraGestures?: number;
  /** Proxy pack size for post-remix gesture calls. */
  gesturePayloadChars?: number;
  /** User attached a design reference image (vision surcharge). */
  hasReference?: boolean;
  availableModels?: MascotModelId[];
  className?: string;
};

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[var(--brand-muted)]">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          muted ? "text-[var(--brand-muted)]" : "text-white"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TokenEstimate({
  model,
  gestures,
  scope,
  poses,
  payloadChars = 0,
  extraGestures = 0,
  gesturePayloadChars = 0,
  hasReference = false,
  availableModels,
  className,
}: Props) {
  const balance = useTokenBalance();

  const quote = useMemo(() => {
    if (!model) return null;
    if (scope === "remix") {
      const count = poses ?? gestures;
      const remix = estimateTokens(
        {
          kind: "remix",
          poses: count,
          payloadChars,
          referenceImages: hasReference ? 1 : 0,
        },
        model
      );
      const gestureQuote =
        extraGestures > 0 && gesturePayloadChars > 0
          ? estimateTokens(
              { kind: "gesture", payloadChars: gesturePayloadChars },
              model
            )
          : null;
      const extrasTypical = gestureQuote
        ? gestureQuote.typical * extraGestures
        : 0;
      const extrasMax = gestureQuote ? gestureQuote.max * extraGestures : 0;
      return {
        samples: null,
        studio: remix,
        extras: gestureQuote
          ? { typical: extrasTypical, max: extrasMax, count: extraGestures }
          : null,
        total: remix.typical + extrasTypical,
        remix,
      };
    }
    const studio = estimateTokens(
      {
        kind: "studio",
        gestures,
        referenceImages: hasReference ? 2 : 0,
      },
      model
    );
    const samples = estimateTokens(
      {
        kind: "samples",
        referenceImages: hasReference ? 1 : 0,
      },
      model
    );
    return {
      samples,
      studio,
      extras: null,
      total:
        scope === "full" ? samples.typical + studio.typical : studio.typical,
      remix: null,
    };
  }, [
    model,
    gestures,
    poses,
    scope,
    payloadChars,
    extraGestures,
    gesturePayloadChars,
    hasReference,
  ]);

  /** Cheapest configured alternative, shown only when it is a real saving. */
  const cheaper = useMemo(() => {
    if (!model || !quote) return null;
    const candidates = MASCOT_MODEL_OPTIONS.filter(
      (option) =>
        option.id !== model &&
        (!availableModels || availableModels.includes(option.id))
    );

    let best: { id: MascotModelId; label: string; saving: number } | null = null;
    for (const option of candidates) {
      const studio = estimateTokens(
        {
          kind: "studio",
          gestures,
          referenceImages: hasReference ? 2 : 0,
        },
        option.id
      );
      const samples = estimateTokens(
        {
          kind: "samples",
          referenceImages: hasReference ? 1 : 0,
        },
        option.id
      );
      const remix =
        scope === "remix"
          ? estimateTokens(
              {
                kind: "remix",
                poses: poses ?? gestures,
                payloadChars,
                referenceImages: hasReference ? 1 : 0,
              },
              option.id
            )
          : null;
      const gestureQuote =
        scope === "remix" && extraGestures > 0 && gesturePayloadChars > 0
          ? estimateTokens(
              { kind: "gesture", payloadChars: gesturePayloadChars },
              option.id
            )
          : null;
      const total =
        scope === "remix"
          ? (remix?.typical ?? 0) +
            (gestureQuote?.typical ?? 0) * extraGestures
          : scope === "full"
            ? samples.typical + studio.typical
            : studio.typical;
      const saving = Math.round((1 - total / quote.total) * 100);
      if (saving >= 20 && (!best || saving > best.saving)) {
        best = { id: option.id, label: option.label, saving };
      }
    }
    return best;
  }, [
    model,
    gestures,
    poses,
    scope,
    quote,
    availableModels,
    payloadChars,
    extraGestures,
    gesturePayloadChars,
    hasReference,
  ]);

  if (!model || !quote) return null;

  const option = mascotModelOption(model);
  const available = balance?.total ?? null;
  const affordable = available == null || available >= quote.total;
  const remaining =
    available == null ? null : runsRemaining(available, quote.total);
  const usedPct =
    available == null || available <= 0
      ? 100
      : Math.min(100, Math.round((quote.total / available) * 100));

  return (
    <div
      className={cn(
        "space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
            Estimated cost
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tabular-nums">
            {formatTokens(quote.total)}
            <span className="ml-1.5 text-base text-[var(--brand-muted)]">
              tokens
            </span>
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/80">
          <Coins className="size-3" />
          {option.label}
        </span>
      </div>

      <div className="space-y-1.5 border-t border-white/10 pt-3">
        {scope === "full" && quote.samples && (
          <Row label="3 look samples" value={formatTokens(quote.samples.typical)} />
        )}
        {scope === "remix" ? (
          <>
            <Row
              label={`Example remix · ${poses ?? gestures} pose${(poses ?? gestures) === 1 ? "" : "s"}`}
              value={formatTokens(quote.studio.typical)}
            />
            {quote.extras && quote.extras.count > 0 && (
              <Row
                label={`Extra gestures · ${quote.extras.count}`}
                value={formatTokens(quote.extras.typical)}
              />
            )}
          </>
        ) : (
          <Row
            label={`Animated studio · ${gestures} gesture${gestures === 1 ? "" : "s"}`}
            value={formatTokens(quote.studio.typical)}
          />
        )}
        <Row
          label={`${quote.studio.calls + (scope === "full" && quote.samples ? 1 : 0) + (quote.extras?.count ?? 0)} model calls`}
          value={`up to ${formatTokens(
            scope === "full" && quote.samples
              ? quote.samples.max + quote.studio.max
              : quote.studio.max + (quote.extras?.max ?? 0)
          )}`}
          muted
        />
      </div>

      {balance === undefined ? (
        <Skeleton className="h-14 rounded-2xl" />
      ) : available != null ? (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[var(--brand-muted)]">Your balance</span>
            <span className="font-medium tabular-nums text-white">
              {formatTokens(available)}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={usedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Share of your balance this generation uses"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                affordable ? "bg-[var(--brand-accent)]" : "bg-red-400"
              )}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {affordable && remaining != null && (
            <p className="text-xs text-[var(--brand-muted)]">
              Enough for {remaining} more {remaining === 1 ? "mascot" : "mascots"}{" "}
              at this setup.
            </p>
          )}
        </div>
      ) : null}

      {!affordable && (
        <Link
          href="/pricing"
          className="flex items-start gap-2.5 rounded-2xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-100 transition hover:border-red-400/50"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Short by {formatTokens(quote.total - (available ?? 0))} tokens. Top up
            or switch to a lighter model.
          </span>
        </Link>
      )}

      {affordable && cheaper && (
        <p className="flex items-start gap-2 text-xs text-[var(--brand-muted)]">
          <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-accent)]" />
          <span>
            {cheaper.label} would cost {cheaper.saving}% fewer tokens for the same
            setup.
          </span>
        </p>
      )}
    </div>
  );
}
