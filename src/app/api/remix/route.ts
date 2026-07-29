import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { authedConvexClient } from "@/lib/convex-server";
import { resolveMascotModel, runMascotModel } from "@/lib/mascot-model";
import { toGeneratedMascot } from "@/lib/mascot-pack";
import { openMeter, tokenMetaFields } from "@/lib/metering";
import { MAX_CREATE_GESTURES } from "@/lib/token-pricing";
import { parseJsonObject } from "@/lib/parse-json";
import {
  buildRemixGestures,
  measureRemixPayload,
} from "@/lib/remix/build-gestures";
import {
  coerceRemixIdentity,
  coerceRemixPose,
  toGeneratedMascot as toRemixedMascot,
} from "@/lib/remix/coerce";
import { preparePackRemixIndex } from "@/lib/remix/from-pack";
import { resolveRemixBrief } from "@/lib/remix/brief";
import { buildIdentityPrompt, buildPosePrompt } from "@/lib/remix/prompts";
import { sanitizePalette } from "@/lib/remix/palette";
import { normalizeGeneratedMascot } from "@/lib/studio-utils";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import type { GeneratedMascot, RemixRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_BODY_BYTES = 250_000;

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

  if (body.slug && !body.mascotId && !body.listingId) {
    return NextResponse.json(
      {
        error:
          "Example remix is no longer available. Remix a mascot from your library or the marketplace.",
      },
      { status: 410 }
    );
  }

  if (!body.mascotId && !(body.listingId && body.remixOrderId)) {
    return NextResponse.json(
      { error: "mascotId or listingId + remixOrderId is required" },
      { status: 400 }
    );
  }

  // Validate request fields before consuming a paid unlock.
  const resolved = resolveMascotModel(body.model, {
    requiresVision: isReferenceId(body.referenceId),
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const name = boundedText(body.name, 80);
  const descriptionInput = boundedText(body.description, 1200);
  const lookInput = boundedText(body.look, 1200);
  const gestures = body.gestures ?? [];

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (
    gestures.length < 1 ||
    gestures.length > MAX_CREATE_GESTURES
  ) {
    return NextResponse.json(
      {
        error: `Select between 1 and ${MAX_CREATE_GESTURES} poses`,
      },
      { status: 400 }
    );
  }

  const convex = await authedConvexClient();
  if (!convex) {
    return NextResponse.json({ error: "Sign in to remix" }, { status: 401 });
  }

  let sourceName: string;
  let sourceId: string;
  let sourceKind: "mascot" | "listing";
  let pack: GeneratedMascot;
  let claimedListing = false;

  const serverSecret = process.env.GENERATION_SERVER_SECRET;

  const restoreUnlockIfNeeded = async () => {
    if (!claimedListing || !body.listingId || !body.remixOrderId) {
      return;
    }
    try {
      await convex.mutation(api.marketplace.restoreRemixUnlock, {
        orderId: body.remixOrderId as Id<"marketplaceOrders">,
        listingId: body.listingId as Id<"marketplaceListings">,
        serverSecret,
      });
    } catch (err) {
      console.error("restore remix unlock failed:", err);
    }
  };

  try {
    if (body.mascotId) {
      const owned = await convex.query(api.marketplace.getOwnedRemixPack, {
        mascotId: body.mascotId as Id<"mascots">,
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Mascot not found or not owned" },
          { status: 403 }
        );
      }
      sourceName = owned.name;
      sourceId = owned.sourceId;
      sourceKind = "mascot";
      pack = toGeneratedMascot(owned.pack);
    } else {
      // Claim unlock before generation — fail closed, single use.
      const claimed = await convex.mutation(api.marketplace.claimRemixUnlock, {
        orderId: body.remixOrderId as Id<"marketplaceOrders">,
        listingId: body.listingId as Id<"marketplaceListings">,
        serverSecret,
      });
      claimedListing = true;
      sourceName = claimed.name;
      sourceId = claimed.sourceId;
      sourceKind = "listing";
      pack = toGeneratedMascot(claimed.pack);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Remix source unavailable";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const selectedKeys = gestures.map((g) => g.key);
  const unknown = selectedKeys.filter(
    (k) => !pack.gestures.some((p) => p.key === k)
  );
  if (unknown.length) {
    await restoreUnlockIfNeeded();
    return NextResponse.json(
      { error: `Unknown poses: ${unknown.join(", ")}` },
      { status: 400 }
    );
  }

  const {
    indexed,
    sharedManifest,
    variantManifests,
    paletteEntries,
    source: remixSource,
  } = preparePackRemixIndex(pack, selectedKeys);

  const productContext = boundedText(body.productContext, 400) || undefined;
  const personality = boundedText(body.personality, 400) || undefined;
  const brief = resolveRemixBrief({
    sourceName,
    tagline: pack.tagline,
    product: productContext ?? pack.product,
    description: descriptionInput || undefined,
    look: lookInput || undefined,
  });
  const { description, look } = brief;

  const briefChars =
    name.length +
    description.length +
    look.length +
    (productContext?.length ?? 0) +
    (personality?.length ?? 0);

  const payloadChars = measureRemixPayload({
    sharedManifest,
    variantManifests,
    briefChars,
  });

  let referenceImage = null;
  if (isReferenceId(body.referenceId)) {
    referenceImage = await loadReferenceImage(body.referenceId);
    if (!referenceImage) {
      await restoreUnlockIfNeeded();
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
  if (!metered.ok) {
    await restoreUnlockIfNeeded();
    return metered.response;
  }
  const { meter } = metered;

  const started = Date.now();
  const warnings: string[] = [];
  let succeeded = false;

  try {
    const identityRun = await runMascotModel({
      model,
      instructions: buildIdentityPrompt({
        slug: sourceKind,
        exampleName: sourceName,
        name,
        description,
        look,
        descriptionFromSource: brief.descriptionFromSource,
        lookFromSource: brief.lookFromSource,
        productContext,
        personality,
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
    const identityParsed = coerceRemixIdentity(
      parseJsonObject(identityRun.text),
      name
    );
    if (!identityParsed) {
      meter.forgive();
      return NextResponse.json(
        { error: "Failed to parse remix identity", model: identityRun.model },
        { status: 502 }
      );
    }
    meter.record(identityRun.usage, identityRun.model);

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
              lookFromSource: brief.lookFromSource,
            }),
            input: "Return the pose JSON now.",
            maxOutputTokens: 6_000,
            reasoningEffort: "low",
          });
          const parsed = coerceRemixPose(parseJsonObject(run.text), req.key);
          if (!parsed) throw new Error("bad pose JSON");
          meter.record(run.usage, run.model);
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
      slug: "owned",
      indexed,
      gestureRequests: gestures,
      sharedEdits: identityParsed.edits,
      palette,
      poseResults,
      originalPoses: remixSource.poses.map((p) => ({
        key: p.key,
        track: p.track,
        signal: p.signal,
      })),
    });

    warnings.push(...built.warnings);

    if (built.gestures.length === 0) {
      meter.forgive();
      return NextResponse.json(
        {
          error: "Remix produced no usable poses",
          warnings,
          model: identityRun.model,
        },
        { status: 502 }
      );
    }

    const successfulKeys = new Set(built.gestures.map((g) => g.key));
    const successfulRequests = gestures.filter((g) => successfulKeys.has(g.key));

    const raw = toRemixedMascot({
      identity: identityParsed,
      gestures: built.gestures,
    });
    if (!raw) {
      meter.forgive();
      return NextResponse.json(
        { error: "Failed to assemble mascot pack" },
        { status: 502 }
      );
    }

    const mascot = normalizeGeneratedMascot(raw, successfulRequests);
    const tokens = await meter.settle();
    succeeded = true;

    return NextResponse.json({
      mascot,
      _meta: {
        model: identityRun.model,
        elapsedMs: Date.now() - started,
        warnings,
        skippedGestures: built.skippedGestures,
        source: sourceId,
        sourceKind,
        ...tokenMetaFields(tokens),
      },
    });
  } catch (err) {
    meter.forgive();
    const message = err instanceof Error ? err.message : "Remix failed";
    console.error("remix failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    if (!succeeded) {
      await restoreUnlockIfNeeded();
    }
    await meter.settle();
  }
}
