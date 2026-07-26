import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { isAppAssetKind, type AppAssetKind } from "@/lib/app-assets/catalog";
import { svgToSquarePng } from "@/lib/app-assets/raster";
import { uploadConvexBlob } from "@/lib/convex-upload";
import { authedConvexClient } from "@/lib/convex-server";
import { openMeter } from "@/lib/metering";
import { buildIconPrompt, generateAppIconImage } from "@/lib/openai-image";
import { resolveMascotModel } from "@/lib/mascot-model";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import type { AppAssetSamplesRequest } from "@/lib/types";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BODY_BYTES = 16_000;
const SAMPLE_LABELS = ["Option A", "Option B", "Option C"] as const;

function parseKinds(raw: unknown): AppAssetKind[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const kinds: AppAssetKind[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !isAppAssetKind(item)) return null;
    if (!kinds.includes(item)) kinds.push(item);
  }
  return kinds.length > 0 ? kinds : null;
}

function imageModelFromEnv(): string {
  return process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "app-asset-samples",
    limit: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<AppAssetSamplesRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const kinds = parseKinds(body.kinds);
  if (!kinds) {
    return NextResponse.json(
      { error: "Select at least one valid asset type" },
      { status: 400 }
    );
  }

  const client = await authedConvexClient();
  if (!client) {
    return NextResponse.json({ error: "Sign in to generate app assets" }, { status: 401 });
  }

  const mascot = await client.query(api.mascots.getMine, {
    mascotId: body.mascotId as Id<"mascots">,
  });
  if (!mascot) {
    return NextResponse.json({ error: "Mascot not found" }, { status: 404 });
  }

  const resolved = resolveMascotModel(body.model ?? (mascot.model as never));
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const styleDescription = boundedText(body.styleDescription, 800) || undefined;
  const idle =
    mascot.pack.gestures.find((g) => g.key === "idle") ?? mascot.pack.gestures[0];
  if (!idle?.svg) {
    return NextResponse.json({ error: "Mascot has no idle pose to reference" }, { status: 400 });
  }

  const metered = await openMeter({ kind: "appAssetSamples", images: 3 }, model);
  if (!metered.ok) return metered.response;
  const { meter } = metered;

  const started = Date.now();

  try {
    const referencePng = await svgToSquarePng(sanitizeSvg(idle.svg), 1024);
    const stored: Array<{ id: string; label: string; storageId: Id<"_storage"> }> = [];

    for (let i = 0; i < 3; i++) {
      const prompt = buildIconPrompt({
        mascotName: mascot.name,
        tagline: mascot.tagline,
        styleDescription,
        kinds,
        variantIndex: i,
      });
      const image = await generateAppIconImage({ prompt, referencePng });
      meter.recordFallback({ kind: "appAssetSamples", images: 1 });

      const storageId = await uploadConvexBlob(client, image.buffer, "image/png");
      stored.push({
        id: ["a", "b", "c"][i]!,
        label: SAMPLE_LABELS[i]!,
        storageId,
      });
    }

    const packId = await client.mutation(api.mascotAppAssets.saveSamples, {
      mascotId: body.mascotId as Id<"mascots">,
      kinds,
      styleDescription,
      imageModel: imageModelFromEnv(),
      samples: stored,
      packId: body.packId as Id<"mascotAppAssetPacks"> | undefined,
    });

    const detail = await client.query(api.mascotAppAssets.getPack, { packId });
    const tokens = await meter.settle();

    return NextResponse.json({
      packId,
      samples: detail?.sampleOptions ?? [],
      _meta: {
        model: imageModelFromEnv(),
        elapsedMs: Date.now() - started,
        tokens: tokens.tokens,
        balance: tokens.balance,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "App icon sample generation failed";
    console.error("app-asset samples error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await meter.settle();
  }
}
