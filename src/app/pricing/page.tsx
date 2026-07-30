"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { Check, Coins, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PriceSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { trackGoogleAdsSubscribeConversion } from "@/components/google-ads-tag";
import { useRevenueCat } from "@/components/providers/revenuecat-provider";
import { trackEvent } from "@/lib/analytics";
import { MASCOT_MODEL_OPTIONS } from "@/lib/mascot-model-options";
import {
  estimateFullCreate,
  formatTokens,
  runsRemaining,
} from "@/lib/token-pricing";
import { useTokenBalance } from "@/lib/use-token-balance";
import { cn } from "@/lib/utils";
import {
  PLANS,
  TOPUPS,
  planById,
  savingsVersus,
  tokensPerTerm,
  type Plan,
  type Topup,
} from "../../../convex/lib/plans";

/** Gestures used for the "mascots per cycle" maths shown on the cards. */
const REFERENCE_GESTURES = 4;

const TERM_LABEL: Record<Plan["term"], string> = {
  week: "/week",
  month: "/month",
  year: "/year",
};

/** Cheapest and priciest full create, so cards can quote an honest range. */
const CREATE_COST = (() => {
  const costs = MASCOT_MODEL_OPTIONS.map(
    (option) => estimateFullCreate(REFERENCE_GESTURES, option.id).typical
  );
  return { min: Math.min(...costs), max: Math.max(...costs) };
})();

function mascotRange(tokens: number) {
  return {
    low: runsRemaining(tokens, CREATE_COST.max),
    high: runsRemaining(tokens, CREATE_COST.min),
  };
}

