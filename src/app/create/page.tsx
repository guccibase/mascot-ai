"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
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
import type { GeneratedMascot } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_KEYS = ["idle", "wave", "happy"];

export default function CreatePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productContext, setProductContext] = useState("");
  const [personality, setPersonality] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(DEFAULT_KEYS)
  );
  const [customLabel, setCustomLabel] = useState("");
  const [customTip, setCustomTip] = useState("");
  const [customGestures, setCustomGestures] = useState<
    Array<{ key: string; label: string; cat: string; tip: string; use: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedMascot | null>(null);

  const selectedPresets = useMemo(
    () => GESTURE_PRESETS.filter((g) => selected.has(g.key)),
    [selected]
  );

  const allGestures = useMemo(
    () => [...selectedPresets, ...customGestures],
    [selectedPresets, customGestures]
  );

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

  const generate = async () => {
    if (!name.trim() || !description.trim()) {
      toast.error("Name and description are required");
      return;
    }
    if (allGestures.length < 1) {
      toast.error("Pick at least one gesture");
      return;
    }
    if (allGestures.length > 6) {
      toast.error("Keep it to 6 gestures max for quality");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          productContext: productContext.trim() || undefined,
          personality: personality.trim() || undefined,
          gestures: allGestures,
        }),
      });
      const data = (await res.json()) as GeneratedMascot & {
        error?: string;
        _meta?: { model?: string };
      };
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }
      const { _meta, ...mascot } = data;
      setResult(mascot);
      toast.success(`${mascot.name} is ready — try the poses`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="relative min-h-screen bg-[#0a0e18]">
        <div className="absolute left-4 top-4 z-50 flex gap-2 sm:left-6 sm:top-6">
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
          >
            ← Home
          </Link>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
          >
            Edit brief
          </button>
          <Link
            href="/studio/lyra"
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur hover:bg-black/55"
          >
            Compare Lyra
          </Link>
        </div>
        <GeneratedStudio mascot={result} fullPage />
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
              Create
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
              Build a mascot studio
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--brand-muted)]">
              Same pattern as Lyra, Sol, Bud, and Fanous — animated SVG, gesture
              performances, downloadable for web and mobile.
            </p>
          </div>

          <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
              <div className="space-y-2">
                <Label htmlFor="name">Mascot name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Nori, Pixel, Hearth"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="border-white/15 bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">What are they?</Label>
                <Textarea
                  id="description"
                  placeholder="A soft moss fox that helps with focus sessions — round ears, tiny lantern tail…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={loading}
                  className="border-white/15 bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">App / product context</Label>
                <Input
                  id="product"
                  placeholder="Focus timer, fitness coach, Quran app…"
                  value={productContext}
                  onChange={(e) => setProductContext(e.target.value)}
                  disabled={loading}
                  className="border-white/15 bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Input
                  id="personality"
                  placeholder="Warm, slightly mischievous, never loud"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  disabled={loading}
                  className="border-white/15 bg-black/20"
                />
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full bg-[var(--brand-accent)] text-[#12141c] hover:bg-[var(--brand-accent)]/90"
                onClick={generate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating your mascot studio…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate studio ({allGestures.length} poses)
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-[var(--brand-muted)]">
                Usually ~30–45 seconds.{" "}
                <Link href="/#examples" className="underline underline-offset-2">
                  See examples
                </Link>
              </p>
            </div>

            <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl">
                    Gestures
                  </h2>
                  <p className="text-sm text-[var(--brand-muted)]">
                    Pick presets or add your own
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
                          disabled={loading}
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
                        disabled={loading}
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
                    disabled={loading}
                    className="border-white/15 bg-black/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/15 bg-transparent"
                    onClick={addCustom}
                    disabled={loading}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Optional tip — what the pose means"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  disabled={loading}
                  className="border-white/15 bg-black/20"
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
