"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  Gamepad2,
  Globe,
  Loader2,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { answered, oneOf, trackEvent } from "@/lib/analytics";
import {
  OLD_WAY_POINTS,
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_STEPS,
  type OnboardingDraft,
  type OnboardingStep,
  parseOnboardingDraft,
  sanitizeOnboardingFavorite,
  serializeOnboardingDraft,
} from "@/lib/onboarding-flow";
import { BrandLogo } from "@/components/brand-logo";
import { OnboardingExamplePicker } from "@/components/onboarding/onboarding-example-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PUBLIC_EXAMPLES } from "@/lib/mascots";
import { PROOF_POINTS, PROOF_QUOTE } from "@/lib/proof";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

const STEPS = ONBOARDING_STEPS;
type Step = OnboardingStep;

const DRAFT_KEY = "mascot-ai:onboarding-draft";

function loadDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  return parseOnboardingDraft(raw);
}

function saveDraft(draft: OnboardingDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, serializeOnboardingDraft(draft));
  } catch {
    /* quota / private mode */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const USE_CASES = [
  {
    id: "web",
    label: "Web app",
    hint: "Dashboards, onboarding, empty states",
    icon: Globe,
  },
  {
    id: "mobile",
    label: "Mobile app",
    hint: "iOS and Android companions",
    icon: Smartphone,
  },
  {
    id: "game",
    label: "Game",
    hint: "Characters with real personality",
    icon: Gamepad2,
  },
] as const;

const STACKS = [
  "Next.js",
  "React",
  "React Native",
  "SwiftUI",
  "Flutter",
  "Unity",
  "Vue",
  "Svelte",
] as const;

const REFERRALS = [
  "X / Twitter",
  "A friend or colleague",
  "Product Hunt",
  "Reddit",
  "YouTube",
  "Google",
  "Somewhere else",
] as const;

const PAID_BEFORE = [
  { id: "agency", label: "Yes — agency or freelancer" },
  { id: "marketplace", label: "Yes — stock or marketplace" },
  { id: "never", label: "No — first time for me" },
] as const;

/** Shared across pitch CTA, Continue, and finish so every step matches. */
const PRIMARY_BTN =
  "w-full bg-[var(--brand-accent)] px-8 text-[#12141c] hover:bg-[var(--brand-accent)]/90 sm:w-auto";
const BACK_BTN = "w-full text-[var(--brand-muted)] hover:text-white sm:w-auto";

function firstName(name: string | null | undefined) {
  if (!name?.trim()) return "there";
  return name.trim().split(/\s+/)[0]!;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-transparent bg-[var(--brand-accent)] text-[#12141c]"
          : "border-white/15 bg-white/[0.03] text-white/80 hover:border-white/30"
      )}
    >
      {children}
    </button>
  );
}