function PlanCard({
  plan,
  price,
  priceLoading,
  saving,
  featured,
  current,
  busy,
  disabled,
  onSelect,
}: {
  plan: Plan;
  price: string | null;
  priceLoading?: boolean;
  saving: number;
  featured: boolean;
  current: boolean;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const range = mascotRange(plan.tokensPerCycle);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[1.75rem] border p-6 backdrop-blur transition sm:p-7",
        featured
          ? "border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/[0.07] shadow-[0_0_60px_-25px_var(--brand-accent)]"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-[var(--brand-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#12141c]">
          Most popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {plan.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {plan.tagline}
          </p>
        </div>
        {saving > 0 && (
          <span className="shrink-0 rounded-full border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-accent)]">
            Save {saving}%
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-4xl tabular-nums sm:text-5xl">
          {priceLoading ? (
            <PriceSkeleton className="h-10 w-28 sm:h-12" />
          ) : (
            (price ?? "…")
          )}
        </span>
        {price && !priceLoading && (
          <span className="text-sm text-[var(--brand-muted)]">
            {TERM_LABEL[plan.term]}
          </span>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5">
        <p className="flex items-baseline gap-1.5">
          <Coins className="size-4 self-center text-[var(--brand-accent)]" />
          <span className="text-lg font-semibold tabular-nums">
            {formatTokens(plan.tokensPerCycle)}
          </span>
          <span className="text-sm text-[var(--brand-muted)]">
            tokens / {plan.cycle}
          </span>
        </p>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          Roughly {range.low}-{range.high} full mascots a {plan.cycle}, depending
          on the model you pick.
        </p>
      </div>

      <ul className="mt-5 space-y-2.5 text-sm">
        {plan.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand-accent)]" />
            <span className="text-white/85">{item}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onSelect}
        disabled={disabled || current}
        className={cn(
          "mt-6 w-full",
          featured
            ? "bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
            : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
        )}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {current ? "Current plan" : `Get ${plan.name.toLowerCase()}`}
      </Button>
    </div>
  );
}

function TopupCard({
  topup,
  price,
  priceLoading,
  busy,
  disabled,
  onSelect,
}: {
  topup: Topup;
  price: string | null;
  priceLoading?: boolean;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const range = mascotRange(topup.tokens);

  return (
    <div className="flex flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{topup.name}</h3>
        <span className="font-[family-name:var(--font-display)] text-xl tabular-nums">
          {priceLoading ? (
            <PriceSkeleton className="h-6 w-16" />
          ) : (
            (price ?? "…")
          )}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--brand-muted)]">
        {formatTokens(topup.tokens)} tokens · about {range.low}-{range.high}{" "}
        mascots. Never expires.
      </p>
      <Button
        variant="outline"
        onClick={onSelect}
        disabled={disabled}
        className="mt-4 w-full border-white/15 bg-transparent text-white hover:bg-white/10"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {price ? `Buy for ${price}` : "Unavailable"}
      </Button>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const balance = useTokenBalance(isSignedIn === true);
  const { status, purchasing, getPrice, purchase } = useRevenueCat();
  const syncPurchases = useAction(api.billingSync.syncMyPurchases);

  // Tokens are granted by the RevenueCat webhook, so checkout finishing is not
  // the same as the plan being live. Watch the reactive balance for the change.
  const [awaiting, setAwaiting] = useState<"plan" | "topup" | null>(null);
  const [managing, setManaging] = useState(false);
  const baseline = useRef({
    hasAccess: false,
    total: 0,
    planId: null as string | null,
  });
  // Guard against Strict Mode / balance ticks double-firing the Ads conversion.
  const adsSubscribeSent = useRef(false);

  useEffect(() => {
    if (!awaiting || !balance) return;

    const activated =
      (balance.hasAccess && !baseline.current.hasAccess) ||
      balance.planId !== baseline.current.planId;
    const credited = balance.total > baseline.current.total;
    if (!activated && !credited) return;

    const kind = awaiting;
    setAwaiting(null);
    trackEvent("checkout_completed", {
      kind,
      plan: balance.planId ?? "none",
    });
    if (kind === "plan" && activated) {
      if (!adsSubscribeSent.current) {
        adsSubscribeSent.current = true;
        trackGoogleAdsSubscribeConversion();
      }
      toast.success("You're in. Let's build your mascot.");
      router.push("/create");
    } else {
      toast.success(`${formatTokens(balance.total)} tokens ready to spend.`);
    }
  }, [awaiting, balance, router]);

  // Webhooks are usually instant, but never leave the button spinning forever.
  useEffect(() => {
    if (!awaiting) return;
    const timer = setTimeout(() => {
      setAwaiting(null);
      toast.info("Payment received. Your tokens will show up in a moment.");
    }, 45_000);
    return () => clearTimeout(timer);
  }, [awaiting]);

  const weeklyPlan = PLANS[0];
  const weeklyPrice = weeklyPlan ? getPrice(weeklyPlan.productId) : null;

  const checkout = async (productId: string, kind: "plan" | "topup") => {
    // Visitors can compare plans without an account; buying needs one. Clerk
    // sends an already-signed-in user straight back, so an unresolved session
    // is safe to treat as signed out here.
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }
    if (status !== "ready") {
      toast.error("Checkout is unavailable right now. Please try again later.");
      return;
    }
    if (!getPrice(productId)) {
      toast.error("This product is not available right now.");
      return;
    }
    baseline.current = {
      hasAccess: balance?.hasAccess ?? false,
      total: balance?.total ?? 0,
      planId: balance?.planId ?? null,
    };
    trackEvent("checkout_started", { product: productId, kind });
    const ok = await purchase(productId);
    if (!ok) return;
    setAwaiting(kind);
    // Webhook is primary; REST sync recovers when the destination was missing
    // or delayed so the pricing page does not spin forever after a paid checkout.
    void syncPurchases().catch((err) => {
      console.error("[pricing] purchase sync failed:", err);
    });
  };

  const currentPlan = balance?.planId ? planById(balance.planId) : null;
  const hasSubscription = Boolean(balance?.planId);
  const busy = purchasing != null || awaiting != null;

  const openBillingPortal = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    setManaging(true);
    try {
      const res = await fetch("/api/billing/manage");
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        toast.error(payload.error ?? "Could not open billing portal.");
        return;
      }
      trackEvent("billing_portal_opened", { plan: balance?.planId ?? "none" });
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open billing portal. Try again shortly.");
    } finally {
      setManaging(false);
    }
  };
  const catalogLoading = status === "loading";
  const loading =
    isSignedIn === true && (catalogLoading || balance === undefined);

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.14),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.1),transparent_50%)]" />
      <div className="relative">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          <header className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
              Pricing
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
              Give your app a face
            </h1>
            <p className="mt-3 text-[var(--brand-muted)]">
              Every plan includes all six models. You spend tokens only when you
              generate, and you see the cost before you hit create.
            </p>
          </header>

          {balance?.hasAccess && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[var(--brand-accent)]" />
                  <span className="font-medium">
                    {currentPlan?.name ?? "Top-up"} active
                  </span>
                </span>
                <span className="text-[var(--brand-muted)]">
                  {formatTokens(balance.total)} tokens left
                  {hasSubscription && balance.willRenew && balance.cycleEnd
                    ? ` · refills ${new Date(balance.cycleEnd).toLocaleDateString()}`
                    : ""}
                  {hasSubscription &&
                  !balance.willRenew &&
                  balance.expiresAt
                    ? ` · access until ${new Date(balance.expiresAt).toLocaleDateString()}`
                    : ""}
                </span>
              </div>
              {hasSubscription && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={managing || busy}
                  onClick={() => void openBillingPortal()}
                  className="shrink-0 border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  {managing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                  Manage subscription
                </Button>
              )}
            </div>
          )}

          <section className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const price = getPrice(plan.productId);
              const saving =
                weeklyPlan && weeklyPrice && price
                  ? savingsVersus(
                      plan,
                      weeklyPlan,
                      price.amountUsd,
                      weeklyPrice.amountUsd
                    )
                  : 0;

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  price={price?.formattedPrice ?? null}
                  priceLoading={catalogLoading}
                  saving={saving}
                  featured={plan.id === "monthly"}
                  current={currentPlan?.id === plan.id}
                  busy={purchasing === plan.productId || awaiting === "plan"}
                  disabled={busy || loading || !price}
                  onSelect={() => void checkout(plan.productId, "plan")}
                />
              );
            })}
          </section>

          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Need more this cycle?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--brand-muted)]">
              Top-ups are one-time packs that sit on top of your plan allowance.
              They roll over and are spent only after your monthly tokens run
              out.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {TOPUPS.map((topup) => {
                const price = getPrice(topup.productId);
                return (
                  <TopupCard
                    key={topup.id}
                    topup={topup}
                    price={price?.formattedPrice ?? null}
                    priceLoading={catalogLoading}
                    busy={purchasing === topup.productId}
                    disabled={busy || loading || !price}
                    onSelect={() => void checkout(topup.productId, "topup")}
                  />
                );
              })}
            </div>
          </section>

          <p className="mt-10 max-w-2xl text-xs leading-relaxed text-[var(--brand-muted)]">
            Prices in USD. Subscriptions renew automatically and can be
            cancelled any time. You keep your tokens until the cycle ends.
            Yearly plans are billed once and refill{" "}
            {formatTokens(PLANS[2].tokensPerCycle)} tokens every month, for{" "}
            {formatTokens(tokensPerTerm(PLANS[2]))} tokens across the year.
          </p>

          {status === "unavailable" && (
            <p className="mt-4 text-xs text-red-300">
              Live prices are temporarily unavailable. Please refresh or come
              back shortly.
            </p>
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
