"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { ModelChipsSkeleton } from "@/components/skeletons";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { GeneratedStudio } from "@/components/generated-studio";
import { TokenEstimate } from "@/components/create/token-estimate";
import { ReferenceImageUpload } from "@/components/reference-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GESTURE_CATEGORIES,
  GESTURE_PRESETS,
} from "@/lib/gesture-presets";
import {
  MASCOT_MODEL_OPTIONS,
  type MascotModelProvider,
} from "@/lib/mascot-model-options";
import { trackEvent } from "@/lib/analytics";
import type { CreateBriefPreset } from "@/lib/create-field-placeholders";
import { CREATE_FIELD_PLACEHOLDERS } from "@/lib/create-field-placeholders";
import type {
  GeneratedMascot,
  GestureRequest,
  MascotModelId,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMascotPersistence } from "@/hooks/use-mascot-persistence";
import { useGenerationErrorReporter } from "@/hooks/use-generation-error";

type PoseThumb = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
  track: boolean;
  thumb: string;
};

type Step = "brief" | "studio";

const MODEL_PROVIDERS: MascotModelProvider[] = ["Anthropic", "OpenAI"];

const DEFAULT_POSE_KEYS = ["idle", "wave", "happy"];

function defaultSelected(poses: PoseThumb[]): Set<string> {
  const keys = new Set<string>();
  for (const k of DEFAULT_POSE_KEYS) {
    if (poses.some((p) => p.key === k)) keys.add(k);
  }
  if (keys.size === 0) {
    for (const p of poses.filter((x) => x.cat === "Core").slice(0, 3)) {
      keys.add(p.key);
    }
  }
  if (keys.size === 0 && poses[0]) keys.add(poses[0].key);
  return keys;
}

type PayloadHint = {
  sharedManifestChars: number;
  perPoseChars: Record<string, number>;
  gesturePayloadChars: number;
};

export type RemixSource =
  | { kind: "mascot"; mascotId: string }
  | { kind: "listing"; listingId: string; remixOrderId: string };