function Question({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      {hint && (
        <p className="mt-0.5 text-sm text-[var(--brand-muted)]">{hint}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function OnboardingFlow() {
  const { user } = useUser();
  const complete = useMutation(api.users.completeOnboarding);

  const [draft] = useState(loadDraft);
  const [step, setStep] = useState<Step>(() => draft?.step ?? "pitch");
  const [useCase, setUseCase] = useState<string | null>(() => draft?.useCase ?? null);
  const [stack, setStack] = useState(() => draft?.stack ?? "");
  const [referral, setReferral] = useState<string | null>(() => draft?.referral ?? null);
  const [paidBefore, setPaidBefore] = useState<string | null>(
    () => draft?.paidBefore ?? null
  );
  const [favorite, setFavorite] = useState<string | null>(
    () => draft?.favorite ?? null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    saveDraft({ step, useCase, stack, referral, paidBefore, favorite });
  }, [step, useCase, stack, referral, paidBefore, favorite]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const displayName = firstName(user?.firstName ?? user?.fullName);

  const go = (delta: number) => {
    const target = STEPS[stepIndex + delta];
    if (!target) return;
    setStep(target);
    // Only forward moves count: a step re-entered via Back would otherwise
    // read as extra progress and flatten the drop-off curve.
    if (delta > 0) {
      trackEvent("onboarding_step", {
        step: target,
        flow: String(ONBOARDING_FLOW_VERSION),
      });
    }
  };

  const finish = async () => {
    if (!useCase) {
      toast.error("Tell us what you're building first");
      setStep("building");
      return;
    }
    setBusy(true);
    try {
      // AccessGate routes onward once onboarding is marked complete.
      await complete({
        useCase,
        stack: stack || undefined,
        referral: referral ?? undefined,
        paidBefore: paidBefore ?? undefined,
        favoriteExample: sanitizeOnboardingFavorite(favorite) ?? undefined,
      });
      trackEvent("onboarding_completed", {
        useCase,
        referral: answered(referral),
      });
      // `stack` is a free-text field, so it is bucketed to our own suggestions
      // before leaving the browser.
      trackEvent("onboarding_profile", {
        stack: oneOf(stack, STACKS),
        paidBefore: answered(paidBefore),
      });
      clearDraft();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t finish setup");
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_-80px,rgba(245,179,79,0.2),transparent_55%),radial-gradient(600px_400px_at_100%_50%,rgba(88,140,255,0.12),transparent_50%),linear-gradient(180deg,#0f1528,#0b1020)]" />
        <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-[rgba(245,179,79,0.06)] blur-3xl motion-safe:animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[rgba(80,120,220,0.08)] blur-3xl motion-safe:animate-[drift_24s_ease-in-out_infinite_reverse]" />
      </div>

      <header className="relative z-10 px-5 pt-6 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mx-auto mt-4 h-1 max-w-2xl overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--brand-accent)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div
          key={step}
          className="mx-auto w-full max-w-2xl motion-safe:animate-[rise_0.55s_ease-out_both]"
        >
          {step === "pitch" && (
            <div className="text-center">
              <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-[1.75rem] border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10 shadow-[0_0_60px_rgba(245,179,79,0.15)]">
                <Sparkles className="size-9 text-[var(--brand-accent)]" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)]">
                Welcome, {displayName}
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
                Every great app has a personality
              </h1>
              <div className="mx-auto mt-5 max-w-lg space-y-4 text-left text-[17px] leading-relaxed text-[var(--brand-muted)] sm:text-center">
                <p>
                  Duolingo has Duo. Mailchimp has Freddie. Most teams settle for
                  a static logo or a generic AI blob.
                </p>
                <p>
                  We used AI to build mascot studios for real products. The
                  craft was too good to keep as one-offs.
                </p>
                <p className="text-white/90">
                  So we opened it up for everyone to try it. Animated, gestural, downloadable, and
                  ready to drop into whatever you&apos;re shipping.
                </p>
              </div>
            </div>
          )}

          {step === "old-way" && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)]">
                The usual path
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                A custom mascot used to be a project, not a feature
              </h2>
              <p className="mt-2 text-[var(--brand-muted)]">
                Most teams still buy one the hard way.
              </p>

              <div className="mt-8 space-y-3">
                {OLD_WAY_POINTS.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5"
                  >
                    <p className="font-medium text-white/95">{item.label}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--brand-muted)]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-[15px] leading-relaxed text-white/90">
                We built the studio so you can skip that gauntlet — gestural
                mascots you can iterate on and ship without waiting on a studio
                timeline.
              </p>
            </div>
          )}

          {step === "building" && (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                What are you building?
              </h2>
              <p className="mt-2 text-[var(--brand-muted)]">
                Your mascot needs to fit where it lives.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {USE_CASES.map((item) => {
                  const Icon = item.icon;
                  const on = useCase === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setUseCase(item.id)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-[1.25rem] border p-5 text-left transition",
                        on
                          ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 ring-2 ring-[var(--brand-accent)]/35"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5",
                          on ? "text-[var(--brand-accent)]" : "text-white/50"
                        )}
                      />
                      <p className="mt-3 font-[family-name:var(--font-display)] text-lg">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        {item.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "context" && (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                Three quick things
              </h2>
              <p className="mt-2 text-[var(--brand-muted)]">
                Optional. Helps us ship the right export formats later.
              </p>

              <div className="mt-8 space-y-7">
                <Question
                  label="What's your stack?"
                  hint="So downloads land in a format you can drop straight in."
                >
                  <Input
                    value={stack}
                    onChange={(e) => setStack(e.target.value.slice(0, 120))}
                    placeholder="Next.js + Tailwind"
                    className="border-white/15 bg-white/[0.04] text-white placeholder:text-white/35"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STACKS.map((name) => (
                      <Chip
                        key={name}
                        active={stack === name}
                        onClick={() => setStack(stack === name ? "" : name)}
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                </Question>

                <Question label="How did you hear about MascotAI?">
                  <div className="flex flex-wrap gap-2">
                    {REFERRALS.map((name) => (
                      <Chip
                        key={name}
                        active={referral === name}
                        onClick={() =>
                          setReferral(referral === name ? null : name)
                        }
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                </Question>

                <Question label="Have you commissioned a mascot before?">
                  <div className="flex flex-wrap gap-2">
                    {PAID_BEFORE.map((option) => (
                      <Chip
                        key={option.id}
                        active={paidBefore === option.id}
                        onClick={() =>
                          setPaidBefore(
                            paidBefore === option.id ? null : option.id
                          )
                        }
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </Question>
              </div>
            </div>
          )}

          {step === "proof" && (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                Why bother with a mascot?
              </h2>
              <p className="mt-2 text-[var(--brand-muted)]">
                Brand research keeps finding the same thing: characters stick.
              </p>

              <div className="mt-8 space-y-3">
                {PROOF_POINTS.map((item) => (
                  <div
                    key={item.stat}
                    className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-baseline sm:gap-5"
                  >
                    <p className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-[var(--brand-accent)] sm:w-24 sm:shrink-0">
                      {item.stat}
                    </p>
                    <div>
                      <p className="font-medium">{item.claim}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--brand-muted)]">
                        {item.detail}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/35">
                        {item.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <blockquote className="mt-6 border-l-2 border-[var(--brand-accent)]/60 pl-5 text-[15px] leading-relaxed text-white/85">
                “{PROOF_QUOTE.text}”
                <footer className="mt-2 text-sm text-[var(--brand-muted)]">
                  {PROOF_QUOTE.attribution}
                </footer>
              </blockquote>
            </div>
          )}

          {step === "examples" && (
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
                Here&apos;s the bar
              </h2>

              <div className="mt-8">
                <OnboardingExamplePicker
                  examples={PUBLIC_EXAMPLES}
                  favorite={favorite}
                  onFavoriteChange={setFavorite}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-8 sm:px-8">
        <div
          className={cn(
            "mx-auto flex w-full max-w-2xl gap-3",
            step === "pitch"
              ? "flex-col sm:flex-row sm:justify-end"
              : "flex-col-reverse sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          {step !== "pitch" && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={busy}
              className={BACK_BTN}
              onClick={() => go(-1)}
            >
              Back
            </Button>
          )}
          {step === "examples" ? (
            <Button
              type="button"
              size="lg"
              disabled={busy}
              className={PRIMARY_BTN}
              onClick={() => void finish()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Build my mascot
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className={PRIMARY_BTN}
              disabled={step === "building" && !useCase}
              onClick={() => go(1)}
            >
              {step === "pitch" ? "Show me" : "Continue"}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
