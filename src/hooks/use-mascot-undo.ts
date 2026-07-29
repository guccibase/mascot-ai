"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratedMascot } from "@/lib/types";

export const MAX_UNDO_SNAPSHOTS = 20;
/** Skip snapshots larger than this to avoid memory pressure. */
export const MAX_UNDO_SNAPSHOT_BYTES = 900_000;

export type UndoSnapshot = {
  mascot: GeneratedMascot;
  /** Refine chat length to restore alongside the pack. */
  refineHistoryLength: number;
};

export type UndoRestorePayload = {
  mascot: GeneratedMascot;
  refineHistoryLength: number;
};

function cloneMascot(mascot: GeneratedMascot): GeneratedMascot {
  return structuredClone(mascot);
}

export function snapshotByteSize(mascot: GeneratedMascot): number {
  return JSON.stringify(mascot).length;
}

/** Pure stack push — exported for unit tests. */
export function pushUndoSnapshot(
  stack: UndoSnapshot[],
  snapshot: UndoSnapshot,
  maxSnapshots = MAX_UNDO_SNAPSHOTS,
  maxBytes = MAX_UNDO_SNAPSHOT_BYTES
): { stack: UndoSnapshot[]; saved: boolean } {
  try {
    const clone = cloneMascot(snapshot.mascot);
    if (snapshotByteSize(clone) > maxBytes) {
      return { stack, saved: false };
    }

    const entry: UndoSnapshot = {
      mascot: clone,
      refineHistoryLength: snapshot.refineHistoryLength,
    };

    let next = [...stack, entry];
    if (next.length > maxSnapshots) {
      next = next.slice(next.length - maxSnapshots);
    }
    return { stack: next, saved: true };
  } catch {
    return { stack, saved: false };
  }
}

/** Pure stack pop — exported for unit tests. */
export function popUndoSnapshot(stack: UndoSnapshot[]): {
  stack: UndoSnapshot[];
  snapshot: UndoSnapshot | null;
} {
  if (stack.length === 0) {
    return { stack, snapshot: null };
  }
  const next = stack.slice(0, -1);
  const snapshot = stack[stack.length - 1] ?? null;
  return { stack: next, snapshot };
}

/**
 * In-memory undo stack for AI edits (refine / add gesture).
 * Snapshots are not persisted — only covers the current studio session.
 */
export function useMascotUndo(onRestore: (payload: UndoRestorePayload) => void) {
  const stackRef = useRef<UndoSnapshot[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  const syncDepth = useCallback((stack: UndoSnapshot[]) => {
    stackRef.current = stack;
    setUndoDepth(stack.length);
  }, []);

  const pushSnapshot = useCallback(
    (mascot: GeneratedMascot, refineHistoryLength = 0): boolean => {
      const { stack, saved } = pushUndoSnapshot(stackRef.current, {
        mascot,
        refineHistoryLength,
      });
      syncDepth(stack);
      return saved;
    },
    [syncDepth]
  );

  const undo = useCallback((): boolean => {
    const { stack, snapshot } = popUndoSnapshot(stackRef.current);
    if (!snapshot) return false;
    syncDepth(stack);
    onRestore({
      mascot: snapshot.mascot,
      refineHistoryLength: snapshot.refineHistoryLength,
    });
    return true;
  }, [onRestore, syncDepth]);

  const clear = useCallback(() => {
    syncDepth([]);
  }, [syncDepth]);

  return {
    pushSnapshot,
    undo,
    canUndo: undoDepth > 0,
    undoDepth,
    clear,
  };
}

/** Reset undo when navigating between saved mascots (not on pack field edits). */
export function shouldResetUndoStack(
  previousId: string | null | undefined,
  nextId: string | null | undefined
): boolean {
  return previousId != null && nextId != null && previousId !== nextId;
}

export function useResetUndoOnMascotIdChange(
  mascotId: string | null | undefined,
  clear: () => void
) {
  const prevId = useRef(mascotId);

  useEffect(() => {
    if (shouldResetUndoStack(prevId.current, mascotId)) {
      clear();
    }
    prevId.current = mascotId;
  }, [mascotId, clear]);
}
