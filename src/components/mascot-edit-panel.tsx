"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send, TriangleAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ReferenceImageUpload } from "@/components/reference-image-upload";
import {
  DEFAULT_MASCOT_MODEL,
  MASCOT_MODEL_OPTIONS,
  asMascotModelId,
  mascotModelOption,
} from "@/lib/mascot-model-options";
import { isReferenceId } from "@/lib/reference-image-client";
import {
  MAX_REFINE_HISTORY_MESSAGES,
  MAX_REFINE_MESSAGE_CHARS,
} from "@/lib/refine-limits";
import {
  refinePayloadChars,
  splitRefineGestures,
} from "@/lib/refine-pack";
import {
  MAX_TOKEN_RESERVATION,
  estimateRefineReservation,
  formatTokens,
} from "@/lib/token-pricing";
import { useAffordability } from "@/lib/use-affordability";
import type {
  GeneratedMascot,
  MascotModelId,
  MascotPart,
  RefineMessage,
} from "@/lib/types";
import { trackEvent, trackGenerationFailure } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { shouldResetUndoStack } from "@/hooks/use-mascot-undo";
import type { Id } from "../../convex/_generated/dataModel";

type Props = {
  mascot: GeneratedMascot;
  look?: string;
  model?: MascotModelId;
  enabledParts: Set<string>;
  onMascotChange?: (
    mascot: GeneratedMascot,
    options?: { refineHistoryLength?: number }
  ) => void;
  referenceId?: string;
  onReferenceIdChange?: (referenceId: string | undefined) => void;
  mutationBusy?: boolean;
  onMutationStart?: () => boolean;
  onMutationEnd?: () => void;
  isMutationCurrent?: () => boolean;
  /** Revert AI pack edits (refine / add gesture). */
  canUndo?: boolean;
  undoDepth?: number;
  onUndo?: () => void;
  /** Bumps on each undo so chat trim runs even when length is unchanged. */
  undoGeneration?: number;
  restoreHistoryLength?: number;
  onRefineHistoryLengthChange?: (length: number) => void;
  /** Clears refine chat when switching saved mascots — not on pack field edits. */
  mascotId?: Id<"mascots"> | null;
  accent: string;
};

type PartsPanelProps = {
  parts: MascotPart[];
  enabledParts: Set<string>;
  onTogglePart: (key: string) => void;
  accent: string;
  pillClassName?: string;
  eyebrowClassName?: string;
};

