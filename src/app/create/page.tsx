"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus, Shuffle, Sparkles, X } from "lucide-react";
import {
  ModelPickerSkeleton,
  SampleConceptsSkeleton,
} from "@/components/skeletons";
import { SiteHeader } from "@/components/site-header";
import { GeneratedStudio } from "@/components/generated-studio";
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
import { TokenEstimate } from "@/components/create/token-estimate";
import { ReferenceImageUpload } from "@/components/reference-image-upload";
import {
  trackEvent,
  trackGenerationFailure,
  type GenerateAction,
} from "@/lib/analytics";
import { estimateFullCreate, formatTokens } from "@/lib/token-pricing";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import type {
  GeneratedMascot,
  MascotModelId,
  MascotSample,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMascotPersistence } from "@/hooks/use-mascot-persistence";
import {
  CREATE_BRIEF_PRESETS,
  CREATE_FIELD_PLACEHOLDERS,
  type CreateBriefPreset,
} from "@/lib/create-field-placeholders";
import type { BriefSurpriseField } from "@/lib/brief-surprise";

const DEFAULT_KEYS = ["idle", "wave", "happy"];

const MODEL_PROVIDERS: MascotModelProvider[] = ["Anthropic", "OpenAI"];

type Step = "brief" | "samples" | "studio";

