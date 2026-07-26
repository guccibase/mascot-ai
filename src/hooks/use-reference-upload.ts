"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { prepareReferenceFile } from "@/lib/reference-image-client";

export type ReferenceUploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | {
      status: "ready";
      referenceId: Id<"referenceAssets">;
      previewUrl: string;
      width: number;
      height: number;
      bytes: number;
    }
  | { status: "error"; message: string };

export function useReferenceUpload() {
  const generateUploadUrl = useMutation(api.referenceAssets.generateUploadUrl);
  const finalizeReference = useMutation(api.referenceAssets.finalizeReference);
  const removeReference = useMutation(api.referenceAssets.removeReference);

  const [state, setState] = useState<ReferenceUploadState>({ status: "idle" });

  const clear = useCallback(async () => {
    if (state.status === "ready") {
      URL.revokeObjectURL(state.previewUrl);
      try {
        await removeReference({ referenceId: state.referenceId });
      } catch {
        // Best-effort cleanup
      }
    }
    setState({ status: "idle" });
  }, [removeReference, state]);

  const upload = useCallback(
    async (file: File) => {
      setState({ status: "uploading" });
      try {
        const prepared = await prepareReferenceFile(file);
        const previewUrl = URL.createObjectURL(prepared.blob);

        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": prepared.mediaType },
          body: prepared.blob,
        });
        if (!res.ok) throw new Error("Upload failed");

        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        const meta = await finalizeReference({
          storageId,
          mediaType: prepared.mediaType,
          width: prepared.width,
          height: prepared.height,
          bytes: prepared.blob.size,
        });

        setState({
          status: "ready",
          referenceId: meta.referenceId,
          previewUrl,
          width: meta.width,
          height: meta.height,
          bytes: meta.bytes,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not upload reference";
        setState({ status: "error", message });
        throw err;
      }
    },
    [finalizeReference, generateUploadUrl]
  );

  const referenceId =
    state.status === "ready" ? state.referenceId : undefined;

  return { state, upload, clear, referenceId };
}
