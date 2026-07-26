import "server-only";

import type { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/** Upload a binary blob to Convex file storage and register ownership. */
export async function uploadConvexBlob(
  client: ConvexHttpClient,
  buffer: Buffer,
  contentType: string
): Promise<Id<"_storage">> {
  const uploadUrl = await client.mutation(api.referenceAssets.generateUploadUrl, {});
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    throw new Error(`Convex upload failed (${res.status})`);
  }
  const json = (await res.json()) as { storageId?: Id<"_storage"> };
  if (!json.storageId) {
    throw new Error("Convex upload returned no storageId");
  }
  await client.mutation(api.mascotAppAssets.registerUpload, {
    storageId: json.storageId,
  });
  return json.storageId;
}
