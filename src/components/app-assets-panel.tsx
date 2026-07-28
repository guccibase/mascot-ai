"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, ImageIcon, Loader2, Package, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { zipSync } from "fflate";
import {
  APP_ASSET_KINDS,
  packOutputFileCount,
  type AppAssetKind,
} from "@/lib/app-assets/catalog";
import { trackEvent } from "@/lib/analytics";
import { estimateTokens, formatTokens } from "@/lib/token-pricing";
import type { AppAssetKindId, MascotModelId } from "@/lib/types";
import { useTokenBalance } from "@/lib/use-token-balance";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type SampleOption = { id: string; label: string; url: string };

type AssetFile = {
  path: string;
  label: string;
  url: string;
  bytes: number;
  mediaType: string;
};

type Props = {
  mascotId: Id<"mascots"> | null;
  mascotName: string;
  model?: MascotModelId;
};

const DEFAULT_KINDS: AppAssetKind[] = ["app_icon", "favicon"];

export function AppAssetsPanel({ mascotId, mascotName, model }: Props) {
  const balance = useTokenBalance();
  const billingModel = model ?? "gpt-5.6-sol";

  const [kinds, setKinds] = useState<Set<AppAssetKind>>(
    () => new Set(DEFAULT_KINDS)
  );
  const [styleDescription, setStyleDescription] = useState("");
  const [packId, setPackId] = useState<Id<"mascotAppAssetPacks"> | null>(null);
  const [samples, setSamples] = useState<SampleOption[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [generatingSamples, setGeneratingSamples] = useState(false);
  const [generatingPack, setGeneratingPack] = useState(false);
  const [deletingPackId, setDeletingPackId] = useState<Id<"mascotAppAssetPacks"> | null>(
    null
  );

  const removePack = useMutation(api.mascotAppAssets.removePack);

  const history = useQuery(
    api.mascotAppAssets.listForMascot,
    mascotId ? { mascotId } : "skip"
  );

  const activePack = useQuery(
    api.mascotAppAssets.getPack,
    packId ? { packId } : "skip"
  );

  const kindList = useMemo(() => [...kinds], [kinds]);
  const fileCount = useMemo(() => packOutputFileCount(kindList), [kindList]);

  const samplesQuote = useMemo(
    () => estimateTokens({ kind: "appAssetSamples", images: 3 }, billingModel),
    [billingModel]
  );
  const packQuote = useMemo(
    () => estimateTokens({ kind: "appAssetPack", fileCount }, billingModel),
    [billingModel, fileCount]
  );
  const totalQuote = samplesQuote.typical + packQuote.typical;
  const affordable =
    balance?.total == null || balance.total >= samplesQuote.typical;

  const toggleKind = (id: AppAssetKind) => {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const loadPack = (id: Id<"mascotAppAssetPacks">) => {
    setPackId(id);
    setSelectedSampleId(null);
    setSamples([]);
    setFiles([]);
  };

  const lastHydratedPackId = useRef<Id<"mascotAppAssetPacks"> | null>(null);

  useEffect(() => {
    lastHydratedPackId.current = null;
  }, [packId]);

  useEffect(() => {
    if (!activePack || activePack._id !== packId) return;
    if (lastHydratedPackId.current === packId) return;
    lastHydratedPackId.current = packId;
    setSamples(activePack.sampleOptions);
    setSelectedSampleId(activePack.selectedSampleId ?? null);
    setFiles(activePack.files);
    setStyleDescription(activePack.styleDescription ?? "");
    setKinds(new Set(activePack.kinds));
  }, [activePack, packId]);

  const deletePack = async (id: Id<"mascotAppAssetPacks">) => {
    if (!window.confirm("Delete this asset pack and its files?")) return;
    setDeletingPackId(id);
    try {
      await removePack({ packId: id });
      if (packId === id) {
        setPackId(null);
        setSamples([]);
        setSelectedSampleId(null);
        setFiles([]);
        lastHydratedPackId.current = null;
      }
      toast.success("Asset pack deleted");
    } catch {
      toast.error("Could not delete asset pack");
    } finally {
      setDeletingPackId(null);
    }
  };

  const generateSamples = async (regenerate = false) => {
    if (!mascotId || kindList.length === 0) return;
    if (!affordable) {
      toast.error("Not enough tokens for icon previews");
      return;
    }

    setGeneratingSamples(true);
    trackEvent("generate_started", { action: "appAssetSamples", model: billingModel });

    try {
      const res = await fetch("/api/generate/app-assets/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascotId,
          kinds: kindList as AppAssetKindId[],
          styleDescription: styleDescription.trim() || undefined,
          packId: regenerate && packId ? packId : undefined,
          model: billingModel,
        }),
      });

      let data: {
        error?: string;
        code?: string;
        packId?: string;
        samples?: SampleOption[];
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        trackEvent("generate_failed", {
          action: "appAssetSamples",
          reason: res.status === 504 ? "timeout" : "bad_response",
        });
        toast.error(
          res.status === 504
            ? "Icon preview generation timed out — try again"
            : "Could not generate icon previews"
        );
        return;
      }

      if (!res.ok) {
        trackEvent("generate_failed", {
          action: "appAssetSamples",
          reason: data.code ?? "error",
        });
        toast.error(data.error ?? "Could not generate icon previews");
        return;
      }

      setPackId(data.packId as Id<"mascotAppAssetPacks">);
      setSamples(data.samples ?? []);
      setSelectedSampleId(null);
      setFiles([]);
      trackEvent("generate_completed", {
        action: "appAssetSamples",
        model: billingModel,
      });
      toast.success("3 icon previews ready — pick your favorite");
    } catch {
      trackEvent("generate_failed", { action: "appAssetSamples", reason: "error" });
      toast.error("Network error while generating icon previews");
    } finally {
      setGeneratingSamples(false);
    }
  };

  const generatePack = async () => {
    if (!packId || !selectedSampleId) return;
    if (balance?.total != null && balance.total < packQuote.typical) {
      toast.error("Not enough tokens to build the asset pack");
      return;
    }

    setGeneratingPack(true);
    trackEvent("generate_started", { action: "appAssetPack", model: billingModel });

    try {
      const res = await fetch("/api/generate/app-assets/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId,
          selectedSampleId,
          model: billingModel,
        }),
      });

      let data: {
        error?: string;
        code?: string;
        files?: AssetFile[];
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        trackEvent("generate_failed", {
          action: "appAssetPack",
          reason: res.status === 504 ? "timeout" : "bad_response",
        });
        toast.error(
          res.status === 504
            ? "Pack build timed out — try again"
            : "Could not build asset pack"
        );
        return;
      }

      if (!res.ok) {
        trackEvent("generate_failed", {
          action: "appAssetPack",
          reason: data.code ?? "error",
        });
        toast.error(data.error ?? "Could not build asset pack");
        return;
      }

      setFiles(data.files ?? []);
      trackEvent("generate_completed", { action: "appAssetPack", model: billingModel });
      toast.success("App asset pack ready to download");
    } catch {
      trackEvent("generate_failed", { action: "appAssetPack", reason: "error" });
      toast.error("Network error while building pack");
    } finally {
      setGeneratingPack(false);
    }
  };

  const downloadFile = async (file: AssetFile) => {
    const res = await fetch(file.url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.path.split("/").pop() ?? "asset";
    a.click();
    URL.revokeObjectURL(a.href);
    trackEvent("app_assets_downloaded", { kind: "single" });
  };

  const downloadAll = async () => {
    if (files.length === 0) return;
    const zipEntries: Record<string, Uint8Array> = {};
    for (const file of files) {
      const res = await fetch(file.url);
      const buf = new Uint8Array(await res.arrayBuffer());
      zipEntries[file.path] = buf;
    }
    const zipped = zipSync(zipEntries, { level: 6 });
    const blob = new Blob([zipped], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(mascotName)}-app-assets.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    trackEvent("app_assets_downloaded", { kind: "pack" });
    toast.success("Asset pack downloaded");
  };

  if (!mascotId) {
    return (
      <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="gs-eyebrow mb-2">App assets</p>
        <p className="text-sm text-[#8D8472]">
          Save your mascot first, then generate app icons, favicons, and PWA assets here.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-black/20 p-5">
      <div>
        <p className="gs-eyebrow mb-1">App assets</p>
        <p className="text-sm leading-relaxed text-[#8D8472]">
          Generate store-ready icons from your exact mascot artwork. We place your
          character on 3 polished backgrounds; after you pick one, we resize into
          every size in your pack.
        </p>
      </div>

      <div className="space-y-2">
        <span className="gs-eyebrow">Include in pack</span>
        {samples.length > 0 ? (
          <p className="text-xs text-[#8D8472]">
            Locked for this preview set — generate a new preview set to change.
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {APP_ASSET_KINDS.map((kind) => (
            <label
              key={kind.id}
              className={cn(
                "flex gap-3 rounded-xl border px-3 py-2.5 transition",
                samples.length > 0 ? "cursor-default opacity-90" : "cursor-pointer",
                kinds.has(kind.id)
                  ? "border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              )}
            >
              <input
                type="checkbox"
                className="mt-1 accent-[var(--brand-accent)]"
                checked={kinds.has(kind.id)}
                disabled={samples.length > 0}
                onChange={() => toggleKind(kind.id)}
              />
              <span>
                <span className="block text-sm font-medium text-white">{kind.label}</span>
                <span className="block text-xs text-[#8D8472]">{kind.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="gs-eyebrow mb-2 block" htmlFor="asset-style">
          Style notes (optional)
        </label>
        <textarea
          id="asset-style"
          rows={2}
          value={styleDescription}
          onChange={(e) => setStyleDescription(e.target.value)}
          placeholder="Optional notes for your records (previews use your mascot artwork and brand colors)"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[var(--brand-accent)]/50 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-[#8D8472]">3 icon previews</span>
          <span className="tabular-nums text-white">{formatTokens(samplesQuote.typical)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-3">
          <span className="text-[#8D8472]">
            Pack export · {fileCount} file{fileCount === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums text-white">{formatTokens(packQuote.typical)}</span>
        </div>
        <div className="mt-2 flex justify-between gap-3 border-t border-white/10 pt-2 font-medium">
          <span className="text-[#C6BCA7]">Typical total</span>
          <span className="tabular-nums text-[var(--brand-accent)]">
            {formatTokens(totalQuote)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={generatingSamples || kindList.length === 0}
          onClick={() => void generateSamples(false)}
          className="gs-btn flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
        >
          {generatingSamples ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          {samples.length > 0 ? "New preview set" : "Generate 3 icon previews"}
        </button>
        {samples.length > 0 && (
          <button
            type="button"
            disabled={generatingSamples}
            onClick={() => void generateSamples(true)}
            className="gs-btn ghost flex items-center justify-center gap-2 sm:w-auto"
          >
            <RefreshCw className="size-4" />
            Regenerate
          </button>
        )}
      </div>

      {samples.length > 0 && (
        <div>
          <p className="gs-eyebrow mb-3">Choose your icon</p>
          <div className="grid grid-cols-3 gap-3">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => setSelectedSampleId(sample.id)}
                className={cn(
                  "overflow-hidden rounded-2xl border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]",
                  selectedSampleId === sample.id
                    ? "border-[var(--brand-accent)] shadow-[0_0_0_1px_var(--brand-accent)]"
                    : "border-white/10 hover:border-white/25"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sample.url}
                  alt={sample.label}
                  className="aspect-square w-full bg-[#1a1625] object-cover"
                />
                <span className="block py-2 text-center text-xs font-medium text-[#C6BCA7]">
                  {sample.label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!selectedSampleId || generatingPack}
            onClick={() => void generatePack()}
            className="gs-btn mt-4 w-full disabled:opacity-50"
          >
            {generatingPack ? (
              <>
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                Building pack…
              </>
            ) : (
              <>
                <Package className="mr-2 inline size-4" />
                Build pack · {fileCount} file{fileCount === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="gs-eyebrow">Your assets</p>
            <button
              type="button"
              onClick={() => void downloadAll()}
              className="gs-btn ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Download className="size-3.5" />
              Download all (.zip)
            </button>
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {files
              .filter((f) => !f.path.endsWith("README.txt"))
              .map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{file.label}</p>
                    <p className="truncate text-xs text-[#8D8472]">{file.path}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadFile(file)}
                    className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-[#C6BCA7] hover:bg-white/5"
                  >
                    Download
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <p className="gs-eyebrow mb-2">Previous packs</p>
          <ul className="space-y-1.5">
            {history.map((row) => (
              <li key={row._id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => loadPack(row._id)}
                  className={cn(
                    "min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/5",
                    packId === row._id ? "bg-white/10 text-white" : "text-[#C6BCA7]"
                  )}
                >
                  {new Date(row.updatedAt).toLocaleString()} ·{" "}
                  {row.status === "ready"
                    ? `${row.fileCount} files`
                    : `${row.sampleCount} previews`}
                </button>
                <button
                  type="button"
                  aria-label="Delete asset pack"
                  disabled={deletingPackId === row._id}
                  onClick={() => void deletePack(row._id)}
                  className="shrink-0 rounded-lg border border-white/10 p-2 text-[#8D8472] transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingPackId === row._id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "mascot";
}
