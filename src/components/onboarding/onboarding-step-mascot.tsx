"use client";

import {
  AnimatedBrandMark,
  type BrandMarkGesture,
} from "@/components/animated-brand-mark";
import type { OnboardingStep } from "@/lib/onboarding-flow";
import { cn } from "@/lib/utils";

function gestureForStep(
  step: OnboardingStep,
  useCase: string | null
): BrandMarkGesture {
  switch (step) {
    case "pitch":
      return "welcome";
    case "old-way":
      return "thinking";
    case "building":
      if (useCase === "web") return "curious-web";
      if (useCase === "mobile") return "curious-mobile";
      if (useCase === "game") return "curious-game";
      return "curious";
    case "context":
      return "listening";
    case "proof":
      return "proud";
    case "examples":
      return "showcase";
    default:
      return "welcome";
  }
}

type Props = {
  step: OnboardingStep;
  useCase?: string | null;
  className?: string;
};

/** Step-aware animated brand mascot for onboarding. One premium gesture per screen. */
export function OnboardingStepMascot({ step, useCase = null, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto mb-8 flex h-28 w-24 items-center justify-center overflow-visible sm:h-32 sm:w-28",
        className
      )}
    >
      <AnimatedBrandMark
        gesture={gestureForStep(step, useCase)}
        className="h-full w-full"
      />
    </div>
  );
}
