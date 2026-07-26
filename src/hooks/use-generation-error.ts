"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  trackGenerationFailure,
  type GenerateAction,
} from "@/lib/analytics";

/** Billing failures route to pricing; everything else is a toast. */
export function useGenerationErrorReporter() {
  const router = useRouter();

  return (
    err: unknown,
    fallback: string,
    action: GenerateAction,
    code?: string
  ) => {
    const message = err instanceof Error ? err.message : fallback;
    trackGenerationFailure(action, code);
    if (code === "NO_SUBSCRIPTION" || code === "INSUFFICIENT_TOKENS") {
      toast.error(message, {
        action: {
          label: code === "NO_SUBSCRIPTION" ? "See plans" : "Top up",
          onClick: () => router.push("/pricing"),
        },
      });
      return;
    }
    toast.error(message);
  };
}
