"use client";

import type { ReactNode } from "react";
import { usePreviewContentProtection } from "@/hooks/use-preview-content-protection";

type Props = {
  children: ReactNode;
  /** When false, renders children without extraction guards. */
  enabled?: boolean;
};

/**
 * Wraps preview-only studio surfaces to block context-menu save and drag-out
 * of mascot SVGs. Pair with `usePreviewContentProtection` keyboard blocking.
 */
export function PreviewContentGuard({ children, enabled = true }: Props) {
  usePreviewContentProtection(enabled);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      data-preview-protected
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
