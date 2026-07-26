"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { ReferenceImageUpload } from "@/components/reference-image-upload";
import { isReferenceId } from "@/lib/reference-image-client";
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
  onTogglePart: (key: string) => void;
  onMascotChange?: (mascot: GeneratedMascot) => void;
  referenceId?: string;
  onReferenceIdChange?: (referenceId: string | undefined) => void;
  accent: string;
};

export function MascotEditPanel({
  mascot,
  look,
  model,
  enabledParts,
  onTogglePart,
  onMascotChange,
  referenceId,
  onReferenceIdChange,
  accent,
}: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<RefineMessage[]>([]);

  const partsByCategory = useMemo(() => {
    const map = new Map<string, MascotPart[]>();
    for (const p of mascot.parts ?? []) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [mascot.parts]);

  useEffect(() => {
    setHistory([]);
    setDraft("");
  }, [mascot.name, mascot.tagline]);

  const send = async () => {
    const message = draft.trim();
    if (!message || busy || !onMascotChange) return;
    setBusy(true);
    const nextHistory: RefineMessage[] = [
      ...history,
      { role: "user", content: message },
    ];
    setHistory(nextHistory);
    setDraft("");
    trackEvent("generate_started", { action: "refine", model: model ?? "auto" });
    let errorCode: string | undefined;
    try {
      const res = await fetch("/api/generate/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascot,
          look,
          model,
          enabledParts: [...enabledParts],
          message,
          history,
          referenceId: isReferenceId(referenceId) ? referenceId : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        assistantMessage?: string;
        mascot?: GeneratedMascot;
      };
      if (!res.ok || !data.mascot) {
        errorCode = data.code;
        throw new Error(data.error || "Couldn't apply that edit");
      }
      onMascotChange(data.mascot);
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: data.assistantMessage || "Updated.",
        },
      ]);
      trackEvent("generate_completed", {
        action: "refine",
        model: model ?? "auto",
      });
      toast.success("Mascot updated");
    } catch (err) {
      trackGenerationFailure("refine", errorCode);
      toast.error(err instanceof Error ? err.message : "Refine failed");
      setHistory((h) => h.slice(0, -1));
      setDraft(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gs-card mt-6 flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <div className="gs-eyebrow mb-2">Elements</div>
        <p style={{ fontSize: 12.5, color: "#B5AC9A", lineHeight: 1.5 }}>
          Toggle parts on/off instantly. Hidden parts stay available to add back.
          Ask the AI below for structural changes.
        </p>
      </div>

      <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
        {partsByCategory.map(([cat, parts]) => (
          <div key={cat}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".16em",
                color: "#8D8472",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {cat}
            </div>
            <div className="flex flex-wrap gap-2">
              {parts.map((p) => {
                const on = enabledParts.has(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    title={p.description || p.label}
                    onClick={() => onTogglePart(p.key)}
                    className={cn("gs-pill", on && "on")}
                    style={
                      !on
                        ? {
                            opacity: 0.55,
                            textDecoration: "line-through",
                          }
                        : undefined
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {(mascot.parts?.length ?? 0) === 0 && (
          <p style={{ fontSize: 12.5, color: "#8D8472" }}>
            No tagged parts yet. Ask the AI to label elements, or regenerate.
          </p>
        )}
      </div>

      {onMascotChange && (
        <div>
          <div className="gs-eyebrow mb-2">Ask AI</div>

          {onReferenceIdChange && (
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
          <div className="flex gap-2">
            <input
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Change, add, or remove something…"
              className="gs-range min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm"
              style={{
                height: "auto",
                background: "rgba(255,255,255,.04)",
                borderColor: `${accent}40`,
                color: "#F5EDE0",
              }}
            />
            <button
              type="button"
              className="gs-btn"
              disabled={busy || !draft.trim()}
              onClick={() => void send()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
