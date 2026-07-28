import { NextResponse } from "next/server";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import { packOutputFileCount, type AppAssetKind } from "@/lib/app-assets/catalog";
import { buildAssetFiles, type BuiltAssetFile } from "@/lib/app-assets/pack-builder";
import { uploadConvexBlob } from "@/lib/convex-upload";
import { authedConvexClient } from "@/lib/convex-server";
import { openMeter } from "@/lib/metering";
import { resolveMascotModel } from "@/lib/mascot-model";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import type { AppAssetPackRequest } from "@/lib/types";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BODY_BYTES = 8_000;

function generationServerSecret(): string | undefined {
  return process.env.GENERATION_SERVER_SECRET;
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "app-asset-pack",
    limit: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<AppAssetPackRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (!body.packId || !body.selectedSampleId) {
    return NextResponse.json(
      { error: "packId and selectedSampleId are required" },
      { status: 400 }
    );
  }

  const client = await authedConvexClient();
  if (!client) {
    return NextResponse.json({ error: "Sign in to generate app assets" }, { status: 401 });
  }

  const pack = await client.query(api.mascotAppAssets.getPack, {
    packId: body.packId as Id<"mascotAppAssetPacks">,
  });
  if (!pack) {
    return NextResponse.json({ error: "Asset pack not found" }, { status: 404 });
  }

  const sample = pack.sampleOptions.find((s) => s.id === body.selectedSampleId);
  if (!sample) {
    return NextResponse.json({ error: "Selected sample not found" }, { status: 400 });
  }

  const mascot = await client.query(api.mascots.getMine, { mascotId: pack.mascotId });
  if (!mascot) {
    return NextResponse.json({ error: "Mascot not found" }, { status: 404 });
  }

  const resolved = resolveMascotModel(body.model ?? (mascot.model as never));
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const fileCount = packOutputFileCount(pack.kinds as AppAssetKind[]);
  const metered = await openMeter({ kind: "appAssetPack", fileCount }, model);
  if (!metered.ok) return metered.response;
  const { meter } = metered;

  const started = Date.now();

  try {
    const masterRes = await fetch(sample.url);
    if (!masterRes.ok) {
      return NextResponse.json({ error: "Could not load selected icon" }, { status: 502 });
    }
    const masterPng = Buffer.from(await masterRes.arrayBuffer());

    const idle =
      mascot.pack.gestures.find((g) => g.key === "idle") ?? mascot.pack.gestures[0];
    const idleSvg = sanitizeSvg(idle?.svg ?? "");

    const built = await buildAssetFiles({
      masterPng,
      idleSvg,
      kinds: pack.kinds,
      accent: mascot.pack.accent,
      name: mascot.name,
      tagline: mascot.tagline,
    });

    meter.recordFallback({ kind: "appAssetPack", fileCount });

    const masterStorageId = await uploadConvexBlob(client, masterPng, "image/png");
    const storedFiles: Array<{
      path: string;
      label: string;
      storageId: Id<"_storage">;
      bytes: number;
      mediaType: BuiltAssetFile["mediaType"];
    }> = [];

    for (const file of built) {
      const storageId = await uploadConvexBlob(client, file.buffer, file.mediaType);
      storedFiles.push({
        path: file.path,
        label: file.label,
        storageId,
        bytes: file.buffer.byteLength,
        mediaType: file.mediaType,
      });
    }

    await client.mutation(api.mascotAppAssets.savePack, {
      packId: body.packId as Id<"mascotAppAssetPacks">,
      selectedSampleId: body.selectedSampleId,
      masterStorageId,
      files: storedFiles,
      serverSecret: generationServerSecret(),
    });

    const detail = await client.query(api.mascotAppAssets.getPack, {
      packId: body.packId as Id<"mascotAppAssetPacks">,
    });

    const tokens = await meter.settle();

    return NextResponse.json({
      packId: body.packId,
      files:
        detail?.files.map((f) => ({
          path: f.path,
          label: f.label,
          url: f.url,
          bytes: f.bytes,
          mediaType: f.mediaType,
        })) ?? [],
      _meta: {
        elapsedMs: Date.now() - started,
        tokens: tokens.tokens,
        balance: tokens.balance,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "App asset pack generation failed";
    console.error("app-asset pack error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await meter.settle();
  }
}
