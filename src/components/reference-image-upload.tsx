"use client";

import { useEffect, useRef } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReferenceUpload } from "@/hooks/use-reference-upload";

type Props = {
  className?: string;
  title?: string;
  hint?: string;
  onReady?: (referenceId: string) => void;
  onClear?: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function ReferenceImageUpload({
  className,
  title = "Design reference",
  hint = "Optional — upload your mascot sketch or illustration",
  onReady,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, upload, clear } = useReferenceUpload();

  useEffect(() => {
    if (state.status === "ready") {
      onReady?.(state.referenceId);
    }
  }, [state, onReady]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await upload(file);
    } catch {
      // Error state shown in UI
    }
  };

  const handleClear = async () => {
    await clear();
    onClear?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-[var(--brand-muted)]">{hint}</p>
        </div>
        {state.status === "ready" && (
          <span className="text-[11px] tabular-nums text-[var(--brand-muted)]">
            {state.width}×{state.height} · {formatBytes(state.bytes)}
          </span>
        )}
      </div>

      {state.status === "ready" ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.previewUrl}
            alt="Your mascot design reference"
            className="mx-auto max-h-48 w-full object-contain p-3"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-8 rounded-full bg-black/60 text-white hover:bg-black/80"
            onClick={() => void handleClear()}
            aria-label="Remove reference image"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={state.status === "uploading"}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files[0];
            void handleFile(file);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center transition",
            "hover:border-[var(--brand-accent)]/40 hover:bg-white/[0.05]",
            "disabled:pointer-events-none disabled:opacity-60",
            state.status === "error" && "border-red-400/40"
          )}
        >
          {state.status === "uploading" ? (
            <>
              <Loader2 className="size-6 animate-spin text-[var(--brand-accent)]" />
              <span className="text-sm text-[var(--brand-muted)]">
                Uploading…
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="size-6 text-[var(--brand-accent)]" />
              <span className="text-sm font-medium text-white">
                Drop a sketch or design
              </span>
              <span className="max-w-xs text-xs text-[var(--brand-muted)]">
                PNG, JPEG, or WebP · max 2 MB · we match it as closely as
                possible in vector form
              </span>
            </>
          )}
        </button>
      )}

      {state.status === "error" && (
        <p className="text-xs text-red-300">{state.message}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