export function RemixClient({
  source,
  sourceName,
  poses,
  brief,
  payloadHint,
}: {
  source: RemixSource;
  sourceName: string;
  poses: PoseThumb[];
  brief: CreateBriefPreset | null;
  payloadHint: PayloadHint;
}) {
  const reportError = useGenerationErrorReporter();
  const [step, setStep] = useState<Step>("brief");
  const [model, setModel] = useState<MascotModelId | null>(null);
  const [availableModels, setAvailableModels] = useState<
    Array<{ id: MascotModelId; available: boolean }>
  >([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [name, setName] = useState(brief?.name ?? "");
  const [description, setDescription] = useState(brief?.description ?? "");
  const [look, setLook] = useState(brief?.look ?? "");
  const [productContext, setProductContext] = useState(
    brief?.productContext ?? ""
  );
  const [personality, setPersonality] = useState(brief?.personality ?? "");
  const [referenceId, setReferenceId] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(() =>
    defaultSelected(poses)
  );
  const [extraKeys, setExtraKeys] = useState<Set<string>>(new Set());
  const [remixLoading, setRemixLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<GeneratedMascot | null>(null);

  const { mascotId, saving, setMeta, persist, persistSafe, discard, bindId } =
    useMascotPersistence();

  const exampleKeys = useMemo(() => new Set(poses.map((p) => p.key)), [poses]);

  const extraPresets = useMemo(
    () => GESTURE_PRESETS.filter((g) => !exampleKeys.has(g.key)),
    [exampleKeys]
  );

  const exampleGestures: GestureRequest[] = useMemo(
    () =>
      poses
        .filter((p) => selected.has(p.key))
        .map((p) => ({
          key: p.key,
          label: p.label,
          cat: p.cat,
          tip: p.tip,
          use: p.use,
        })),
    [poses, selected]
  );

  const extraGestures: GestureRequest[] = useMemo(
    () =>
      extraPresets
        .filter((g) => extraKeys.has(g.key))
        .map((g) => ({
          key: g.key,
          label: g.label,
          cat: g.cat,
          tip: g.tip,
          use: g.use,
        })),
    [extraPresets, extraKeys]
  );

  const remixPoseCount = exampleGestures.length;

  const payloadChars = useMemo(() => {
    const briefChars =
      name.length +
      description.length +
      look.length +
      productContext.length +
      personality.length;
    let chars = briefChars + payloadHint.sharedManifestChars;
    for (const gesture of exampleGestures) {
      chars += payloadHint.perPoseChars[gesture.key] ?? 0;
    }
    return chars;
  }, [
    name,
    description,
    look,
    productContext,
    personality,
    exampleGestures,
    payloadHint,
  ]);

  useEffect(() => {
    setMeta({
      look: look.trim() || undefined,
      productContext: productContext.trim() || undefined,
      personality: personality.trim() || undefined,
      model: model ?? undefined,
      source: "remixed",
      sourceListingId:
        source.kind === "listing"
          ? (source.listingId as import("../../../../convex/_generated/dataModel").Id<"marketplaceListings">)
          : undefined,
    });
  }, [look, productContext, personality, model, setMeta, source]);

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
        const list = data.models ?? [];
        setAvailableModels(list);
        setModel(
          data.defaultModel ?? list.find((m) => m.available)?.id ?? null
        );
      } catch {
        if (!cancelled) toast.error("Could not load available models");
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePose = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 6) next.add(key);
      else toast.message("Pick up to 6 example poses to remix");
      return next;
    });
  };

  const toggleExtra = (key: string) => {
    setExtraKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const runRemix = async () => {
    if (!model) {
      toast.error("Pick a model first");
      return;
    }
    if (!name.trim() || !description.trim() || !look.trim()) {
      toast.error("Fill in name, description, and look");
      return;
    }
    if (remixPoseCount < 1) {
      toast.error("Select at least one example pose");
      return;
    }

    setRemixLoading(true);
    setProgress("Remixing poses…");
    trackEvent("generate_started", { action: "remix", model });

    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(source.kind === "mascot"
            ? { mascotId: source.mascotId }
            : {
                listingId: source.listingId,
                remixOrderId: source.remixOrderId,
              }),
          name: name.trim(),
          description: description.trim(),
          look: look.trim(),
          productContext: productContext.trim() || undefined,
          personality: personality.trim() || undefined,
          gestures: exampleGestures,
          model,
          referenceId,
        }),
      });
      const data = (await res.json()) as {
        mascot?: GeneratedMascot;
        error?: string;
        code?: string;
        _meta?: { warnings?: string[]; skippedGestures?: string[] };
      };

      if (!res.ok) {
        reportError(
          new Error(data.error ?? "Remix failed"),
          "Remix failed",
          "remix",
          data.code
        );
        return;
      }

      let mascot = data.mascot!;
      const warnings = data._meta?.warnings ?? [];
      if (warnings.length) console.warn("remix warnings:", warnings);

      for (const gesture of extraGestures) {
        setProgress(`Adding ${gesture.label}…`);
        const gRes = await fetch("/api/generate/gesture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mascot, gesture, look: look.trim(), model }),
        });
        const gData = (await gRes.json()) as {
          mascot?: GeneratedMascot;
          error?: string;
          code?: string;
        };
        if (!gRes.ok) {
          reportError(
            new Error(gData.error ?? `Could not add ${gesture.label}`),
            "Adding gesture failed",
            "gesture",
            gData.code
          );
          break;
        }
        mascot = gData.mascot!;
      }

      bindId(null);
      const id = await persist(mascot);
      bindId(id);

      setResult(mascot);
      setStep("studio");
      trackEvent("generate_completed", { action: "remix", model });
      toast.success(`${mascot.name} is ready in the studio`);
    } catch (err) {
      reportError(err, "Remix failed", "remix");
    } finally {
      setRemixLoading(false);
      setProgress("");
    }
  };

  if (step === "studio" && result) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
        <SiteHeader />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
          <Link
            href={
              source.kind === "mascot"
                ? `/library/${source.mascotId}`
                : "/marketplace"
            }
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            ← {sourceName}
          </Link>
          {mascotId && (
            <Link
              href={`/library/${mascotId}`}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Open in library
            </Link>
          )}
          <button
            type="button"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
            onClick={async () => {
              await discard();
              bindId(null);
              setResult(null);
              setStep("brief");
            }}
          >
            Edit brief
          </button>
          {saving && (
            <span className="text-xs text-[var(--brand-muted)]">Saving…</span>
          )}
        </div>
        <GeneratedStudio
          mascot={result}
          look={look.trim()}
          model={model ?? undefined}
          mascotId={mascotId}
          onMascotChange={(next) => {
            setResult(next);
            void persistSafe(next);
          }}
        />
        <SiteFooter />
      </div>
    );
  }

  const categories = [...new Set(poses.map((p) => p.cat))];

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
          Remix {sourceName}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
          Reshape this mascot into yours
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--brand-muted)]">
          We keep every animation and coordinate from {sourceName}&apos;s real
          SVG. The AI only swaps shapes and colours. Pick which poses to carry
          over, then describe your new character.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {/* Model */}
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-medium">Model</h2>
              {modelsLoading ? (
                <ModelChipsSkeleton />
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {MODEL_PROVIDERS.map((provider) => (
                    <div key={provider} className="w-full">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        {provider}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MASCOT_MODEL_OPTIONS.filter(
                          (o) => o.provider === provider
                        ).map((option) => {
                          const ok = availableModels.find(
                            (m) => m.id === option.id
                          )?.available;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={!ok || remixLoading}
                              onClick={() => {
                                setModel(option.id);
                                trackEvent("model_selected", {
                                  model: option.id,
                                  provider: option.provider,
                                });
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                model === option.id
                                  ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[#12141c]"
                                  : "border-white/15 text-white/80 hover:border-white/30",
                                !ok && "opacity-40"
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Brief */}
            <section className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-medium">Your mascot</h2>
              <div className="group/field">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={CREATE_FIELD_PLACEHOLDERS.name}
                  disabled={remixLoading}
                  className="mt-1.5"
                />
              </div>
              <div className="group/field">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={CREATE_FIELD_PLACEHOLDERS.description}
                  disabled={remixLoading}
                  className="mt-1.5 min-h-[88px]"
                />
              </div>
              <div className="group/field">
                <Label htmlFor="look">Look</Label>
                <Textarea
                  id="look"
                  value={look}
                  onChange={(e) => setLook(e.target.value)}
                  placeholder={CREATE_FIELD_PLACEHOLDERS.look}
                  disabled={remixLoading}
                  className="mt-1.5 min-h-[88px]"
                />
              </div>

              <ReferenceImageUpload
                onReady={setReferenceId}
                onClear={() => setReferenceId(undefined)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="group/field">
                  <Label htmlFor="product">Product</Label>
                  <Input
                    id="product"
                    value={productContext}
                    onChange={(e) => setProductContext(e.target.value)}
                    placeholder={CREATE_FIELD_PLACEHOLDERS.productContext}
                    disabled={remixLoading}
                    className="mt-1.5"
                  />
                </div>
                <div className="group/field">
                  <Label htmlFor="personality">Personality</Label>
                  <Input
                    id="personality"
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder={CREATE_FIELD_PLACEHOLDERS.personality}
                    disabled={remixLoading}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </section>

            {/* Example poses */}
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="font-medium">Example poses to remix</h2>
                <Badge variant="outline" className="border-white/15">
                  {selected.size}/6 selected
                </Badge>
              </div>
              {categories.map((cat) => (
                <div key={cat} className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    {cat}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {poses
                      .filter((p) => p.cat === cat)
                      .map((pose) => {
                        const on = selected.has(pose.key);
                        return (
                          <button
                            key={pose.key}
                            type="button"
                            disabled={remixLoading}
                            onClick={() => togglePose(pose.key)}
                            className={cn(
                              "flex gap-3 rounded-xl border p-3 text-left transition",
                              on
                                ? "border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/10"
                                : "border-white/10 hover:border-white/25"
                            )}
                          >
                            <div
                              className="size-16 shrink-0 overflow-hidden rounded-lg bg-[#0a0e18]"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeSvg(pose.thumb),
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{pose.label}</span>
                                {on && (
                                  <Check className="size-3.5 text-[var(--brand-accent)]" />
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-[var(--brand-muted)]">
                                {pose.tip}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </section>

            {/* Extra gestures */}
            {extraPresets.length > 0 && (
              <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="font-medium">Extra gestures</h2>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  Not in {sourceName}. Generated after remix using your idle
                  pose as anchor.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {GESTURE_CATEGORIES.map((cat) =>
                    extraPresets
                      .filter((g) => g.cat === cat)
                      .map((g) => {
                        const on = extraKeys.has(g.key);
                        return (
                          <button
                            key={g.key}
                            type="button"
                            disabled={remixLoading}
                            onClick={() => toggleExtra(g.key)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                              on
                                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[#12141c]"
                                : "border-white/15 text-white/80 hover:border-white/30"
                            )}
                          >
                            {g.label}
                          </button>
                        );
                      })
                  )}
                </div>
              </section>
            )}

            <Button
              size="lg"
              disabled={remixLoading || !model}
              onClick={() => void runRemix()}
              className="w-full bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90 sm:w-auto"
            >
              {remixLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {progress || "Remixing…"}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Remix into {name.trim() || "your mascot"}
                </>
              )}
            </Button>
          </div>

          <TokenEstimate
            model={model}
            gestures={remixPoseCount}
            poses={remixPoseCount}
            scope="remix"
            payloadChars={payloadChars}
            extraGestures={extraGestures.length}
            gesturePayloadChars={payloadHint.gesturePayloadChars}
            hasReference={Boolean(referenceId)}
            availableModels={availableModels
              .filter((m) => m.available)
              .map((m) => m.id)}
          />
        </div>
      </main>
    </div>
  );
}
