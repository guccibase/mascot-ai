import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { resolveMascotModel, runMascotModel } from "@/lib/mascot-model";
import { openMeter, tokenMetaFields } from "@/lib/metering";
import { parseJsonObject } from "@/lib/parse-json";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import type { MascotSample, SamplesRequest } from "@/lib/types";
import {
  referenceImageBlock,
  samplesReferenceBlock,
} from "@/lib/vision-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BODY_BYTES = 32_000;

function isSamples(value: unknown): value is { samples: MascotSample[] } {
  if (!value || typeof value !== "object") return false;
  const samples = (value as { samples?: unknown }).samples;
  return (
    Array.isArray(samples) &&
    samples.length >= 1 &&
    samples.every(
      (s) =>
        s &&
        typeof s === "object" &&
        typeof (s as MascotSample).svg === "string" &&
        (s as MascotSample).svg.includes("<svg")
    )
  );
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "samples",
    limit: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<SamplesRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const wantsReference = isReferenceId(body.referenceId);
  const resolved = resolveMascotModel(body.model, {
    requiresVision: wantsReference,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const name = boundedText(body.name, 80);
  const description = boundedText(body.description, 1200);
  const look = boundedText(body.look, 1200);

  if (!name || !description || !look) {
    return NextResponse.json(
      { error: "Name, description, and look are required" },
      { status: 400 }
    );
  }

  const product = boundedText(body.productContext, 400) || undefined;
  const personality = boundedText(body.personality, 400) || undefined;

  let referenceImage = null;
  if (wantsReference) {
    referenceImage = await loadReferenceImage(body.referenceId!);
    if (!referenceImage) {
      return NextResponse.json(
        { error: "Reference image not found or expired. Upload again." },
        { status: 410 }
      );
    }
  }

  const started = Date.now();

  const payloadChars =
    name.length +
    description.length +
    look.length +
    (product?.length ?? 0) +
    (personality?.length ?? 0);

  const metered = await openMeter(
    {
      kind: "samples",
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
        `You are a production character designer for app mascots (Fanous/Lyra quality bar).`,
        referenceImage ? referenceImageBlock() : null,
        referenceImage ? samplesReferenceBlock() : null,
        `Return JSON only:`,
        `{"samples":[{"id":"a"|"b"|"c","title":string,"rationale":string,"svg":string}]}`,
        `Exactly 3 samples. Each svg is STATIC concept art:`,
        `- viewBox="0 0 420 520", xmlns set, transparent background`,
        `- NO <animate>, <animateTransform>, <animateMotion>, NO CSS @keyframes / animation`,
        `- Clear silhouette, face, and one memorable motif`,
        referenceImage
          ? `- Faithful variations of the reference design (same character, subtle direction shifts)`
          : `- Distinct visual directions across the 3 samples (pose/shape/palette/motif), same character brief`,
        `- Flat vector, soft gradients OK, production illustration, not emoji stickers`,
      ]
        .filter(Boolean)
        .join("\n"),
      input: [
        `Design 3 static look samples for the user to choose from.`,
        referenceImage
          ? `The attached image is the user's design reference — match it closely.`
          : null,
        `Name: ${name}`,
        `Who they are: ${description}`,
        `How they should look: ${look}`,
        product ? `Product: ${product}` : null,
        personality ? `Personality: ${personality}` : null,
        `Return JSON with samples a, b, c.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      images: referenceImage ? [referenceImage] : undefined,
      maxOutputTokens: 20000,
      reasoningEffort: "low",
    });
    const parsed = parseJsonObject(run.text);
    if (!isSamples(parsed)) {
      return NextResponse.json(
        { error: "Model returned incomplete samples", model: run.model },
        { status: 502 }
      );
    }

    const samples = parsed.samples
      .slice(0, 3)
      .map((s, i) => ({
        id: s.id || ["a", "b", "c"][i]!,
        title: s.title || `Look ${["A", "B", "C"][i]}`,
        rationale: s.rationale || "",
        svg: sanitizeSvg(s.svg),
      }))
      .filter((s) => s.svg.length > 0);

    if (samples.length === 0) {
      return NextResponse.json(
        { error: "Model returned no usable sample SVGs", model: run.model },
        { status: 502 }
      );
    }

    // Bill only after usable samples exist.
    meter.record(run.usage, run.model);
    const tokens = await meter.settle();

    return NextResponse.json({
      samples,
      _meta: {
        model: run.model,
        elapsedMs: Date.now() - started,
        ...tokenMetaFields(tokens),
      },
    });
  } catch (err) {
    meter.forgive();
    const message = err instanceof Error ? err.message : "Sample generation failed";
    console.error("samples error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Releases the unused hold on every exit path, including early returns.
    await meter.settle();
  }
}
