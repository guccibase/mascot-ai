"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { applyPartVisibility } from "@/lib/mascot-parts";
import type { MascotPart } from "@/lib/types";

/**
 * Reversible element toggles for legacy JSX studios. Tags SVG groups with
 * `data-ms-part` and applies visibility after each render / gesture change.
 */
export function useStudioPartToggles(
  catalog: MascotPart[],
  svgRef: React.RefObject<SVGElement | null>,
  /** Re-apply when the mounted SVG subtree changes (gesture, theme, etc.). */
  refreshDeps: readonly unknown[] = []
) {
  const [enabledParts, setEnabledParts] = useState(
    () => new Set(catalog.map((part) => part.key))
  );

  const togglePart = useCallback((key: string) => {
    setEnabledParts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    applyPartVisibility(svgRef.current, enabledParts);
  }, [enabledParts, svgRef, ...refreshDeps]);

  return { parts: catalog, enabledParts, togglePart };
}
