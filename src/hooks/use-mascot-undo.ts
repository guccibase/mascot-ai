"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratedMascot } from "@/lib/types";

const MAX_SNAPSHOTS = 20;
/** Skip snapshots larger than this to avoid memory pressure. */
const MAX_SNAPSHOT_BYTES = 900_000;

function cloneMascot(mascot: GeneratedMascot): GeneratedMascot {
  return structuredClone(mascot);
}

/**
 * In-memory undo stack for AI edits (refine / add gesture).
 * Snapshots are not persisted — only covers the current studio session.
 */
export function useMascotUndo(onRestore: (mascot: GeneratedMascot) => void) {
  const stackRef = useRef<GeneratedMascot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushSnapshot = useCallback((mascot: GeneratedMascot) => {
    try {
      const clone = cloneMascot(mascot);
      if (JSON.stringify(clone).length > MAX_SNAPSHOT_BYTES) return;

      let stack = [...stackRef.current, clone];
      if (stack.length > MAX_SNAPSHOTS) {
        stack = stack.slice(stack.length - MAX_SNAPSHOTS);
      }
      stackRef.current = stack;
      setCanUndo(stack.length > 0);
    } catch {
      /* structuredClone can fail on exotic objects — skip snapshot */
    }
  }, []);

  const undo = useCallback(() => {
    const stack = stackRef.current;
    if (stack.length === 0) return false;
    const previous = stack.pop()!;
    stackRef.current = stack;
    setCanUndo(stack.length > 0);
    onRestore(previous);
    return true;
  }, [onRestore]);

  const clear = useCallback(() => {
    stackRef.current = [];
    setCanUndo(false);
  }, []);

  return { pushSnapshot, undo, canUndo, clear };
}

/** Reset undo when the loaded mascot identity changes. */
export function useResetUndoOnIdentityChange(
  mascot: GeneratedMascot,
  clear: () => void
) {
  const sig = `${mascot.name}\0${mascot.tagline}`;
  const prevSig = useRef(sig);

  useEffect(() => {
    if (prevSig.current !== sig) {
      prevSig.current = sig;
      clear();
    }
  }, [sig, clear]);
}