/** Instant, reversible SVG layer controls; independent from metered AI edits. */
export function MascotPartsPanel({
  parts,
  enabledParts,
  onTogglePart,
  accent,
  pillClassName = "gs-pill",
  eyebrowClassName = "gs-eyebrow",
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
        <h3 className={`${eyebrowClassName} mb-2`}>Elements</h3>
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
                    className={cn(pillClassName, enabled && "on")}
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
  canUndo = false,
  undoDepth = 0,
  onUndo,
  undoGeneration = 0,
  restoreHistoryLength = 0,
  onRefineHistoryLengthChange,
  mascotId = null,
  accent,
}: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<RefineMessage[]>([]);
  const [editModel, setEditModel] = useState<MascotModelId>(
    () => model ?? DEFAULT_MASCOT_MODEL
  );
  const [availableIds, setAvailableIds] = useState<Set<MascotModelId> | null>(
    null
  );
  const prevMascotId = useRef(mascotId);

  useEffect(() => {
    const prev = prevMascotId.current;
    prevMascotId.current = mascotId;
    if (shouldResetUndoStack(prev, mascotId)) {
      setHistory([]);
      setDraft("");
      setEditModel(model ?? DEFAULT_MASCOT_MODEL);
    }
  }, [mascotId, model]);

  useEffect(() => {
    onRefineHistoryLengthChange?.(history.length);
  }, [history.length, onRefineHistoryLengthChange]);

  useEffect(() => {
    if (undoGeneration === 0) return;
    setHistory((current) => current.slice(0, restoreHistoryLength));
  }, [undoGeneration, restoreHistoryLength]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/models");
        const data = (await res.json()) as {
          models?: Array<{ id: MascotModelId; available: boolean }>;
          defaultModel?: MascotModelId | null;
        };
        if (cancelled) return;
        const available = new Set(
          (data.models ?? [])
            .filter((m) => m.available)
            .map((m) => m.id)
        );
        setAvailableIds(available);
        if (available.size === 0) return;
        setEditModel((prev) => {
          if (available.has(prev)) return prev;
          const fallback =
            (data.defaultModel && available.has(data.defaultModel)
              ? data.defaultModel
              : null) ??
            [...available][0] ??
            prev;
          return fallback;
        });
      } catch {
        // Keep the full catalogue selectable if availability can't be loaded.
        if (!cancelled) setAvailableIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * What `/api/generate/refine` will hold before it runs: the route reserves the
   * worst case of the same quote. Checking it here means a customer without
   * tokens sees the paywall instead of typing an edit that can only 402.
   */
  const quote = useMemo(() => {
    const batches = splitRefineGestures(mascot.gestures).length;
    // Match the refine route: compact mascot + trimmed message + history.
    return estimateRefineReservation(
      {
        batches,
        payloadChars: refinePayloadChars(mascot, draft.trim(), history),
        hasReference: isReferenceId(referenceId),
      },
      editModel
    );
  }, [mascot, editModel, referenceId, draft, history]);

  const {
    blocked: unaffordable,
    needsPlan,
    shortfall,
    loading: balanceLoading,
  } = useAffordability(quote.editCost);

  const belowMin =
    !needsPlan &&
    !balanceLoading &&
    unaffordable &&
    quote.editCost - shortfall < quote.minCost;

  const noModels =
    availableIds !== null && availableIds.size === 0;
  /** Server will reject holds above this — preflight so we never 413 after send. */
  const tooLarge = quote.editCost > MAX_TOKEN_RESERVATION;

  const send = async () => {
    const message = draft.trim();
    if (!message || busy || mutationBusy || !onMascotChange) return;
    if (noModels) {
      toast.error("No model provider configured.");
      return;
    }
    if (tooLarge) {
      toast.error(
        "This edit is too large to run in one request. Pick a lighter model or simplify the pack."
      );
      return;
    }
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
        model: editModel,
      });
      const res = await fetch("/api/generate/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascot,
          look,
          model: editModel,
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
      onMascotChange(data.mascot, { refineHistoryLength: history.length });
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
        model: editModel,
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

  const modelOptions = MASCOT_MODEL_OPTIONS.filter((opt) =>
    availableIds === null ? true : availableIds.has(opt.id)
  );

  // Keep controlled <select> value in sync with submit state (never display ≠ send).
  useEffect(() => {
    if (!availableIds || availableIds.size === 0) return;
    if (availableIds.has(editModel)) return;
    const first = [...availableIds][0];
    if (first) setEditModel(first);
  }, [availableIds, editModel]);

  return (
    <div
      className="mt-2 flex flex-col gap-5 border-t pt-5"
      style={{ borderColor: `${accent}29` }}
    >
      {onMascotChange && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="gs-eyebrow">Ask AI</h3>
            {canUndo && onUndo && (
              <button
                type="button"
                className="gs-btn ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm"
                disabled={busy || mutationBusy}
                onClick={onUndo}
                title={
                  undoDepth > 1
                    ? `Revert the last ${undoDepth} AI changes one step at a time (⌘Z)`
                    : "Revert the last AI change (⌘Z)"
                }
              >
                <Undo2 className="size-3.5 sm:size-4" aria-hidden />
                Revert
                {undoDepth > 1 ? (
                  <span
                    className="tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                    style={{
                      background: `${accent}33`,
                      color: "#F5EDE0",
                    }}
                  >
                    {undoDepth}
                  </span>
                ) : null}
              </button>
            )}
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {availableIds !== null && availableIds.size === 0 ? (
              <p
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-100"
                role="status"
              >
                No model provider configured. AI edits are unavailable until a
                provider key is set.
              </p>
            ) : (
              <>
                <label className="sr-only" htmlFor="ask-ai-model">
                  Model for this edit
                </label>
                <select
                  id="ask-ai-model"
                  value={editModel}
                  disabled={busy || mutationBusy || modelOptions.length === 0}
                  onChange={(e) => {
                    const next = asMascotModelId(e.target.value);
                    if (next) {
                      setEditModel(next);
                      trackEvent("model_selected", {
                        model: next,
                        provider: mascotModelOption(next).provider,
                      });
                    }
                  }}
                  className="gs-range w-full min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:max-w-[16rem]"
                  style={{
                    height: "auto",
                    background: "rgba(255,255,255,.04)",
                    borderColor: `${accent}40`,
                    color: "#F5EDE0",
                  }}
                >
                  {modelOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span
                  className="tabular-nums text-xs"
                  style={{ color: "#C6BCA7" }}
                  title="Typical tokens for this edit on the selected model"
                >
                  ~{formatTokens(quote.typical)} tokens
                </span>
              </>
            )}
          </div>

          {onReferenceIdChange && !unaffordable && !tooLarge && (
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
          {noModels ? null : balanceLoading ? (
            <p className="px-1 text-xs text-white/50">Checking token balance…</p>
          ) : tooLarge ? (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-100"
              role="status"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                This edit is too large to run in one request (about{" "}
                {formatTokens(quote.editCost)} tokens). Pick a lighter model or
                simplify the pack.
              </span>
            </div>
          ) : unaffordable ? (
            <Link
              href="/pricing"
              className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-100 transition hover:border-red-400/50"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {needsPlan
                  ? "AI edits run on plan tokens. Choose a plan to keep editing — your mascot stays saved."
                  : belowMin
                    ? `Not enough tokens for an edit on this model (needs about ${formatTokens(
                        quote.minCost
                      )}). Pick a lighter model or top up to continue.`
                    : `Not enough tokens for this edit (needs about ${formatTokens(
                        quote.editCost
                      )}). Pick a lighter model or top up to continue.`}
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
