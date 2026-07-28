"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { ReferenceImageUpload } from "@/components/reference-image-upload";
import { DEFAULT_MASCOT_MODEL } from "@/lib/mascot-model-options";
import { isReferenceId } from "@/lib/reference-image-client";
import {
  MAX_REFINE_HISTORY_MESSAGES,
  MAX_REFINE_MESSAGE_CHARS,
} from "@/lib/refine-limits";
import {
  maxRefinePayloadChars,
  splitRefineGestures,
} from "@/lib/refine-pack";
import { estimateTokens, formatTokens } from "@/lib/token-pricing";
import { useAffordability } from "@/lib/use-affordability";
import type {
  GeneratedMascot,
  MascotModelId,
  MascotPart,
  RefineMessage,
} from "@/lib/types";
import { trackEvent, trackGenerationFailure } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Props = {
  mascot: GeneratedMascot;
  look?: string;
  model?: MascotModelId;
  enabledParts: Set<string>;
  onMascotChange?: (mascot: GeneratedMascot) => void;
  referenceId?: string;
  onReferenceIdChange?: (referenceId: string | undefined) => void;
  mutationBusy?: boolean;
  onMutationStart?: () => boolean;
  onMutationEnd?: () => void;
  isMutationCurrent?: () => boolean;
  accent: string;
};

type PartsPanelProps = {
  parts: MascotPart[];
  enabledParts: Set<string>;
  onTogglePart: (key: string) => void;
  accent: string;
};

