"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Deters casual extraction on preview-only studios (marketplace listings,
 * public examples). Interactive preview still needs SVG in the DOM; this blocks
 * the most common browser shortcuts — not DevTools or network inspection.
 */
export function usePreviewContentProtection(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const blockSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "s") return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      event.preventDefault();
      toast.message("Preview only — create or purchase to download files");
    };

    const blockDrag = (event: DragEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-preview-protected]")) return;
      event.preventDefault();
    };

    window.addEventListener("keydown", blockSaveShortcut);
    document.addEventListener("dragstart", blockDrag, true);
    return () => {
      window.removeEventListener("keydown", blockSaveShortcut);
      document.removeEventListener("dragstart", blockDrag, true);
    };
  }, [enabled]);
}
