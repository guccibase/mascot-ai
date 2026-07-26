import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { resolveMascotModel, runMascotModel } from "@/lib/mascot-model";
import { openMeter } from "@/lib/metering";
import { parseJsonObject } from "@/lib/parse-json";
import {
  buildRemixGestures,
  loadRemixSource,
  measureRemixPayload,
  prepareRemixIndex,
} from "@/lib/remix/build-gestures";
import {
  coerceRemixIdentity,
  coerceRemixPose,
  toGeneratedMascot,
} from "@/lib/remix/coerce";
import { buildIdentityPrompt, buildPosePrompt } from "@/lib/remix/prompts";
import { sanitizePalette } from "@/lib/remix/palette";
import { normalizeGeneratedMascot } from "@/lib/studio-utils";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import type { RemixRequest } from "@/lib/types";
import { getMascot, type MascotSlug } from "@/lib/mascots";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_BODY_BYTES = 250_000;
const SLUGS = new Set<MascotSlug>(["lyra", "sol", "bud", "fanous"]);

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "remix",
    limit: 4,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<RemixRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (!SLUGS.has(body.slug)) {
    return NextResponse.json({ error: "Unknown example mascot" }, { status: 400 });
  }

  const resolved = resolveMascotModel(body.model, {
    requiresVision: isReferenceId(body.referenceId),
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const name = boundedText(body.name, 80);
  const description = boundedText(body.description, 1200);
  const look = boundedText(body.look, 1200);
  const gestures = body.gestures ?? [];

  if (!name || !description || !look) {
    return NextResponse.json(
      { error: "Name, description, and look are required" },
      { status: 400 }
    );
  }
  if (gestures.length < 1 || gestures.length > 6) {
    return NextResponse.json(
      { error: "Select between 1 and 6 poses" },
      { status: 400 }
    );
  }

  const source = await loadRemixSource(body.slug);
  if (!source) {
    return NextResponse.json({ error: "Example not found" }, { status: 404 });
  }

  const selectedKeys = gestures.map((g) => g.key);
  const unknown = selectedKeys.filter(
    (k) => !source.pack.poses.some((p) => p.key === k)
  );
  if (unknown.length) {
    return NextResponse.json(
      { error: `Unknown poses for ${body.slug}: ${unknown.join(", ")}` },
      { status: 400 }
    );
  }

  const { indexed, sharedManifest, variantManifests, paletteEntries } =
    prepareRemixIndex(source.pack, selectedKeys);

  const briefChars =
    name.length +
    description.length +
    look.length +
    (body.productContext?.length ?? 0) +
    (body.personality?.length ?? 0);

  const payloadChars = measureRemixPayload({
    sharedManifest,
    variantManifests,
    briefChars,
  });

  let referenceImage = null;
  if (isReferenceId(body.referenceId)) {
    referenceImage = await loadReferenceImage(body.referenceId);
    if (!referenceImage) {
      return NextResponse.json(
        { error: "Reference image not found or expired. Upload again." },
        { status: 410 }
      );
    }
  }

  const metered = await openMeter(
    {
      kind: "remix",
      poses: gestures.length,
      payloadChars,
      referenceImages: referenceImage ? 1 : 0,
    },
    model
  );
  if (!metered.ok) return metered.response;
  const { meter } = metered;

  const started = Date.now();
  const warnings: string[] = [];

  try {
    const meta = getMascot(body.slug)!;
    const identityRun = await runMascotModel({
      model,
      instructions: buildIdentityPrompt({
        slug: body.slug,
        exampleName: meta.name,
        name,
        description,
        look,
        productContext: boundedText(body.productContext, 400) || undefined,
        personality: boundedText(body.personality, 400) || undefined,
        sharedManifest,
        palette: paletteEntries.slice(0, 24),
        hasReference: Boolean(referenceImage),
      }),
      input: referenceImage
        ? "The attached image is the user's design reference. Return the identity JSON now."
        : "Return the identity JSON now.",
      images: referenceImage ? [referenceImage] : undefined,
      maxOutputTokens: 10_000,
      reasoningEffort: "low",
    });
    meter.record(identityRun.usage, identityRun.model);

    const identityParsed = coerceRemixIdentity(
      parseJsonObject(identityRun.text),
      name
    );
    if (!identityParsed) {
      return NextResponse.json(
        { error: "Failed to parse remix identity", model: identityRun.model },
        { status: 502 }
      );
    }

    const allowedOld = new Set(paletteEntries.map((p) => p.hex));
    const palette = sanitizePalette(identityParsed.palette, allowedOld);

    const poseResults = new Map<
      string,
      {
        edits: import("@/lib/remix/types").RemixEdit[];
        track?: boolean;
        delight?: boolean;
        signal?: number;
      }
    >();

    const poseRuns = await Promise.all(
      gestures.map(async (req) => {
        try {
          const run = await runMascotModel({
            model,
            instructions: buildPosePrompt({
              poseKey: req.key,
              poseLabel: req.label,
              variantManifest: variantManifests[req.key] ?? [],
              sharedEdits: identityParsed.edits,
              look,
            }),
            input: "Return the pose JSON now.",
            maxOutputTokens: 6_000,
            reasoningEffort: "low",
          });
          meter.record(run.usage, run.model);
          const parsed = coerceRemixPose(parseJsonObject(run.text), req.key);
          if (!parsed) throw new Error("bad pose JSON");
          return parsed;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "pose failed";
          warnings.push(`${req.key}: ${msg}`);
          return null;
        }
      })
    );

    for (const result of poseRuns) {
      if (result) poseResults.set(result.key, result);
    }

    const built = buildRemixGestures({
      slug: body.slug,
      indexed,
      gestureRequests: gestures,
      sharedEdits: identityParsed.edits,
      palette,
      poseResults,
      originalPoses: source.pack.poses.map((p) => ({
        key: p.key,
        track: p.track,
        signal: p.signal,
      })),
    });

    warnings.push(...built.warnings);

    if (built.gestures.length === 0) {
      return NextResponse.json(
        {
          error: "Remix produced no usable poses",
          warnings,
          model: identityRun.model,
        },
        { status: 502 }
      );
    }

    const raw = toGeneratedMascot({
      identity: identityParsed,
      gestures: built.gestures,
    });
    if (!raw) {
      return NextResponse.json(
        { error: "Failed to assemble mascot pack" },
        { status: 502 }
      );
    }

    const mascot = normalizeGeneratedMascot(raw, gestures);
    const tokens = await meter.settle();

    return NextResponse.json({
      mascot,
      _meta: {
        model: identityRun.model,
        elapsedMs: Date.now() - started,
        warnings,
        skippedGestures: built.skippedGestures,
        source: body.slug,
        tokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Remix failed";
    console.error("remix failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await meter.settle();
  }
}