/** Instant, reversible SVG layer controls; independent from metered AI edits. */
export function MascotPartsPanel({
  parts,
  enabledParts,
  onTogglePart,
  accent,
}: PartsPanelProps) {
  const partsByCategory = useMemo(() => {
    const map = new Map<string, MascotPart[]>();
    for (const part of parts) {
      const list = map.get(part.category) ?? [];
      list.push(part);
      map.set(part.category, list);
    }
    return [...map.entries()];
  }, [parts]);

  return (
    <div
      className="mt-2 flex flex-col gap-5 border-t pt-5"
      style={{ borderColor: `${accent}29` }}
    >
      <div>
        <h3 className="gs-eyebrow mb-2">Elements</h3>
        <p style={{ fontSize: 12.5, color: "#B5AC9A", lineHeight: 1.5 }}>
          Toggle parts on/off instantly. Hidden parts stay available to add back.
        </p>
      </div>

      <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
        {partsByCategory.map(([category, categoryParts]) => (
          <div key={category}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".16em",
                color: "#8D8472",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {category}
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryParts.map((part) => {
                const enabled = enabledParts.has(part.key);
                return (
                  <button
                    key={part.key}
                    type="button"
                    title={part.description || part.label}
                    onClick={() => onTogglePart(part.key)}
                    aria-pressed={enabled}
                    className={cn("gs-pill", enabled && "on")}
                    style={
                      enabled
                        ? undefined
                        : {
                            opacity: 0.55,
                            textDecoration: "line-through",
                          }
                    }
                  >
                    {part.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {parts.length === 0 && (
          <p style={{ fontSize: 12.5, color: "#8D8472" }}>
            No tagged parts are available for this mascot.
          </p>
        )}
      </div>
    </div>
  );
}

export function MascotEditPanel({
  mascot,
  look,
  model,
  enabledParts,
  onMascotChange,
  referenceId,
  onReferenceIdChange,
  mutationBusy = false,
  onMutationStart,
  onMutationEnd,
  isMutationCurrent,
  accent,
}: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<RefineMessage[]>([]);
  const identity = `${mascot.name}\0${mascot.tagline}`;
  const [previousIdentity, setPreviousIdentity] = useState(identity);

  if (previousIdentity !== identity) {
    setPreviousIdentity(identity);
    setHistory([]);
    setDraft("");
  }

  /**
   * What `/api/generate/refine` will hold before it runs: the route reserves the
   * worst case of the same quote. Checking it here means a customer without
   * tokens sees the paywall instead of typing an edit that can only 402.
  */
  const reservation = useMemo(() => {
    const batches = splitRefineGestures(mascot.gestures).length;
    return estimateTokens(
      {
        kind: "refine",
        batches,
        payloadChars: maxRefinePayloadChars(mascot),
        referenceImages: isReferenceId(referenceId) ? batches : 0,
      },
      model ?? DEFAULT_MASCOT_MODEL
    ).max;
  }, [mascot, model, referenceId]);

  const {
    blocked: unaffordable,
    needsPlan,
    loading: balanceLoading,
  } = useAffordability(reservation);

  const send = async () => {
    const message = draft.trim();
    if (!message || busy || mutationBusy || !onMascotChange) return;
    if (unaffordable) {
      toast.error("AI edits need tokens. Top up to continue.");
      return;
    }
    if (onMutationStart && !onMutationStart()) return;

    setBusy(true);
    const nextHistory: RefineMessage[] = [
      ...history,
      { role: "user", content: message },
    ];
    setHistory(nextHistory.slice(-MAX_REFINE_HISTORY_MESSAGES));
    setDraft("");
    let errorCode: string | undefined;
    try {
      trackEvent("generate_started", {
        action: "refine",
        model: model ?? "auto",
      });
      const res = await fetch("/api/generate/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascot,
          look,
          model,
          enabledParts: [...enabledParts],
          message,
          history: history.slice(-MAX_REFINE_HISTORY_MESSAGES),
          referenceId: isReferenceId(referenceId) ? referenceId : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        code?: string;
        assistantMessage?: string;
        mascot?: GeneratedMascot;
      } | null;
      if (isMutationCurrent && !isMutationCurrent()) return;

      if (!res.ok || !data?.mascot) {
        errorCode = data?.code;
        const fallbackError =
          res.status === 504
            ? "This edit took too long. Try a smaller, more focused change."
            : "Couldn't apply that edit";
        throw new Error(data?.error || fallbackError);
      }
      onMascotChange(data.mascot);
      setHistory((h) =>
        [
          ...h,
          {
            role: "assistant" as const,
            content: data.assistantMessage || "Updated.",
          },
        ].slice(-MAX_REFINE_HISTORY_MESSAGES)
      );
      trackEvent("generate_completed", {
        action: "refine",
        model: model ?? "auto",
      });
      toast.success("Mascot updated");
    } catch (err) {
      if (isMutationCurrent && !isMutationCurrent()) return;

      trackGenerationFailure("refine", errorCode);
      toast.error(err instanceof Error ? err.message : "Refine failed");
      setHistory(history);
      setDraft(message);
    } finally {
      setBusy(false);
      if (onMutationStart) onMutationEnd?.();
    }
  };

  return (
    <div
      className="mt-2 flex flex-col gap-5 border-t pt-5"
      style={{ borderColor: `${accent}29` }}
    >
      {onMascotChange && (
        <div>
          <h3 className="gs-eyebrow mb-2">Ask AI</h3>

          {onReferenceIdChange && !unaffordable && (
            <ReferenceImageUpload
              className="mb-4"
              title="Visual reference"
              hint="Show the AI what to add, change, or avoid — sketch, screenshot, or inspiration"
              onReady={onReferenceIdChange}
              onClear={() => onReferenceIdChange(undefined)}
            />
          )}

          <div
            className="mb-3 max-h-[180px] space-y-2 overflow-y-auto rounded-xl border p-3"
            style={{ borderColor: `${accent}33`, background: "rgba(0,0,0,.18)" }}
            role="log"
            aria-label="AI edit history"
            aria-live="polite"
            aria-busy={busy}
          >
            {history.length === 0 && (
              <p style={{ fontSize: 12.5, color: "#8D8472" }}>
                e.g. “remove the satchel”, “add tiny glasses like the reference”,
                “make the tail longer”, “softer eyes”
              </p>
            )}
            {history.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: m.role === "user" ? "#F5EDE0" : "#C6BCA7",
                }}
              >
                <span
                  style={{
                    color: accent,
                    fontSize: 10,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    marginRight: 6,
                  }}
                >
                  {m.role === "user" ? "You" : "AI"}
                </span>
                {m.content}
              </div>
            ))}
          </div>
          {balanceLoading ? (
            <p className="px-1 text-xs text-white/50">Checking token balance…</p>
          ) : unaffordable ? (
            <Link
              href="/pricing"
              className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-100 transition hover:border-red-400/50"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {needsPlan
                  ? "AI edits run on plan tokens. Choose a plan to keep editing — your mascot stays saved."
                  : `Not enough tokens for an edit (needs about ${formatTokens(
                      reservation
                    )}). Top up to continue.`}
              </span>
            </Link>
          ) : (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={draft}
              disabled={busy || mutationBusy}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_REFINE_MESSAGE_CHARS}
              placeholder="Change, add, or remove something…"
              aria-label="Describe the mascot change"
              className="gs-range min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                height: "auto",
                background: "rgba(255,255,255,.04)",
                borderColor: `${accent}40`,
                color: "#F5EDE0",
              }}
            />
            <button
              type="submit"
              className="gs-btn focus-visible:outline-2 focus-visible:outline-offset-2"
              disabled={busy || mutationBusy || !draft.trim()}
              aria-label={busy ? "Updating mascot" : "Ask AI to update mascot"}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </form>
          )}
        </div>
      )}
    </div>
  );
}
