import "server-only";

import { authedConvexClient } from "@/lib/convex-server";
import type { MascotImageInput } from "@/lib/types";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export async function loadReferenceImage(
  referenceId: string
): Promise<MascotImageInput | null> {
  const client = await authedConvexClient();
  if (!client) return null;

  try {
    const ref = await client.query(api.referenceAssets.getReferenceUrl, {
      referenceId: referenceId as Id<"referenceAssets">,
    });
    if (!ref) return null;

    const res = await fetch(ref.url);
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) return null;

    return {
      mediaType: ref.mediaType,
      data: buf.toString("base64"),
    };
  } catch {
    return null;
  }
}