type ModelAvailability = {
  id: MascotModelId;
  available: boolean;
};

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("brief");
  const [model, setModel] = useState<MascotModelId | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelAvailability[]>(
    []
  );
  const [modelsLoading, setModelsLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [look, setLook] = useState("");
  const [productContext, setProductContext] = useState("");
  const [personality, setPersonality] = useState("");
  const [referenceId, setReferenceId] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(DEFAULT_KEYS)
  );
  const [customLabel, setCustomLabel] = useState("");
  const [customTip, setCustomTip] = useState("");
  const [customGestures, setCustomGestures] = useState<
    Array<{ key: string; label: string; cat: string; tip: string; use: string }>
  >([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [studioLoading, setStudioLoading] = useState(false);
  const [samples, setSamples] = useState<MascotSample[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedMascot | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [surpriseLoading, setSurpriseLoading] =
    useState<BriefSurpriseField | null>(null);
  const surpriseAbortRef = useRef<AbortController | null>(null);
  const { mascotId, saving, setMeta, persist, persistSafe, discard, bindId } =
    useMascotPersistence();

  const placeholderPreview =
    CREATE_BRIEF_PRESETS[placeholderIndex % CREATE_BRIEF_PRESETS.length]!;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % CREATE_BRIEF_PRESETS.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const applyBriefFields = (brief: Omit<CreateBriefPreset, "slug">) => {
    setName(brief.name);
    setDescription(brief.description);
    setLook(brief.look);
    setProductContext(brief.productContext);
    setPersonality(brief.personality);
  };

  const briefBusy = samplesLoading || surpriseLoading !== null;

  const requestBriefSurprise = async (field: BriefSurpriseField) => {
    surpriseAbortRef.current?.abort();
    const controller = new AbortController();
    surpriseAbortRef.current = controller;
    setSurpriseLoading(field);

    try {
      const res = await fetch("/api/generate/brief-surprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          brief: { name, description, look, productContext, personality },
        }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        field?: BriefSurpriseField;
        value?: string;
        brief?: Omit<CreateBriefPreset, "slug">;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Surprise me failed");
      }

      if (data.field === "all" && data.brief) {
        applyBriefFields(data.brief);
        return;
      }

      if (data.field === "name" && data.value) setName(data.value);
      else if (data.field === "description" && data.value)
        setDescription(data.value);
      else if (data.field === "look" && data.value) setLook(data.value);
      else if (data.field === "productContext" && data.value)
        setProductContext(data.value);
      else if (data.field === "personality" && data.value)
        setPersonality(data.value);
      else {
        throw new Error("Surprise me returned an incomplete suggestion");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(
        err instanceof Error ? err.message : "Surprise me failed — try again"
      );
    } finally {
      if (surpriseAbortRef.current === controller) {
        setSurpriseLoading(null);
        surpriseAbortRef.current = null;
      }
    }
  };

  useEffect(() => {
    setMeta({
      look: look.trim() || undefined,
      productContext: productContext.trim() || undefined,
      personality: personality.trim() || undefined,
      model: model ?? undefined,
    });
  }, [look, productContext, personality, model, setMeta]);

  const restartFromStudio = async (next: Step) => {
    try {
      await discard();
    } catch {
      toast.error("Couldn’t remove the previous save");
    }
    bindId(null);
    setResult(null);
    setStep(next);
  };

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
        const preferred =
          data.defaultModel ??
          list.find((m) => m.available)?.id ??
          null;
        setModel(preferred);
      } catch {
        if (!cancelled) {
          toast.error("Could not load available models");
          setAvailableModels([]);
          setModel(null);
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const modelAvailable = (id: MascotModelId) =>
    availableModels.find((m) => m.id === id)?.available ?? false;

  const availableModelIds = useMemo(
    () => availableModels.filter((m) => m.available).map((m) => m.id),
    [availableModels]
  );

  const selectedPresets = useMemo(
    () => GESTURE_PRESETS.filter((g) => selected.has(g.key)),
    [selected]
  );

  const allGestures = useMemo(
    () => [...selectedPresets, ...customGestures],
    [selectedPresets, customGestures]
  );

  const pickedSample = samples.find((s) => s.id === pickedId) ?? null;

  /** Billing failures get a direct route to checkout instead of a dead toast. */
  const reportGenerationError = (
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

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addCustom = () => {
    const label = customLabel.trim();
    if (!label) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32);
    if (!key) return;
    if (
      GESTURE_PRESETS.some((g) => g.key === key) ||
      customGestures.some((g) => g.key === key)
    ) {
      toast.error("That gesture already exists");
      return;
    }
    setCustomGestures((prev) => [
      ...prev,
      {
        key,
        label,
        cat: "Custom",
        tip: customTip.trim() || `${label} performance for your app.`,
        use: "Custom moment",
      },
    ]);
    setCustomLabel("");
    setCustomTip("");
  };

  const requestSamples = async () => {
    if (!model) {
      toast.error("No model provider configured");
      return;
    }
    if (!name.trim() || !description.trim() || !look.trim()) {
      toast.error("Name, description, and look are required");
      return;
    }
    if (allGestures.length < 1) {
      toast.error("Pick at least one gesture");
      return;
    }
    if (allGestures.length > 6) {
      toast.error("Keep it to 6 gestures max");
      return;
    }

    setSamplesLoading(true);
    setSamples([]);
    setPickedId(null);
    setResult(null);
    bindId(null);
    trackEvent("generate_started", { action: "samples", model });
    let errorCode: string | undefined;
    try {
      const res = await fetch("/api/generate/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          look: look.trim(),
          productContext: productContext.trim() || undefined,
          personality: personality.trim() || undefined,
          model,
          referenceId,
        }),
      });
      const data = (await res.json()) as {
        samples?: MascotSample[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        errorCode = data.code;
        throw new Error(data.error || "Sample generation failed");
      }
      if (!data.samples?.length) throw new Error("No samples returned");
      setSamples(data.samples);
      setStep("samples");
      trackEvent("generate_completed", { action: "samples", model });
      toast.success("Pick the look you like");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      reportGenerationError(err, "Sample generation failed", "samples", errorCode);
    } finally {
      setSamplesLoading(false);
    }
  };

  const buildStudio = async () => {
    if (!model) {
      toast.error("No model provider configured");
      return;
    }
    if (!pickedSample) {
      toast.error("Select one of the three looks");
      return;
    }

    setStudioLoading(true);
    trackEvent("generate_started", { action: "studio", model });
    let errorCode: string | undefined;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          look: look.trim(),
          productContext: productContext.trim() || undefined,
          personality: personality.trim() || undefined,
          selectedSample: pickedSample,
          gestures: allGestures,
          model,
          referenceId,
        }),
      });
      const data = (await res.json()) as GeneratedMascot & {
        error?: string;
        code?: string;
        _meta?: {
          model?: string;
          tokens?: number;
          warnings?: string[];
          skippedGestures?: string[];
        };
      };
      if (!res.ok) {
        errorCode = data.code;
        throw new Error(data.error || "Generation failed");
      }
      const { _meta, ...mascot } = data;
      setResult(mascot);
      setStep("studio");
      // Report the model that actually ran, which may be a fallback.
      trackEvent("generate_completed", {
        action: "studio",
        model: _meta?.model ?? model,
      });
      try {
        await persist(mascot);
        toast.success(`${mascot.name} saved to your library`);
      } catch (saveErr) {
        toast.error(
          saveErr instanceof Error
            ? saveErr.message
            : "Studio ready, but save failed"
        );
      }
      if (_meta?.skippedGestures?.length) {
        toast.warning(
          `Studio ready. Skipped: ${_meta.skippedGestures.join(", ")}`
        );
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      reportGenerationError(err, "Generation failed", "studio", errorCode);
    } finally {
      setStudioLoading(false);
    }
  };

  if (step === "studio" && result) {
    return (
      <div className="relative min-h-screen bg-[#0a0e18]">
        <div className="absolute left-4 top-4 z-50 flex gap-2 sm:left-6 sm:top-6">
          <Link
            href="/library"
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
          >
            ← Library
          </Link>
          {mascotId && (
            <Link
              href={`/library/${mascotId}`}
              className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
            >
              Open saved
            </Link>
          )}
          {saving && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </span>
          )}
          <button
            type="button"
            onClick={() => void restartFromStudio("samples")}
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
          >
            Change look
          </button>
          <button
            type="button"
            onClick={() => void restartFromStudio("brief")}
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
          >
            Edit brief
          </button>
        </div>
        <GeneratedStudio
          mascot={result}
          look={look}
          model={model ?? undefined}
          mascotId={mascotId}
          onMascotChange={(next) => {
            setResult(next);
            persistSafe(next);
          }}
          fullPage
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_20%_-10%,rgba(245,179,79,0.14),transparent_55%),radial-gradient(700px_420px_at_90%_0%,rgba(88,140,255,0.1),transparent_50%)]" />
      <div className="relative">
        <SiteHeader />

        <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
              Create · {step === "brief" ? "1. Brief" : "2. Choose look"}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
              {step === "brief" ? "Describe your mascot" : "Pick a look"}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--brand-muted)]">
              {step === "brief"
                ? "Tell us who they are and how they should look. We’ll show three static concepts, then build a full studio from your pick."
                : "Three static concepts. Choose one and we’ll animate it to the same craft bar as Fanous and Lyra."}
            </p>
          </div>

          {step === "samples" && (
            <section className="mt-10 space-y-6">
              {samplesLoading ? (
                <SampleConceptsSkeleton />
              ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {samples.map((sample) => {
                  const on = pickedId === sample.id;
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      disabled={studioLoading}
                      onClick={() => setPickedId(sample.id)}
                      className={cn(
                        "group relative overflow-hidden rounded-[1.5rem] border text-left transition",
                        on
                          ? "border-[var(--brand-accent)] bg-white/[0.07] ring-2 ring-[var(--brand-accent)]/40"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      )}
                    >
                      <div className="flex min-h-[280px] items-center justify-center bg-[#0c1322] p-4 [&_svg]:h-auto [&_svg]:max-h-[260px] [&_svg]:w-full">
                        <div
                          className="w-full max-w-[220px]"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeSvg(sample.svg),
                          }}
                        />
                      </div>
                      <div className="space-y-1 border-t border-white/10 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-[family-name:var(--font-display)] text-lg">
                            {sample.title}
                          </h3>
                          {on && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-accent)] px-2 py-0.5 text-[11px] font-semibold text-[#12141c]">
                              <Check className="size-3" /> Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--brand-muted)]">
                          {sample.rationale}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
                  onClick={buildStudio}
                  disabled={studioLoading || !pickedSample}
                >
                  {studioLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Building Mascot Studio
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Build Mascot Studio
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-transparent"
                  disabled={samplesLoading || studioLoading}
                  onClick={() => setStep("brief")}
                >
                  Back to brief
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={samplesLoading || studioLoading}
                  onClick={requestSamples}
                >
                  {samplesLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Regenerate samples
                </Button>
              </div>
              <TokenEstimate
                model={model}
                gestures={allGestures.length || 1}
                scope="studio"
                hasReference={Boolean(referenceId)}
                availableModels={availableModelIds}
                className="max-w-md"
              />
            </section>
          )}

          {step === "brief" && (
            <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
                <div className="space-y-2">
                  <Label>Model</Label>
                  {modelsLoading ? (
                    <ModelPickerSkeleton />
                  ) : availableModels.every((m) => !m.available) ? (
                    <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      No model provider configured. Add{" "}
                      <code>ANTHROPIC_API_KEY</code> or{" "}
                      <code>OPENAI_API_KEY</code> to{" "}
                      <code>.env.local</code>.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {MODEL_PROVIDERS.map((provider) => (
                        <div key={provider}>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                            {provider}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {MASCOT_MODEL_OPTIONS.filter(
                              (opt) => opt.provider === provider
                            ).map((opt) => {
                              const available = modelAvailable(opt.id);
                              const on = model === opt.id;
                              const cost = estimateFullCreate(
                                allGestures.length || 1,
                                opt.id,
                                0,
                                referenceId ? 1 : 0
                              ).typical;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  aria-pressed={on}
                                  disabled={samplesLoading || !available}
                                  onClick={() => {
                                    setModel(opt.id);
                                    trackEvent("model_selected", {
                                      model: opt.id,
                                      provider: opt.provider,
                                    });
                                  }}
                                  className={cn(
                                    "flex h-full flex-col rounded-2xl border px-3.5 py-3 text-left transition",
                                    on
                                      ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 ring-1 ring-[var(--brand-accent)]/35"
                                      : "border-white/10 bg-black/20 hover:border-white/25",
                                    !available && "cursor-not-allowed opacity-45"
                                  )}
                                >
                                  <div className="font-[family-name:var(--font-display)] text-sm">
                                    {opt.label}
                                  </div>
                                  <p className="mt-1 flex-1 text-xs leading-relaxed text-[var(--brand-muted)]">
                                    {available
                                      ? opt.blurb
                                      : `${opt.envKey} not configured`}
                                  </p>
                                  {available && (
                                    <span
                                      className={cn(
                                        "mt-2 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                                        on
                                          ? "bg-[var(--brand-accent)] text-[#12141c]"
                                          : "bg-white/10 text-white/70"
                                      )}
                                    >
                                      ~{formatTokens(cost)} tokens
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm text-[var(--brand-muted)]">
                    Not sure where to start? Try a sample brief.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/15 bg-transparent"
                    onClick={() => void requestBriefSurprise("all")}
                    disabled={briefBusy}
                  >
                    {surpriseLoading === "all" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Shuffle className="size-3.5" />
                    )}
                    Surprise me
                  </Button>
                </div>
                <div className="group/field space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="name">Mascot name</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--brand-accent)] transition hover:text-[var(--brand-accent)]/80 disabled:opacity-50"
                      onClick={() => void requestBriefSurprise("name")}
                      disabled={briefBusy}
                    >
                      {surpriseLoading === "name" ? "Surprising…" : "Surprise me"}
                    </button>
                  </div>
                  <Input
                    id="name"
                    placeholder={
                      name.trim()
                        ? CREATE_FIELD_PLACEHOLDERS.name
                        : placeholderPreview.name
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={samplesLoading}
                    className="border-white/15 bg-black/20"
                  />
                </div>
                <div className="group/field space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="description">What are they?</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--brand-accent)] transition hover:text-[var(--brand-accent)]/80 disabled:opacity-50"
                      onClick={() => void requestBriefSurprise("description")}
                      disabled={briefBusy}
                    >
                      {surpriseLoading === "description"
                        ? "Surprising…"
                        : "Surprise me"}
                    </button>
                  </div>
                  <Textarea
                    id="description"
                    placeholder={
                      description.trim()
                        ? CREATE_FIELD_PLACEHOLDERS.description
                        : placeholderPreview.description
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={samplesLoading}
                    className="border-white/15 bg-black/20"
                  />
                </div>
                <div className="group/field space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="look">How should they look?</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--brand-accent)] transition hover:text-[var(--brand-accent)]/80 disabled:opacity-50"
                      onClick={() => void requestBriefSurprise("look")}
                      disabled={briefBusy}
                    >
                      {surpriseLoading === "look" ? "Surprising…" : "Surprise me"}
                    </button>
                  </div>
                  <Textarea
                    id="look"
                    placeholder={
                      look.trim()
                        ? CREATE_FIELD_PLACEHOLDERS.look
                        : placeholderPreview.look
                    }
                    value={look}
                    onChange={(e) => setLook(e.target.value)}
                    rows={4}
                    disabled={samplesLoading}
                    className="border-white/15 bg-black/20"
                  />
                </div>

                <ReferenceImageUpload
                  onReady={setReferenceId}
                  onClear={() => setReferenceId(undefined)}
                />

                <div className="group/field space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="product">App / product context</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--brand-accent)] transition hover:text-[var(--brand-accent)]/80 disabled:opacity-50"
                      onClick={() => void requestBriefSurprise("productContext")}
                      disabled={briefBusy}
                    >
                      {surpriseLoading === "productContext"
                        ? "Surprising…"
                        : "Surprise me"}
                    </button>
                  </div>
                  <Input
                    id="product"
                    placeholder={
                      productContext.trim()
                        ? CREATE_FIELD_PLACEHOLDERS.productContext
                        : placeholderPreview.productContext
                    }
                    value={productContext}
                    onChange={(e) => setProductContext(e.target.value)}
                    disabled={samplesLoading}
                    className="border-white/15 bg-black/20"
                  />
                </div>
                <div className="group/field space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="personality">Personality</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--brand-accent)] transition hover:text-[var(--brand-accent)]/80 disabled:opacity-50"
                      onClick={() => void requestBriefSurprise("personality")}
                      disabled={briefBusy}
                    >
                      {surpriseLoading === "personality"
                        ? "Surprising…"
                        : "Surprise me"}
                    </button>
                  </div>
                  <Input
                    id="personality"
                    placeholder={
                      personality.trim()
                        ? CREATE_FIELD_PLACEHOLDERS.personality
                        : placeholderPreview.personality
                    }
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    disabled={samplesLoading}
                    className="border-white/15 bg-black/20"
                  />
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
                  onClick={requestSamples}
                  disabled={samplesLoading || modelsLoading || !model}
                >
                  {samplesLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating 3 look samples…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate 3 look samples
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-[var(--brand-muted)]">
                  Samples are static concepts. After you pick one, we build the
                  animated studio.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-xl">
                      Gestures
                    </h2>
                    <p className="text-sm text-[var(--brand-muted)]">
                      Used after you pick a look
                    </p>
                  </div>
                  <Badge variant="outline" className="border-white/15">
                    {allGestures.length}/6
                  </Badge>
                </div>

                {GESTURE_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                      {cat}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GESTURE_PRESETS.filter((g) => g.cat === cat).map((g) => {
                        const on = selected.has(g.key);
                        return (
                          <button
                            key={g.key}
                            type="button"
                            disabled={samplesLoading}
                            onClick={() => toggle(g.key)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                              on
                                ? "border-transparent bg-[var(--brand-accent)] text-[#12141c]"
                                : "border-white/15 bg-white/[0.03] text-white/75 hover:border-white/30"
                            )}
                            title={g.tip}
                          >
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {customGestures.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                      Custom
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {customGestures.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          disabled={samplesLoading}
                          onClick={() =>
                            setCustomGestures((prev) =>
                              prev.filter((x) => x.key !== g.key)
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/20 px-3 py-1.5 text-xs font-medium"
                        >
                          {g.label}
                          <X className="size-3 opacity-70" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <Label>Add custom gesture</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      disabled={samplesLoading}
                      className="border-white/15 bg-black/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/15 bg-transparent"
                      onClick={addCustom}
                      disabled={samplesLoading}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Optional tip, what the pose means"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    disabled={samplesLoading}
                    className="border-white/15 bg-black/20"
                  />
                </div>
                </div>

                <TokenEstimate
                  model={model}
                  gestures={allGestures.length || 1}
                  scope="full"
                  hasReference={Boolean(referenceId)}
                  availableModels={availableModelIds}
                />
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
