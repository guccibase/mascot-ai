"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRevenueCat } from "@/components/providers/revenuecat-provider";
import { PriceSkeleton } from "@/components/skeletons";
import { buttonVariants } from "@/components/ui/button";
import { formatTokens } from "@/lib/token-pricing";
import { cn } from "@/lib/utils";
import { PLANS, savingsVersus } from "../../convex/lib/plans";

const TERM_LABEL: Record<(typeof PLANS)[number]["term"], string> = {
  week: "/week",
  month: "/month",
  year: "/year",
};

function PriceAmount({
  formatted,
  loading,
}: {
  formatted: string | null;
  loading: boolean;
}) {
  if (loading) {
    return <PriceSkeleton className="h-8 w-20" />;
  }
  if (!formatted) {
    return (
      <span className="text-base text-[var(--brand-muted)]">See pricing</span>
    );
  }
  return formatted;
}

export function HomePricingTeaser() {
  const { status, getPrice } = useRevenueCat();
  const [weekly, monthly, yearly] = PLANS;
  const loading = status === "loading";
  const weeklyPrice = getPrice(weekly!.productId);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
            Pay for what you generate
          </h2>
          <p className="mt-3 max-w-xl text-[var(--brand-muted)]">
            Every plan includes six models from OpenAI and Anthropic. You
            see the token cost before you hit create.
          </p>
        </div>
        <Link
          href="/pricing"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-white/15 bg-transparent text-white hover:bg-white/10"
          )}
        >
          Compare plans
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[weekly!, monthly!, yearly!].map((plan) => {
          const price = getPrice(plan.productId);
          const saving =
            weeklyPrice && price
              ? savingsVersus(
                  plan,
                  weekly!,
                  price.amountUsd,
                  weeklyPrice.amountUsd
                )
              : 0;

          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-[1.25rem] border p-5",
                plan.id === "monthly"
                  ? "border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/[0.06]"
                  : "border-white/10 bg-black/20"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{plan.name}</p>
                {saving > 0 && (
                  <span className="text-[11px] font-semibold text-[var(--brand-accent)]">
                    Save {saving}%
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1 font-[family-name:var(--font-display)] text-3xl tabular-nums">
                <PriceAmount
                  formatted={price?.formattedPrice ?? null}
                  loading={loading}
                />
                {price && (
                  <span className="text-sm text-[var(--brand-muted)]">
                    {TERM_LABEL[plan.term]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">
                {formatTokens(plan.tokensPerCycle)} tokens every {plan.cycle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
