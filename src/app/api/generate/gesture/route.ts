import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { resolveMascotModel, runMascotModel } from "@/lib/mascot-model";
import { extractPartsFromMascot } from "@/lib/mascot-parts";
import { openMeter, tokenMetaFields } from "@/lib/metering";
import { parseJsonObject } from "@/lib/parse-json";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import { styleReferenceBlock } from "@/lib/style-references";
import {
  defaultDelightForGesture,
  defaultTrackForGesture,
  normalizeSingleGesture,
} from "@/lib/studio-utils";
import { MAX_STUDIO_GESTURES } from "@/lib/refine-pack";
import { SVG_GESTURE_INSTRUCTIONS } from "@/lib/svg-gesture-prompt";
import { gestureReferenceBlock, referenceImageBlock } from "@/lib/vision-prompt";
import type {
  AddGestureRequest,
  GeneratedGesture,
  GeneratedMascot,
  GestureRequest,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BODY_BYTES = 1_200_000;

function isMascot(value: unknown): value is GeneratedMascot {
  if (!value || typeof value !== "object") return false;
  const v = value as GeneratedMascot;
  return (
    typeof v.name === "string" &&
    Array.isArray(v.gestures) &&
    v.gestures.length > 0 &&
    v.gestures.every(
      (g) => typeof g?.svg === "string" && g.svg.includes("<svg")
    ) &&
    !!v.themes &&
    typeof v.themes === "object"
  );
}

function isGestureReq(value: unknown): value is GestureRequest {
  if (!value || typeof value !== "object") return false;
  const g = value as GestureRequest;
  return (
    typeof g.key === "string" &&
    g.key.length > 0 &&
    g.key.length <= 40 &&
    typeof g.label === "string" &&
    typeof g.cat === "string" &&
    typeof g.tip === "string" &&
    typeof g.use === "string"
  );
}

function coerceRawGesture(
  parsed: unknown,
  req: GestureRequest
): Partial<GeneratedGesture> & { svg: string } {
  const svg =
    parsed && typeof parsed === "object"
      ? (parsed as { svg?: unknown }).svg
      : undefined;
  if (typeof svg !== "string" || !svg.includes("<svg")) {
    throw new Error("model returned no usable svg");
  }
  const p = parsed as Partial<GeneratedGesture>;
  return {
    key: req.key,
    label: req.label,
    cat: req.cat,
    tip: req.tip,
    use: req.use,
    track: typeof p.track === "boolean" ? p.track : undefined,
    delight: typeof p.delight === "boolean" ? p.delight : undefined,
    signal: typeof p.signal === "number" ? p.signal : undefined,
    svg,
  };
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "add-gesture",
    limit: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<AddGestureRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const resolved = resolveMascotModel(body.model, {
    requiresVision: isReferenceId(body.referenceId),
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  if (!isMascot(body.mascot)) {
    return NextResponse.json(
      { error: "Valid mascot pack required" },
      { status: 400 }
    );
  }
  if (!isGestureReq(body.gesture)) {
    return NextResponse.json(
      { error: "Gesture key, label, category, tip, and use are required" },
      { status: 400 }
    );
  }

  const gestureReq: GestureRequest = {
    key: body.gesture.key
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40),
    label: boundedText(body.gesture.label, 40),
    cat: boundedText(body.gesture.cat, 40) || "Custom",
    tip: boundedText(body.gesture.tip, 240) || `${body.gesture.label} pose.`,
    use: boundedText(body.gesture.use, 80) || "Custom moment",
  };

  if (!gestureReq.key || !gestureReq.label) {
    return NextResponse.json(
      { error: "Gesture needs a valid key and label" },
      { status: 400 }
    );
  }
  if (body.mascot.gestures.some((g) => g.key === gestureReq.key)) {
    return NextResponse.json(
      { error: `Gesture "${gestureReq.key}" already exists on this mascot` },
      { status: 409 }
    );
  }
  if (body.mascot.gestures.length >= MAX_STUDIO_GESTURES) {
    return NextResponse.json(
      {
        error: `Studio is limited to ${MAX_STUDIO_GESTURES} gestures for safe generation`,
      },
      { status: 400 }
    );
  }

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

  const look = boundedText(body.look, 1200);
  const primary =
    body.mascot.themes.primary ?? Object.values(body.mascot.themes)[0]!;
  const idle =
    body.mascot.gestures.find((g) => g.key === "idle") ??
    body.mascot.gestures[0]!;
  const started = Date.now();

  // Serialised once: it is both what we price and what we send.
  const bibleSnapshot = JSON.stringify({
    name: body.mascot.name,
    tagline: body.mascot.tagline,
    product: body.mascot.product,
    accent: body.mascot.accent,
    instrument: body.mascot.instrument,
    theme: primary,
    parts: body.mascot.parts,
  });
  const payloadChars = bibleSnapshot.length + idle.svg.length + look.length;

  const metered = await openMeter(
    {
      kind: "gesture",
      payloadChars,
      referenceImages: referenceImage ? 1 : 0,
    },
    model
  );
  if (!metered.ok) return metered.response;
  const { meter } = metered;

  try {
    const run = await runMascotModel({
      model,
      instructions: [
        SVG_GESTURE_INSTRUCTIONS,
        "",
        styleReferenceBlock(),
        referenceImage ? referenceImageBlock() : null,
        referenceImage ? gestureReferenceBlock() : null,
      ]
        .filter(Boolean)
        .join("\n"),
      input: [
        `Add a NEW gesture "${gestureReq.key}" for ${body.mascot.name}.`,
        `Match the existing character exactly: same silhouette, face, motif, and craft.`,
        referenceImage
          ? `The attached image is the user's design reference — match it for character identity.`
          : null,
        `Bible snapshot: ${bibleSnapshot}`,
        look ? `Look brief: ${look}` : null,
        `Anchor SVG (same character; only change pose/face/prop/energy for the new gesture):`,
        idle.svg,
        `Gesture metadata: ${JSON.stringify(gestureReq)}`,
        `track=${defaultTrackForGesture(gestureReq.key)}`,
        `delight=${defaultDelightForGesture(gestureReq.key)}`,
        `Return JSON for this one gesture only.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      images: referenceImage ? [referenceImage] : undefined,
      maxOutputTokens: 14000,
      reasoningEffort: "low",
    });

    const coerced = coerceRawGesture(parseJsonObject(run.text), gestureReq);
    const gesture = normalizeSingleGesture(body.mascot, gestureReq, coerced);

    if (run.usage) {
      meter.record(run.usage, run.model);
    } else {
      meter.recordFallback({
        kind: "gesture",
        payloadChars,
        referenceImages: referenceImage ? 1 : 0,
      });
    }

    const nextMascot: GeneratedMascot = {
      ...body.mascot,
      gestures: [...body.mascot.gestures, gesture],
    };
    nextMascot.parts = extractPartsFromMascot(nextMascot);

    const tokens = await meter.settle();

    return NextResponse.json({
      gesture,
      mascot: nextMascot,
      _meta: {
        model: run.model,
        elapsedMs: Date.now() - started,
        ...tokenMetaFields(tokens),
      },
    });
  } catch (err) {
    meter.forgive();
    const message = err instanceof Error ? err.message : "Gesture generation failed";
    console.error("add-gesture error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await meter.settle();
  }
}
